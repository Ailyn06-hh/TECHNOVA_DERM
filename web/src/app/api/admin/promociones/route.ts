import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getAdminSessionFromRequest, registrarAuditoriaAdmin } from "@/lib/admin-session";
import { tienePermiso } from "@/lib/permisos";

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminSessionFromRequest(req);
    if (!admin || !tienePermiso(admin, "promociones", "ver")) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    const pool = getDbPool();

    // 1. Reglas automáticas del motor
    const [reglasRows]: any = await pool.query(
      "SELECT clave, nombre, descripcion, tope_texto, activa FROM reglas_promocion ORDER BY clave ASC"
    );

    // 2. Descuentos por aprobar (pendientes)
    const [pendientesRows]: any = await pool.query(
      `SELECT
        dp.id,
        dp.producto_id,
        dp.lote_id,
        dp.nombre_lote,
        dp.piezas,
        dp.dias_restantes,
        dp.descuento_porcentaje,
        dp.estado,
        pr.precio
       FROM descuentos_pendientes dp
       JOIN productos pr ON dp.producto_id = pr.id
       WHERE dp.estado = 'pendiente'
       ORDER BY dp.creado_en DESC`
    );

    // 3. Combos activos
    const [combosRows]: any = await pool.query(
      `SELECT id, nombre, slug, descripcion_corta, descuento_porcentaje, activo, inicia_en, termina_en, canales
       FROM combos
       ORDER BY id DESC`
    );

    // Cargar productos de cada combo
    const combos = await Promise.all(
      combosRows.map(async (combo: any) => {
        const [cpRows]: any = await pool.query(
          `SELECT cp.producto_id, pr.nombre, pr.precio
           FROM combo_productos cp
           JOIN productos pr ON cp.producto_id = pr.id
           WHERE cp.combo_id = ?`,
          [combo.id]
        );
        return {
          ...combo,
          productos: cpRows,
        };
      })
    );

    // 4. Productos para el creador de combos
    const [productosRows]: any = await pool.query(
      "SELECT id, nombre, sku, precio, precio_especial FROM productos WHERE activo = 1 ORDER BY nombre ASC"
    );

    return NextResponse.json({
      ok: true,
      reglas: reglasRows,
      descuentosPendientes: pendientesRows,
      combos,
      productosCatalog: productosRows,
    });
  } catch (error) {
    console.error("[Admin Promociones API Error]:", error);
    return NextResponse.json({ ok: false, error: "Error al obtener promociones" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminSessionFromRequest(req);
    if (!admin) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { accion, clave, activa, descuentoId, nombre, productos, descuentoPorcentaje, precioFinal, fechaInicio, fechaFin, canales } = body;

    const pool = getDbPool();
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";

    // Action 1: Toggle regla automática
    if (accion === "toggle_regla") {
      if (!tienePermiso(admin, "promociones", "editar")) {
        return NextResponse.json({ ok: false, error: "Sin permiso para editar reglas" }, { status: 403 });
      }

      await pool.query("UPDATE reglas_promocion SET activa = ? WHERE clave = ?", [activa ? 1 : 0, clave]);

      await registrarAuditoriaAdmin({
        adminId: admin.id,
        accion: "toggle_regla_promocion",
        entidad: "reglas_promocion",
        entidadId: clave,
        detalle: { activa },
        ip,
      });

      return NextResponse.json({ ok: true, mensaje: "Estado de regla actualizado" });
    }

    // Action 2: Aprobar descuento por caducidad/lote
    if (accion === "aprobar_descuento") {
      if (!tienePermiso(admin, "promociones", "aprobar_descuento")) {
        return NextResponse.json({ ok: false, error: "Sin permiso para aprobar descuentos" }, { status: 403 });
      }

      const [descRows]: any = await pool.query("SELECT * FROM descuentos_pendientes WHERE id = ?", [descuentoId]);
      if (!descRows || descRows.length === 0) {
        return NextResponse.json({ ok: false, error: "Descuento no encontrado" }, { status: 404 });
      }

      const desc = descRows[0];

      // Actualizar producto con precio_especial
      const [prodRows]: any = await pool.query("SELECT precio FROM productos WHERE id = ?", [desc.producto_id]);
      if (prodRows.length > 0) {
        const precioNormal = Number(prodRows[0].precio);
        const nuevoPrecio = Math.round(precioNormal * (1 - desc.descuento_porcentaje / 100));

        await pool.query("UPDATE productos SET precio_especial = ? WHERE id = ?", [nuevoPrecio, desc.producto_id]);
      }

      // Marcar como aprobado
      await pool.query("UPDATE descuentos_pendientes SET estado = 'aprobado' WHERE id = ?", [descuentoId]);

      await registrarAuditoriaAdmin({
        adminId: admin.id,
        accion: "aprobar_descuento_pendiente",
        entidad: "descuentos_pendientes",
        entidadId: descuentoId,
        detalle: { productoId: desc.producto_id, descuentoPct: desc.descuento_porcentaje },
        ip,
      });

      return NextResponse.json({ ok: true, mensaje: "Descuento aprobado y aplicado instantáneamente en todos los canales." });
    }

    // Action 3: Rechazar descuento por caducidad
    if (accion === "rechazar_descuento") {
      await pool.query("UPDATE descuentos_pendientes SET estado = 'rechazado' WHERE id = ?", [descuentoId]);
      await registrarAuditoriaAdmin({
        adminId: admin.id,
        accion: "rechazar_descuento_pendiente",
        entidad: "descuentos_pendientes",
        entidadId: descuentoId,
        ip,
      });

      return NextResponse.json({ ok: true, mensaje: "Descuento rechazado" });
    }

    // Action 4: Crear nuevo combo
    if (accion === "crear_combo") {
      if (!tienePermiso(admin, "promociones", "crear")) {
        return NextResponse.json({ ok: false, error: "Sin permiso para crear combos" }, { status: 403 });
      }

      if (!nombre || !productos || productos.length === 0) {
        return NextResponse.json({ ok: false, error: "Nombre y al menos un producto son requeridos" }, { status: 400 });
      }

      const slug = nombre
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const [resCombo]: any = await pool.query(
        `INSERT INTO combos (nombre, slug, descripcion_corta, descuento_porcentaje, activo, inicia_en, termina_en, canales)
         VALUES (?, ?, ?, ?, 1, ?, ?, ?)`,
        [
          nombre.trim(),
          slug,
          `Combo especial ${nombre.trim()}`,
          descuentoPorcentaje || 10,
          fechaInicio || new Date().toISOString().split("T")[0],
          fechaFin || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          canales ? JSON.stringify(canales) : JSON.stringify(["tienda_web", "app", "pos_tienda", "whatsapp"]),
        ]
      );

      const comboId = resCombo.insertId;

      for (const prodId of productos) {
        await pool.query("INSERT INTO combo_productos (combo_id, producto_id, cantidad) VALUES (?, ?, 1)", [
          comboId,
          prodId,
        ]);
      }

      await registrarAuditoriaAdmin({
        adminId: admin.id,
        accion: "crear_combo",
        entidad: "combos",
        entidadId: comboId,
        detalle: { nombre, productos, descuentoPorcentaje },
        ip,
      });

      return NextResponse.json({ ok: true, comboId, mensaje: "Combo publicado exitosamente en los canales seleccionados." });
    }

    return NextResponse.json({ ok: false, error: "Acción no reconocida" }, { status: 400 });
  } catch (error) {
    console.error("[Admin Promociones Operation Error]:", error);
    return NextResponse.json({ ok: false, error: "Error al procesar promoción" }, { status: 500 });
  }
}

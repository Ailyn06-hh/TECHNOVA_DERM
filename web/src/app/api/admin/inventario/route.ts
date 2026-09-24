import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getAdminSessionFromRequest, registrarAuditoriaAdmin } from "@/lib/admin-session";
import { tienePermiso, obtenerSucursalesPermitidas } from "@/lib/permisos";

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminSessionFromRequest(req);
    if (!admin || !tienePermiso(admin, "inventario", "ver")) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    const pool = getDbPool();
    const sucursalesPermitidas = obtenerSucursalesPermitidas(admin);

    let sucursalWhere = "";
    const paramsSucursal: any[] = [];
    if (sucursalesPermitidas !== null) {
      if (sucursalesPermitidas.length === 0) {
        sucursalWhere = "WHERE 1=0";
      } else {
        sucursalWhere = `WHERE i.sucursal_id IN (${sucursalesPermitidas.map(() => "?").join(",")})`;
        paramsSucursal.push(...sucursalesPermitidas);
      }
    }

    // 1. Existencias por producto y por sucursal
    const [invRows]: any = await pool.query(
      `SELECT
        i.producto_id,
        pr.nombre as producto_nombre,
        pr.sku,
        i.sucursal_id,
        s.nombre as sucursal_nombre,
        i.existencias,
        i.actualizado_en
       FROM inventario i
       JOIN productos pr ON i.producto_id = pr.id
       JOIN sucursales s ON i.sucursal_id = s.id
       ${sucursalWhere}
       ORDER BY pr.nombre ASC, s.nombre ASC`,
      paramsSucursal
    );

    // 2. Lotes activos (FEFO)
    const [lotesRows]: any = await pool.query(
      `SELECT
        il.id,
        il.producto_id,
        pr.nombre as producto_nombre,
        il.sucursal_id,
        s.nombre as sucursal_nombre,
        il.codigo_lote,
        il.caduca_en,
        il.existencias,
        il.recibido_en
       FROM inventario_lotes il
       JOIN productos pr ON il.producto_id = pr.id
       JOIN sucursales s ON il.sucursal_id = s.id
       WHERE il.existencias > 0
       ORDER BY il.caduca_en ASC`
    );

    // 3. Sucursales activas
    const [sucRows]: any = await pool.query("SELECT id, nombre, tipo FROM sucursales WHERE activa = 1");

    return NextResponse.json({
      ok: true,
      inventario: invRows,
      lotes: lotesRows,
      sucursales: sucRows,
    });
  } catch (error) {
    console.error("[Admin Inventario API Error]:", error);
    return NextResponse.json({ ok: false, error: "Error al cargar inventario" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminSessionFromRequest(req);
    if (!admin || !tienePermiso(admin, "inventario", "ajustar_inventario")) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const { accion, productoId, sucursalId, sucursalOrigenId, sucursalDestinoId, cantidad, codigoLote, caducaEn } = body;

    const pool = getDbPool();
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";

    if (accion === "entrada_proveedor") {
      if (!productoId || !sucursalId || !cantidad || cantidad <= 0) {
        return NextResponse.json({ ok: false, error: "Producto, sucursal y cantidad válida son requeridos" }, { status: 400 });
      }

      // 1. Actualizar o insertar en inventario por sucursal
      await pool.query(
        `INSERT INTO inventario (producto_id, sucursal_id, existencias, actualizado_en)
         VALUES (?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE existencias = existencias + VALUES(existencias), actualizado_en = NOW()`,
        [productoId, sucursalId, cantidad]
      );

      // 2. Crear lote en inventario_lotes
      const loteCode = codigoLote || `LOT-${Date.now()}`;
      const fechaCad = caducaEn || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      await pool.query(
        `INSERT INTO inventario_lotes (producto_id, sucursal_id, codigo_lote, caduca_en, existencias, recibido_en)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [productoId, sucursalId, loteCode, fechaCad, cantidad]
      );

      // 3. Registrar auditoría
      await registrarAuditoriaAdmin({
        adminId: admin.id,
        accion: "entrada_proveedor",
        entidad: "inventario",
        entidadId: productoId,
        detalle: { sucursalId, cantidad, loteCode, fechaCad },
        ip,
      });

      return NextResponse.json({ ok: true, mensaje: "Entrada de proveedor registrada correctamente" });
    }

    if (accion === "transferencia_tiendas") {
      if (!productoId || !sucursalOrigenId || !sucursalDestinoId || !cantidad || cantidad <= 0) {
        return NextResponse.json({ ok: false, error: "Datos de transferencia incompletos" }, { status: 400 });
      }

      if (sucursalOrigenId === sucursalDestinoId) {
        return NextResponse.json({ ok: false, error: "La sucursal de origen y destino no pueden ser la misma" }, { status: 400 });
      }

      // Verificar stock en origen
      const [origRows]: any = await pool.query(
        "SELECT existencias FROM inventario WHERE producto_id = ? AND sucursal_id = ?",
        [productoId, sucursalOrigenId]
      );

      const stockOrigen = origRows[0]?.existencias || 0;
      if (stockOrigen < cantidad) {
        return NextResponse.json({ ok: false, error: `Stock insuficiente en tienda origen (Disponible: ${stockOrigen} pzs)` }, { status: 400 });
      }

      // Restar de origen
      await pool.query(
        "UPDATE inventario SET existencias = existencias - ?, actualizado_en = NOW() WHERE producto_id = ? AND sucursal_id = ?",
        [cantidad, productoId, sucursalOrigenId]
      );

      // Sumar a destino
      await pool.query(
        `INSERT INTO inventario (producto_id, sucursal_id, existencias, actualizado_en)
         VALUES (?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE existencias = existencias + VALUES(existencias), actualizado_en = NOW()`,
        [productoId, sucursalDestinoId, cantidad]
      );

      await registrarAuditoriaAdmin({
        adminId: admin.id,
        accion: "transferencia_tiendas",
        entidad: "inventario",
        entidadId: productoId,
        detalle: { sucursalOrigenId, sucursalDestinoId, cantidad },
        ip,
      });

      return NextResponse.json({ ok: true, mensaje: "Transferencia entre tiendas completada con éxito" });
    }

    return NextResponse.json({ ok: false, error: "Acción no reconocida" }, { status: 400 });
  } catch (error) {
    console.error("[Admin Inventario Operation Error]:", error);
    return NextResponse.json({ ok: false, error: "Error en la operación de inventario" }, { status: 500 });
  }
}

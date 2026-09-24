import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getAdminSessionFromRequest, registrarAuditoriaAdmin } from "@/lib/admin-session";
import { tienePermiso } from "@/lib/permisos";

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminSessionFromRequest(req);
    if (!admin || !tienePermiso(admin, "reabastecimiento", "ver")) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    const pool = getDbPool();

    // 1. Sugerencias del pronóstico de demanda
    const [prodRows]: any = await pool.query(
      `SELECT
        pr.id,
        pr.nombre,
        pr.sku,
        pr.precio,
        COALESCE(SUM(i.existencias), 0) as stock_actual
       FROM productos pr
       LEFT JOIN inventario i ON pr.id = i.producto_id
       WHERE pr.activo = 1
       GROUP BY pr.id, pr.nombre, pr.sku, pr.precio
       ORDER BY stock_actual ASC
       LIMIT 8`
    );

    const sugerencias = (prodRows || []).map((p: any) => {
      const stock = Number(p.stock_actual);
      // Simular ritmo de venta diaria razonable según stock para mockup
      const ventaDiaria = stock <= 5 ? 0.5 + (p.id % 4) * 0.1 : 1.2;
      const diasRestantes = Math.round(stock / Math.max(ventaDiaria, 0.1));
      const sugeridoPiezas = stock <= 10 ? Math.max(Math.round(ventaDiaria * 30) - stock, 12) : 0;

      return {
        productoId: p.id,
        nombre: p.nombre,
        sku: p.sku || `SKU-${p.id}`,
        precio: Number(p.precio),
        stock,
        ventaDiaria: Math.round(ventaDiaria * 10) / 10,
        diasRestantes: `~${diasRestantes}`,
        sugerido: sugeridoPiezas > 0 ? `${sugeridoPiezas} pzs` : "—",
        sugeridoNum: sugeridoPiezas,
      };
    });

    // 2. Órdenes en curso
    const [ocRows]: any = await pool.query(
      `SELECT
        oc.id,
        oc.folio,
        oc.proveedor,
        oc.sucursal_destino_id,
        s.nombre as sucursal_nombre,
        oc.costo_total,
        oc.estado,
        oc.llegada_estimada,
        oc.fecha_deseada,
        oc.creado_en
       FROM ordenes_compra oc
       LEFT JOIN sucursales s ON oc.sucursal_destino_id = s.id
       ORDER BY oc.id DESC`
    );

    // 3. Proveedores
    const [provRows]: any = await pool.query(
      "SELECT id, nombre, especialidades, dias_entrega, correo FROM proveedores WHERE activo = 1 ORDER BY nombre ASC"
    );

    // 4. Sucursales de destino
    const [sucRows]: any = await pool.query(
      "SELECT id, nombre, tipo FROM sucursales WHERE activa = 1 ORDER BY id ASC"
    );

    // 5. Generar siguiente folio (ej. OC-119)
    const maxId = ocRows.length > 0 ? Math.max(...ocRows.map((o: any) => o.id)) : 0;
    const siguienteFolio = `OC-${117 + maxId + 1}`;

    return NextResponse.json({
      ok: true,
      sugerencias,
      ordenes: ocRows,
      proveedores: provRows,
      sucursales: sucRows,
      siguienteFolio,
    });
  } catch (error) {
    console.error("[Admin Reabastecimiento API Error]:", error);
    return NextResponse.json({ ok: false, error: "Error al cargar datos de reabastecimiento" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminSessionFromRequest(req);
    if (!admin || !tienePermiso(admin, "reabastecimiento", "crear_orden")) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const { accion, ordenId, folio, proveedor, sucursalDestinoId, costoTotal, estado, fechaDeseada, items } = body;

    const pool = getDbPool();
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";

    // Acción 1: Crear / Guardar Orden de Compra (Borrador o En camino)
    if (accion === "crear_orden") {
      if (!proveedor || !sucursalDestinoId) {
        return NextResponse.json({ ok: false, error: "Proveedor y sucursal de destino son obligatorios" }, { status: 400 });
      }

      const timestamp = Date.now().toString().slice(-4);
      const folioOc = folio && folio !== "OC-119" ? folio : `OC-${timestamp}`;
      const estadoMap: Record<string, string> = {
        "En camino": "en_transito",
        "Borrador": "borrador",
        "Recibida": "recibida",
        "en_transito": "en_transito",
        "borrador": "borrador",
        "recibida": "recibida",
      };
      const estadoDb = estadoMap[estado] || "borrador";

      const [result]: any = await pool.query(
        `INSERT INTO ordenes_compra (folio, proveedor, sucursal_destino_id, costo_total, estado, llegada_estimada, fecha_deseada, creado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE proveedor = VALUES(proveedor), costo_total = VALUES(costo_total), estado = VALUES(estado)`,
        [
          folioOc,
          proveedor,
          sucursalDestinoId,
          costoTotal || 0.0,
          estadoDb,
          fechaDeseada || null,
          fechaDeseada || null,
        ]
      );

      let newOrdenId = result.insertId;
      if (!newOrdenId || newOrdenId === 0) {
        const [existing]: any = await pool.query("SELECT id FROM ordenes_compra WHERE folio = ?", [folioOc]);
        if (existing.length > 0) newOrdenId = existing[0].id;
      }

      if (newOrdenId && items && Array.isArray(items)) {
        for (const item of items) {
          await pool.query(
            "INSERT INTO orden_compra_items (orden_id, producto_id, cantidad) VALUES (?, ?, ?)",
            [newOrdenId, item.productoId, item.cantidad]
          );
        }
      }

      await registrarAuditoriaAdmin({
        adminId: admin.id,
        accion: "crear_orden_compra",
        entidad: "ordenes_compra",
        entidadId: newOrdenId,
        detalle: { folio: folioOc, proveedor, costoTotal, estado: estadoDb },
        ip,
      });

      return NextResponse.json({
        ok: true,
        ordenId: newOrdenId,
        folio: folioOc,
        mensaje: estadoDb === "en_transito"
          ? `Orden ${folioOc} enviada al proveedor exitosamente.`
          : `Borrador de la orden ${folioOc} guardado.`,
      });
    }

    // Acción 2: Registrar Recepción de la Orden (Incrementa Inventario)
    if (accion === "recibir_orden") {
      if (!ordenId) {
        return NextResponse.json({ ok: false, error: "ID de orden es obligatorio" }, { status: 400 });
      }

      const [ocRows]: any = await pool.query("SELECT * FROM ordenes_compra WHERE id = ?", [ordenId]);
      if (!ocRows || ocRows.length === 0) {
        return NextResponse.json({ ok: false, error: "Orden de compra no encontrada" }, { status: 404 });
      }

      const orden = ocRows[0];
      const sucursalId = orden.sucursal_destino_id || 3;

      // Obtener items de la orden
      const [itemRows]: any = await pool.query("SELECT producto_id, cantidad FROM orden_compra_items WHERE orden_id = ?", [ordenId]);

      // Incrementar inventario
      for (const item of itemRows) {
        await pool.query(
          `INSERT INTO inventario (producto_id, sucursal_id, existencias, actualizado_en)
           VALUES (?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE existencias = existencias + VALUES(existencias), actualizado_en = NOW()`,
          [item.producto_id, sucursalId, item.cantidad]
        );
      }

      // Marcar orden como Recibida
      await pool.query("UPDATE ordenes_compra SET estado = 'recibida' WHERE id = ?", [ordenId]);

      await registrarAuditoriaAdmin({
        adminId: admin.id,
        accion: "recibir_orden_compra",
        entidad: "ordenes_compra",
        entidadId: ordenId,
        detalle: { folio: orden.folio, sucursalId },
        ip,
      });

      return NextResponse.json({
        ok: true,
        mensaje: `Recepción de la orden ${orden.folio} registrada exitosamente. Inventario actualizado.`,
      });
    }

    return NextResponse.json({ ok: false, error: "Acción no reconocida" }, { status: 400 });
  } catch (error) {
    console.error("[Admin Reabastecimiento Operation Error Details]:", error);
    return NextResponse.json({ ok: false, error: "Error en la operación de reabastecimiento" }, { status: 500 });
  }
}

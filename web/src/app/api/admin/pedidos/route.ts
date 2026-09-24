import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getAdminSessionFromRequest, registrarAuditoriaAdmin } from "@/lib/admin-session";
import { tienePermiso, obtenerSucursalesPermitidas } from "@/lib/permisos";
import { etiquetaCanal } from "@/lib/pedidos-utils";

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminSessionFromRequest(req);
    if (!admin || !tienePermiso(admin, "pedidos", "ver")) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const busqueda = (searchParams.get("q") || "").trim();
    const canal = searchParams.get("canal");
    const estado = searchParams.get("estado");
    const sucursalId = searchParams.get("sucursalId");

    const pool = getDbPool();
    const sucursalesPermitidas = obtenerSucursalesPermitidas(admin);

    let whereClauses: string[] = ["1=1"];
    const params: any[] = [];

    if (sucursalesPermitidas !== null) {
      if (sucursalesPermitidas.length === 0) {
        whereClauses.push("1=0");
      } else {
        whereClauses.push(`p.sucursal_id IN (${sucursalesPermitidas.map(() => "?").join(",")})`);
        params.push(...sucursalesPermitidas);
      }
    }

    if (busqueda) {
      whereClauses.push("(p.folio LIKE ? OR p.codigo_recogida LIKE ? OR u.nombre LIKE ? OR u.correo LIKE ?)");
      params.push(`%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`, `%${busqueda}%`);
    }

    if (canal && canal !== "todos") {
      whereClauses.push("LOWER(p.canal) = ?");
      params.push(canal.toLowerCase());
    }

    if (estado && estado !== "todos") {
      whereClauses.push("p.estado = ?");
      params.push(estado);
    }

    if (sucursalId && sucursalId !== "todas") {
      whereClauses.push("p.sucursal_id = ?");
      params.push(sucursalId);
    }

    const [rows]: any = await pool.query(
      `SELECT
        p.id,
        p.folio,
        p.canal,
        p.tipo_entrega,
        p.estado,
        p.subtotal,
        p.descuento_total,
        p.costo_envio,
        p.total,
        p.codigo_recogida,
        p.sucursal_id,
        s.nombre as sucursal_nombre,
        p.usuario_id,
        u.nombre as cliente_nombre,
        u.correo as cliente_correo,
        u.telefono as cliente_telefono,
        p.creado_en
       FROM pedidos p
       LEFT JOIN sucursales s ON p.sucursal_id = s.id
       LEFT JOIN usuarios u ON p.usuario_id = u.id
       WHERE ${whereClauses.join(" AND ")}
       ORDER BY p.creado_en DESC
       LIMIT 100`,
      params
    );

    // Cargar items de cada pedido
    const pedidos = await Promise.all(
      rows.map(async (ped: any) => {
        const [itemRows]: any = await pool.query(
          `SELECT
            pi.id,
            pi.producto_id,
            pr.nombre as producto_nombre,
            pr.imagen_url,
            pi.cantidad,
            pi.precio_unitario,
            pi.descuento
           FROM pedido_items pi
           JOIN productos pr ON pi.producto_id = pr.id
           WHERE pi.pedido_id = ?`,
          [ped.id]
        );

        const [eventRows]: any = await pool.query(
          `SELECT estado_nuevo, comentario, creado_en
           FROM pedido_eventos
           WHERE pedido_id = ?
           ORDER BY creado_en ASC`,
          [ped.id]
        );

        const infoCanal = etiquetaCanal(ped.canal, ped.sucursal_nombre);

        return {
          ...ped,
          canalLabel: infoCanal.label,
          canalClass: infoCanal.className,
          items: itemRows,
          eventos: eventRows,
        };
      })
    );

    return NextResponse.json({
      ok: true,
      pedidos,
    });
  } catch (error) {
    console.error("[Admin Pedidos API Error]:", error);
    return NextResponse.json({ ok: false, error: "Error al obtener pedidos" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await getAdminSessionFromRequest(req);
    if (!admin || !tienePermiso(admin, "pedidos", "editar")) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const { pedidoId, accion, nuevoEstado, comentario } = body;

    if (!pedidoId) {
      return NextResponse.json({ ok: false, error: "ID de pedido es requerido" }, { status: 400 });
    }

    const pool = getDbPool();
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";

    // Cancelar y reembolsar (Devuelve inventario)
    if (accion === "cancelar_reembolsar") {
      if (!tienePermiso(admin, "pedidos", "cancelar_pedido")) {
        return NextResponse.json({ ok: false, error: "Sin permiso para cancelar pedidos" }, { status: 403 });
      }

      // Obtener items del pedido para regresar inventario
      const [itemRows]: any = await pool.query(
        "SELECT producto_id, cantidad FROM pedido_items WHERE pedido_id = ?",
        [pedidoId]
      );

      const [pedRows]: any = await pool.query(
        "SELECT sucursal_id, estado, folio FROM pedidos WHERE id = ?",
        [pedidoId]
      );

      if (!pedRows || pedRows.length === 0) {
        return NextResponse.json({ ok: false, error: "Pedido no encontrado" }, { status: 404 });
      }

      const sucursalId = pedRows[0].sucursal_id || 1;

      // Devolver stock a la sucursal del pedido
      for (const item of itemRows) {
        await pool.query(
          `UPDATE inventario
           SET existencias = existencias + ?, actualizado_en = NOW()
           WHERE producto_id = ? AND sucursal_id = ?`,
          [item.cantidad, item.producto_id, sucursalId]
        );
      }

      // Actualizar estado del pedido
      await pool.query(
        "UPDATE pedidos SET estado = 'reembolsado', actualizado_en = NOW() WHERE id = ?",
        [pedidoId]
      );

      // Registrar evento del pedido
      await pool.query(
        `INSERT INTO pedido_eventos (pedido_id, estado_nuevo, comentario, creado_en)
         VALUES (?, 'reembolsado', ?, NOW())`,
        [pedidoId, comentario || `Pedido cancelado y reembolsado por ${admin.nombre} ${admin.apellido}`]
      );

      // Registrar auditoría
      await registrarAuditoriaAdmin({
        adminId: admin.id,
        accion: "cancelar_reembolsar_pedido",
        entidad: "pedidos",
        entidadId: pedidoId,
        detalle: { folio: pedRows[0].folio, motivo: comentario },
        ip,
      });

      return NextResponse.json({
        ok: true,
        mensaje: "Pedido cancelado y reembolsado. El inventario ha sido reincorporado a la sucursal.",
      });
    }

    // Actualización de estado estándar
    if (nuevoEstado) {
      const [pedRows]: any = await pool.query("SELECT folio, estado FROM pedidos WHERE id = ?", [pedidoId]);
      if (!pedRows || pedRows.length === 0) {
        return NextResponse.json({ ok: false, error: "Pedido no encontrado" }, { status: 404 });
      }

      await pool.query(
        "UPDATE pedidos SET estado = ?, actualizado_en = NOW() WHERE id = ?",
        [nuevoEstado, pedidoId]
      );

      await pool.query(
        `INSERT INTO pedido_eventos (pedido_id, estado_nuevo, comentario, creado_en)
         VALUES (?, ?, ?, NOW())`,
        [pedidoId, nuevoEstado, comentario || `Estado cambiado a ${nuevoEstado} por ${admin.nombre}`]
      );

      await registrarAuditoriaAdmin({
        adminId: admin.id,
        accion: "cambiar_estado_pedido",
        entidad: "pedidos",
        entidadId: pedidoId,
        detalle: { folio: pedRows[0].folio, estadoAnterior: pedRows[0].estado, nuevoEstado },
        ip,
      });

      return NextResponse.json({ ok: true, mensaje: `Estado actualizado a ${nuevoEstado}` });
    }

    return NextResponse.json({ ok: false, error: "Operación no especificada" }, { status: 400 });
  } catch (error) {
    console.error("[Admin Pedidos Update Error]:", error);
    return NextResponse.json({ ok: false, error: "Error al actualizar pedido" }, { status: 500 });
  }
}

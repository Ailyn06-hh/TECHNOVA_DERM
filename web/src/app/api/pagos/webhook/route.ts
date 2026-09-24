import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getProveedorPagos } from "@/lib/pagos";
import { cambiarEstado, generarCodigoRecogida } from "@/lib/pedidos";
import { enviarConfirmacionPedido } from "@/lib/notificaciones";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const headersObj: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headersObj[key] = value;
    });

    const proveedor = getProveedorPagos();
    const resultado = await proveedor.verificarWebhook(headersObj, rawBody);

    if (!resultado.valido || (!resultado.folio && !resultado.pedidoId)) {
      return NextResponse.json({ error: "Webhook no válido" }, { status: 400 });
    }

    const pool = getDbPool();
    let conn: any = null;

    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      // 1. Obtener pedido
      const [orderRows]: any = await conn.execute(
        `SELECT id, folio, usuario_id, total, estado, tipo_entrega, sucursal_id, codigo_recogida 
         FROM pedidos 
         WHERE ${resultado.pedidoId ? "id = ?" : "folio = ?"} 
         LIMIT 1`,
        [resultado.pedidoId || resultado.folio]
      );

      if (!orderRows || orderRows.length === 0) {
        await conn.rollback();
        return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
      }

      const pedido = orderRows[0];

      if (resultado.estado === "aprobado") {
        const nuevoEstado = "pagado";

        // Si es recoger y no tiene código de recogida asignado, generarlo
        if (pedido.tipo_entrega === "recoger" && !pedido.codigo_recogida && pedido.sucursal_id) {
          const codRec = await generarCodigoRecogida(pedido.sucursal_id, conn);
          await conn.execute("UPDATE pedidos SET codigo_recogida = ? WHERE id = ?", [
            codRec,
            pedido.id,
          ]);
        }

        await cambiarEstado(
          pedido.id,
          nuevoEstado,
          "Pago aprobado vía webhook",
          conn
        );

        await conn.execute(
          `INSERT INTO pagos (pedido_id, proveedor, referencia_proveedor, estado, monto, detalle_json, creado_en)
           VALUES (?, ?, ?, 'aprobado', ?, ?, NOW())`,
          [
            pedido.id,
            proveedor.nombre,
            resultado.transaccionId || null,
            pedido.total,
            JSON.stringify(resultado.detalleJson || {}),
          ]
        );

        // Vaciar carrito del usuario
        const [cRows]: any = await conn.execute(
          "SELECT id FROM carritos WHERE usuario_id = ? LIMIT 1",
          [pedido.usuario_id]
        );
        if (cRows && cRows.length > 0) {
          await conn.execute("DELETE FROM carrito_items WHERE carrito_id = ?", [cRows[0].id]);
        }

        await conn.commit();

        // Enviar confirmación por correo y registrar notificación (idempotente)
        await enviarConfirmacionPedido({ id: pedido.id, folio: pedido.folio });

        return NextResponse.json({ ok: true });
      } else if (resultado.estado === "rechazado") {
        // Si estaba pendiente, retornar inventario
        if (pedido.estado === "pendiente_pago") {
          const [itemRows]: any = await conn.execute(
            "SELECT producto_id, cantidad FROM pedido_items WHERE pedido_id = ?",
            [pedido.id]
          );

          for (const item of itemRows) {
            await conn.execute(
              "UPDATE inventario SET existencias = existencias + ? WHERE producto_id = ? LIMIT 1",
              [item.cantidad, item.producto_id]
            );
          }
        }

        await cambiarEstado(
          pedido.id,
          "pago_fallido",
          "Pago rechazado vía webhook",
          conn
        );

        await conn.execute(
          `INSERT INTO pagos (pedido_id, proveedor, referencia_proveedor, estado, monto, detalle_json, creado_en)
           VALUES (?, ?, ?, 'rechazado', ?, ?, NOW())`,
          [
            pedido.id,
            proveedor.nombre,
            resultado.transaccionId || null,
            pedido.total,
            JSON.stringify(resultado.detalleJson || {}),
          ]
        );

        await conn.commit();
        return NextResponse.json({ ok: true });
      }

      await conn.commit();
      return NextResponse.json({ ok: true });
    } catch (err) {
      if (conn) await conn.rollback();
      throw err;
    } finally {
      if (conn) conn.release();
    }
  } catch (err: any) {
    console.error("[Webhook Error]:", err);
    return NextResponse.json({ error: "Error interno en webhook" }, { status: 500 });
  }
}

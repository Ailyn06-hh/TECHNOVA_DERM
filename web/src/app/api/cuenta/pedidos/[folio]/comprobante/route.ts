import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/session";
import { getDbPool } from "@/lib/db";
import { generarComprobantePdf } from "@/lib/comprobante-pdf";
import { formatearFechaPedido } from "@/lib/pedidos-utils";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { folio: string } }
) {
  try {
    const user = getAuthUserFromRequest(req);
    if (!user?.userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { folio } = params;
    const pool = getDbPool();

    // 1. Obtener datos del pedido
    const [orderRows]: any = await pool.execute(
      `SELECT p.*, u.nombre as cliente_nombre, u.apellido as cliente_apellido
       FROM pedidos p
       JOIN usuarios u ON p.usuario_id = u.id
       WHERE p.folio = ? LIMIT 1`,
      [folio]
    );

    if (!orderRows || orderRows.length === 0) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    const order = orderRows[0];
    if (order.usuario_id !== user.userId) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    // 2. Obtener items del pedido
    const [itemRows]: any = await pool.execute(
      `SELECT pi.cantidad, pi.precio_unitario, pi.descuento, p.nombre
       FROM pedido_items pi
       JOIN productos p ON pi.producto_id = p.id
       WHERE pi.pedido_id = ?`,
      [order.id]
    );

    const items = (itemRows || []).map((it: any) => ({
      nombre: it.nombre,
      cantidad: Number(it.cantidad),
      precioUnitario: Number(it.precio_unitario),
      totalLinea: Number(it.precio_unitario) * Number(it.cantidad) - Number(it.descuento || 0),
    }));

    // 3. Generar PDF
    const tipoEntregaTexto =
      order.tipo_entrega === "envio"
        ? "Envío a domicilio"
        : order.tipo_entrega === "mostrador"
        ? "Compra en mostrador"
        : "Recoger en tienda";

    const metodoPagoTexto =
      order.metodo_pago === "tarjeta"
        ? `Tarjeta ${order.pago_marca || ""} ${order.pago_ultimos4 ? `•••• ${order.pago_ultimos4}` : ""}`.trim()
        : order.metodo_pago === "mercado_pago"
        ? "Mercado Pago"
        : "Pagar en tienda";

    const pdfBuffer = generarComprobantePdf({
      folio: order.folio,
      fecha: formatearFechaPedido(order.creado_en),
      canal: order.canal,
      tipoEntrega: tipoEntregaTexto,
      metodoPago: metodoPagoTexto,
      items,
      subtotal: Number(order.subtotal),
      descuento: Number(order.descuento || 0),
      costoEnvio: Number(order.costo_envio || 0),
      total: Number(order.total),
      clienteNombre: `${order.cliente_nombre || ""} ${order.cliente_apellido || ""}`.trim() || user.nombre,
    });

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="comprobante-${order.folio}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("[API COMPROBANTE PDF ERROR]:", error);
    return NextResponse.json(
      { error: "Error al generar comprobante PDF", details: error.message },
      { status: 500 }
    );
  }
}

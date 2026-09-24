import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/session";
import { getOrCreateCart, calcularCarrito } from "@/lib/carrito";
import { getDbPool } from "@/lib/db";
import { COSTO_ENVIO, ENVIO_GRATIS_DESDE } from "@/lib/marca";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = getAuthUserFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const tipoEntrega: "recoger" | "envio" =
      body.tipo_entrega === "envio" ? "envio" : "recoger";
    const sucursalId = body.sucursal_id ? Number(body.sucursal_id) : null;
    const direccionId = body.direccion_id ? Number(body.direccion_id) : null;

    const { cartId } = await getOrCreateCart(req);
    const carrito = await calcularCarrito(cartId, session?.userId);

    // Calcular costo de envío
    let costoEnvio = 0;
    let lineaEntrega = "Recoger en tienda · Gratis";

    const montoBase = Math.max(0, carrito.subtotal - carrito.totalDescuentos);

    if (tipoEntrega === "envio") {
      if (montoBase >= ENVIO_GRATIS_DESDE) {
        costoEnvio = 0;
        lineaEntrega = "Envío a domicilio · Gratis";
      } else {
        costoEnvio = COSTO_ENVIO;
        lineaEntrega = `Envío a domicilio · $${COSTO_ENVIO}`;
      }
    }

    const totalFinal = Math.round(montoBase + costoEnvio);

    // Verificar si la sucursal seleccionada tiene todas las piezas del carrito
    let sucursalTieneTodo = true;
    let sucursalFaltanN = 0;

    if (tipoEntrega === "recoger" && sucursalId) {
      const pool = getDbPool();
      const distinctProdIds = Array.from(
        new Set(carrito.items.map((i) => i.producto_id).filter(Boolean))
      );

      if (distinctProdIds.length > 0) {
        const placeholders = distinctProdIds.map(() => "?").join(",");
        const [invRows]: any = await pool.execute(
          `SELECT producto_id, existencias 
           FROM inventario 
           WHERE sucursal_id = ? AND producto_id IN (${placeholders})`,
          [sucursalId, ...distinctProdIds]
        );

        const stockMap = new Map<number, number>();
        for (const r of invRows || []) {
          stockMap.set(Number(r.producto_id), Number(r.existencias || 0));
        }

        for (const item of carrito.items) {
          const avail = stockMap.get(item.producto_id!) || 0;
          if (avail < item.cantidad) {
            sucursalTieneTodo = false;
            sucursalFaltanN++;
          }
        }
      }
    }

    return NextResponse.json({
      tipoEntrega,
      sucursalId,
      direccionId,
      items: carrito.items,
      grupos: carrito.grupos,
      subtotal: carrito.subtotal,
      totalDescuentos: carrito.totalDescuentos,
      lineasDescuento: carrito.lineasDescuento,
      costoEnvio,
      lineaEntrega,
      total: totalFinal,
      hayAgotados: carrito.hayAgotados,
      hayInsuficientes: carrito.hayInsuficientes,
      tieneArticulos: carrito.tieneArticulos,
      sucursalTieneTodo,
      sucursalFaltanN,
    });
  } catch (err: any) {
    console.error("[POST /api/checkout/resumen Error]:", err);
    return NextResponse.json({ error: "Error al calcular resumen de checkout" }, { status: 500 });
  }
}

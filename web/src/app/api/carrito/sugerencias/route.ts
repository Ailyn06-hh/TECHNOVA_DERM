import { NextRequest, NextResponse } from "next/server";
import { getOrCreateCart } from "@/lib/carrito";
import { getSugerenciasCarrito } from "@/lib/recomendaciones";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { cartId, userId } = await getOrCreateCart(req);
    const sugerencias = await getSugerenciasCarrito(cartId, userId);

    return NextResponse.json({ sugerencias }, { status: 200 });
  } catch (error: any) {
    console.error("[GET /api/carrito/sugerencias ERROR]:", error);
    return NextResponse.json({ sugerencias: [] }, { status: 500 });
  }
}

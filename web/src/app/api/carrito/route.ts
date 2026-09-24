import { NextRequest, NextResponse } from "next/server";
import { getOrCreateCart, calcularCarrito } from "@/lib/carrito";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const { cartId, userId, newGuestCookie } = await getOrCreateCart(req, response);

    const carritoCalculado = await calcularCarrito(cartId, userId);

    const dataResponse = NextResponse.json(carritoCalculado, { status: 200 });

    if (newGuestCookie) {
      dataResponse.cookies.set({
        name: newGuestCookie.name,
        value: newGuestCookie.value,
        maxAge: newGuestCookie.maxAge,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
    }

    return dataResponse;
  } catch (error: any) {
    console.error("[CARRITO GET ERROR]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

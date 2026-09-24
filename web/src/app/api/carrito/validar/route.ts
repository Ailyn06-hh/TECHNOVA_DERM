import { NextRequest, NextResponse } from "next/server";
import { getOrCreateCart, calcularCarrito } from "@/lib/carrito";
import { getAuthUserFromRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * POST /api/carrito/validar
 * Recalcula todo en el servidor antes de proceder al checkout.
 * Si algo cambió (precio, stock, descuentos), rechaza y devuelve el carrito actualizado con un aviso.
 */
export async function POST(req: NextRequest) {
  try {
    const session = getAuthUserFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json(
        {
          valido: false,
          redirect: "/login?volver=/carrito",
          error: "Inicia sesión para continuar al pago.",
        },
        { status: 401 }
      );
    }

    const { cartId, userId } = await getOrCreateCart(req);
    const carrito = await calcularCarrito(cartId, userId);

    if (!carrito.tieneArticulos) {
      return NextResponse.json(
        {
          valido: false,
          error: "Tu carrito está vacío.",
          carrito,
        },
        { status: 400 }
      );
    }

    if (carrito.hayAgotados) {
      return NextResponse.json(
        {
          valido: false,
          error: "Hay artículos agotados en tu carrito. Quítalos para poder continuar.",
          carrito,
        },
        { status: 400 }
      );
    }

    if (carrito.hayInsuficientes) {
      return NextResponse.json(
        {
          valido: false,
          error: "Uno o más artículos superan las existencias en inventario. Ajusta las cantidades para continuar.",
          carrito,
        },
        { status: 400 }
      );
    }

    const hayCambioPrecios = carrito.items.some((i) => i.cambioPrecio);
    if (hayCambioPrecios) {
      return NextResponse.json(
        {
          valido: false,
          error: "Uno o más productos actualizaron su precio vigente en el catálogo. Revisa el resumen actualizado.",
          carrito,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        valido: true,
        redirect: "/checkout",
        carrito,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[POST /api/carrito/validar ERROR]:", error);
    return NextResponse.json(
      { error: "Error al validar carrito", message: error.message },
      { status: 500 }
    );
  }
}

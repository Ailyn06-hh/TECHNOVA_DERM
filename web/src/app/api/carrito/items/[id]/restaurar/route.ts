import { NextRequest, NextResponse } from "next/server";
import { getOrCreateCart, calcularCarrito } from "@/lib/carrito";
import { getDbPool } from "@/lib/db";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * POST /api/carrito/items/[id]/restaurar
 * Restaura un artículo eliminado recientemente (acción Deshacer)
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const itemId = Number(params.id);
    if (isNaN(itemId) || itemId <= 0) {
      return NextResponse.json({ error: "ID de artículo inválido" }, { status: 400 });
    }

    const response = NextResponse.json({ ok: true });
    const { cartId, userId, newGuestCookie } = await getOrCreateCart(req, response);
    const pool = getDbPool();

    // 1. Restaurar artículo estableciendo eliminado_en = NULL
    const [updateRes]: any = await pool.execute(
      "UPDATE carrito_items SET eliminado_en = NULL WHERE id = ? AND carrito_id = ?",
      [itemId, cartId]
    );

    if (updateRes.affectedRows === 0) {
      return NextResponse.json(
        { error: "No se encontró el artículo para restaurar o no pertenece a tu carrito." },
        { status: 404 }
      );
    }

    // 2. Recalcular el carrito
    const carritoCalculado = await calcularCarrito(cartId, userId);

    const successResponse = NextResponse.json(
      {
        success: true,
        exito: true,
        message: "Artículo restaurado en tu carrito",
        carrito: carritoCalculado,
      },
      { status: 200 }
    );

    if (newGuestCookie) {
      successResponse.cookies.set({
        name: newGuestCookie.name,
        value: newGuestCookie.value,
        maxAge: newGuestCookie.maxAge,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
    }

    return successResponse;
  } catch (error: any) {
    console.error("[POST /api/carrito/items/[id]/restaurar ERROR]:", error);
    return NextResponse.json(
      { error: "Error al restaurar artículo", message: error.message },
      { status: 500 }
    );
  }
}

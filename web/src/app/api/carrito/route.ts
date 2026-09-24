import { NextRequest, NextResponse } from "next/server";
import { getOrCreateCart } from "@/lib/carrito";
import { getDbPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const response = NextResponse.json({ ok: true });
    const { cartId, newGuestCookie } = await getOrCreateCart(req, response);

    const pool = getDbPool();

    // Obtener items del carrito junto con detalles de producto o combo
    const [rows]: any = await pool.execute(
      `SELECT 
        ci.id,
        ci.cantidad,
        ci.precio_unitario_al_agregar,
        ci.producto_id,
        ci.combo_id,
        p.nombre as producto_nombre,
        p.slug as producto_slug,
        p.color_fondo as producto_color_fondo,
        p.color_frasco as producto_color_frasco,
        p.precio as producto_precio,
        p.precio_especial as producto_precio_especial,
        cb.nombre as combo_nombre,
        cb.slug as combo_slug,
        cb.color_fondo as combo_color_fondo,
        cb.descuento_porcentaje as combo_descuento
      FROM carrito_items ci
      LEFT JOIN productos p ON p.id = ci.producto_id
      LEFT JOIN combos cb ON cb.id = ci.combo_id
      WHERE ci.carrito_id = ?
      ORDER BY ci.id DESC`,
      [cartId]
    );

    const items = rows || [];
    const totalItems = items.reduce((acc: number, item: any) => acc + Number(item.cantidad), 0);
    const subtotal = items.reduce(
      (acc: number, item: any) =>
        acc + Number(item.cantidad) * Number(item.precio_unitario_al_agregar),
      0
    );

    const dataResponse = NextResponse.json({
      cartId,
      items,
      totalItems,
      subtotal,
    });

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
    return NextResponse.json({ error: error.message, totalItems: 0, items: [] }, { status: 500 });
  }
}

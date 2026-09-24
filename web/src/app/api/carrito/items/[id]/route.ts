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
 * PATCH /api/carrito/items/[id]
 * Cambia la cantidad de un artículo en el carrito
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const itemId = Number(params.id);
    if (isNaN(itemId) || itemId <= 0) {
      return NextResponse.json({ error: "ID de artículo inválido" }, { status: 400 });
    }

    const body = await req.json();
    const { cantidad } = body;
    const requestedQty = Math.max(1, Number(cantidad) || 1);

    const response = NextResponse.json({ ok: true });
    const { cartId, userId, newGuestCookie } = await getOrCreateCart(req, response);
    const pool = getDbPool();

    // 1. Verificar que el artículo pertenezca al carrito del usuario/invitado
    const [itemRows]: any = await pool.execute(
      `SELECT ci.id, ci.producto_id, ci.combo_id, ci.cantidad 
       FROM carrito_items ci 
       WHERE ci.id = ? AND ci.carrito_id = ? AND ci.eliminado_en IS NULL 
       LIMIT 1`,
      [itemId, cartId]
    );

    if (!itemRows || itemRows.length === 0) {
      return NextResponse.json(
        { error: "El artículo no existe o no pertenece a tu carrito" },
        { status: 404 }
      );
    }

    const item = itemRows[0];

    // 2. Validar stock disponible
    let totalStock = 0;
    if (item.producto_id) {
      const [invRows]: any = await pool.execute(
        "SELECT COALESCE(SUM(existencias), 0) as total_stock FROM inventario WHERE producto_id = ?",
        [item.producto_id]
      );
      totalStock = Number(invRows[0]?.total_stock || 0);
    } else if (item.combo_id) {
      const [cpRows]: any = await pool.execute(
        `SELECT cp.cantidad, COALESCE(SUM(i.existencias), 0) as total_stock
         FROM combo_productos cp
         LEFT JOIN inventario i ON i.producto_id = cp.producto_id
         WHERE cp.combo_id = ?
         GROUP BY cp.producto_id`,
        [item.combo_id]
      );
      const cpList: any[] = cpRows || [];
      if (cpList.length > 0) {
        totalStock = Math.min(
          ...cpList.map((p) => Math.floor(Number(p.total_stock) / Number(p.cantidad || 1)))
        );
      }
    }

    const maxAllowed = Math.min(10, totalStock);

    if (totalStock <= 0) {
      return NextResponse.json(
        {
          error: "Producto agotado",
          message: "Este producto ya no cuenta con existencias disponibles.",
          totalStock: 0,
        },
        { status: 400 }
      );
    }

    if (requestedQty > maxAllowed) {
      return NextResponse.json(
        {
          error: "Stock insuficiente",
          message:
            maxAllowed === 10
              ? "El límite máximo por producto es de 10 piezas."
              : `Solo quedan ${totalStock} piezas disponibles.`,
          totalStock,
          maxAllowed,
        },
        { status: 400 }
      );
    }

    // 3. Actualizar la cantidad en la base de datos
    await pool.execute(
      "UPDATE carrito_items SET cantidad = ?, actualizado_en = NOW() WHERE id = ? AND carrito_id = ?",
      [requestedQty, itemId, cartId]
    );

    // 4. Recalcular carrito completo como única fuente de verdad
    const carritoCalculado = await calcularCarrito(cartId, userId);

    const successResponse = NextResponse.json(
      {
        success: true,
        exito: true,
        message: "Cantidad actualizada",
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
    console.error("[PATCH /api/carrito/items/[id] ERROR]:", error);
    return NextResponse.json(
      { error: "Error al actualizar cantidad", message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/carrito/items/[id]
 * Quita el artículo del carrito (soft delete para permitir Deshacer)
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const itemId = Number(params.id);
    if (isNaN(itemId) || itemId <= 0) {
      return NextResponse.json({ error: "ID de artículo inválido" }, { status: 400 });
    }

    const response = NextResponse.json({ ok: true });
    const { cartId, userId, newGuestCookie } = await getOrCreateCart(req, response);
    const pool = getDbPool();

    // 1. Obtener detalles del artículo antes de eliminar
    const [itemRows]: any = await pool.execute(
      `SELECT 
        ci.id, 
        ci.producto_id, 
        ci.combo_id, 
        ci.grupo_id, 
        ci.grupo_tipo, 
        ci.grupo_clave, 
        ci.descuento_porcentaje,
        COALESCE(p.nombre, cb.nombre, 'Producto') as nombre
       FROM carrito_items ci 
       LEFT JOIN productos p ON p.id = ci.producto_id 
       LEFT JOIN combos cb ON cb.id = ci.combo_id
       WHERE ci.id = ? AND ci.carrito_id = ? AND ci.eliminado_en IS NULL 
       LIMIT 1`,
      [itemId, cartId]
    );

    if (!itemRows || itemRows.length === 0) {
      return NextResponse.json(
        { error: "El artículo no existe o ya fue eliminado de tu carrito" },
        { status: 404 }
      );
    }

    const item = itemRows[0];
    const eraDeGrupo = Boolean(item.grupo_id);
    const descuentoPorcentaje = Number(item.descuento_porcentaje || 0);

    // 2. Soft delete: marcar eliminado_en = NOW()
    await pool.execute(
      "UPDATE carrito_items SET eliminado_en = NOW() WHERE id = ? AND carrito_id = ?",
      [itemId, cartId]
    );

    // 3. Recalcular el carrito
    const carritoCalculado = await calcularCarrito(cartId, userId);

    const successResponse = NextResponse.json(
      {
        success: true,
        exito: true,
        message: `Quitaste ${item.nombre}`,
        itemId,
        itemEliminado: { id: item.id, nombre: item.nombre },
        productoNombre: item.nombre,
        eraDeGrupo,
        descuentoPorcentaje,
        avisoGrupo: eraDeGrupo ? "Se actualizó el descuento de la rutina." : undefined,
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
    console.error("[DELETE /api/carrito/items/[id] ERROR]:", error);
    return NextResponse.json(
      { error: "Error al quitar artículo", message: error.message },
      { status: 500 }
    );
  }
}

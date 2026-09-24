import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getDbPool } from "./db";
import { getAuthUserFromRequest } from "./session";

export const GUEST_CART_COOKIE = "token_invitado";

/**
 * Obtiene o crea el carrito activo para el usuario autenticado o para un invitado
 */
export async function getOrCreateCart(
  req: NextRequest,
  response?: NextResponse
): Promise<{
  cartId: number;
  userId: number | null;
  guestToken: string | null;
  newGuestCookie?: { name: string; value: string; maxAge: number };
}> {
  const pool = getDbPool();
  const session = getAuthUserFromRequest(req);

  // 1. Usuario autenticado
  if (session?.userId) {
    const [rows]: any = await pool.execute(
      "SELECT id FROM carritos WHERE usuario_id = ? LIMIT 1",
      [session.userId]
    );

    if (rows && rows.length > 0) {
      return { cartId: rows[0].id, userId: session.userId, guestToken: null };
    }

    const [insertRes]: any = await pool.execute(
      "INSERT INTO carritos (usuario_id, actualizado_en) VALUES (?, NOW())",
      [session.userId]
    );

    return { cartId: insertRes.insertId, userId: session.userId, guestToken: null };
  }

  // 2. Usuario invitado
  let guestToken = req.cookies.get(GUEST_CART_COOKIE)?.value;
  let isNewGuestToken = false;

  if (!guestToken || guestToken.length < 16) {
    guestToken = crypto.randomBytes(24).toString("hex");
    isNewGuestToken = true;
  }

  const [guestRows]: any = await pool.execute(
    "SELECT id FROM carritos WHERE token_invitado = ? LIMIT 1",
    [guestToken]
  );

  let cartId: number;

  if (guestRows && guestRows.length > 0) {
    cartId = guestRows[0].id;
  } else {
    const [insertRes]: any = await pool.execute(
      "INSERT INTO carritos (token_invitado, actualizado_en) VALUES (?, NOW())",
      [guestToken]
    );
    cartId = insertRes.insertId;
  }

  const cookieData = isNewGuestToken
    ? {
        name: GUEST_CART_COOKIE,
        value: guestToken,
        maxAge: 60 * 60 * 24 * 30, // 30 días
      }
    : undefined;

  if (response && cookieData) {
    response.cookies.set({
      name: cookieData.name,
      value: cookieData.value,
      maxAge: cookieData.maxAge,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  }

  return {
    cartId,
    userId: null,
    guestToken,
    newGuestCookie: cookieData,
  };
}

/**
 * Fusiona el carrito del invitado con el del usuario autenticado sumando cantidades
 * sin sobrepasar el stock disponible.
 */
export async function fusionarCarritoInvitado(
  userId: number,
  guestToken: string | undefined
): Promise<void> {
  if (!guestToken) return;

  const pool = getDbPool();
  let connection: any = null;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Buscar carrito de invitado
    const [gCartRows]: any = await connection.execute(
      "SELECT id FROM carritos WHERE token_invitado = ? LIMIT 1",
      [guestToken]
    );

    if (!gCartRows || gCartRows.length === 0) {
      await connection.rollback();
      return;
    }

    const guestCartId = gCartRows[0].id;

    // 2. Obtener o crear carrito del usuario
    let [uCartRows]: any = await connection.execute(
      "SELECT id FROM carritos WHERE usuario_id = ? LIMIT 1",
      [userId]
    );

    let userCartId: number;
    if (uCartRows && uCartRows.length > 0) {
      userCartId = uCartRows[0].id;
    } else {
      const [uInsert]: any = await connection.execute(
        "INSERT INTO carritos (usuario_id, actualizado_en) VALUES (?, NOW())",
        [userId]
      );
      userCartId = uInsert.insertId;
    }

    // 3. Obtener items del carrito de invitado
    const [guestItems]: any = await connection.execute(
      "SELECT producto_id, combo_id, cantidad, precio_unitario_al_agregar FROM carrito_items WHERE carrito_id = ?",
      [guestCartId]
    );

    for (const item of guestItems) {
      if (item.producto_id) {
        // Consultar stock total
        const [stockRows]: any = await connection.execute(
          "SELECT COALESCE(SUM(existencias), 0) AS total_stock FROM inventario WHERE producto_id = ?",
          [item.producto_id]
        );
        const totalStock = Number(stockRows[0]?.total_stock || 0);

        // Verificar si ya existe en el carrito del usuario
        const [existing]: any = await connection.execute(
          "SELECT id, cantidad FROM carrito_items WHERE carrito_id = ? AND producto_id = ? LIMIT 1",
          [userCartId, item.producto_id]
        );

        if (existing && existing.length > 0) {
          const nuevaCantidad = Math.min(
            totalStock,
            existing[0].cantidad + item.cantidad
          );
          await connection.execute(
            "UPDATE carrito_items SET cantidad = ? WHERE id = ?",
            [nuevaCantidad, existing[0].id]
          );
        } else {
          const cantidadFinal = Math.min(totalStock, item.cantidad);
          if (cantidadFinal > 0) {
            await connection.execute(
              `INSERT INTO carrito_items 
                (carrito_id, producto_id, combo_id, cantidad, precio_unitario_al_agregar) 
               VALUES (?, ?, NULL, ?, ?)`,
              [userCartId, item.producto_id, cantidadFinal, item.precio_unitario_al_agregar]
            );
          }
        }
      } else if (item.combo_id) {
        // Manejar combo
        const [existing]: any = await connection.execute(
          "SELECT id, cantidad FROM carrito_items WHERE carrito_id = ? AND combo_id = ? LIMIT 1",
          [userCartId, item.combo_id]
        );

        if (existing && existing.length > 0) {
          await connection.execute(
            "UPDATE carrito_items SET cantidad = cantidad + ? WHERE id = ?",
            [item.cantidad, existing[0].id]
          );
        } else {
          await connection.execute(
            `INSERT INTO carrito_items 
              (carrito_id, producto_id, combo_id, cantidad, precio_unitario_al_agregar) 
             VALUES (?, NULL, ?, ?, ?)`,
            [userCartId, item.combo_id, item.cantidad, item.precio_unitario_al_agregar]
          );
        }
      }
    }

    // 4. Eliminar el carrito de invitado y sus items
    await connection.execute("DELETE FROM carritos WHERE id = ?", [guestCartId]);

    await connection.commit();
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("[FUSIONAR CARRITO ERROR]:", error);
  } finally {
    if (connection) connection.release();
  }
}

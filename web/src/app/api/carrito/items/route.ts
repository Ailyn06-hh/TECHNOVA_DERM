import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getOrCreateCart } from "@/lib/carrito";
import { getDbPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      producto_id,
      combo_id,
      cantidad = 1,
      grupo_id,
      grupo_tipo,
      grupo_clave,
      descuento_porcentaje,
    } = body;

    const requestedQty = Math.max(1, Number(cantidad) || 1);

    if (!producto_id && !combo_id) {
      return NextResponse.json(
        { error: "Debes especificar un producto_id o un combo_id." },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ ok: true });
    const { cartId, newGuestCookie } = await getOrCreateCart(req, response);
    const pool = getDbPool();

    // 1. Agregar Producto Individual
    if (producto_id) {
      const pId = Number(producto_id);

      // Consultar existencia del producto y su precio
      const [prodRows]: any = await pool.execute(
        "SELECT id, nombre, precio, precio_especial, activo FROM productos WHERE id = ? LIMIT 1",
        [pId]
      );

      if (!prodRows || prodRows.length === 0 || !prodRows[0].activo) {
        return NextResponse.json(
          { error: "Producto no disponible." },
          { status: 404 }
        );
      }

      const prod = prodRows[0];
      const precioUnitario = Number(prod.precio_especial ?? prod.precio);

      // Validar stock total en inventario unificado
      const [stockRows]: any = await pool.execute(
        "SELECT COALESCE(SUM(existencias), 0) as total_stock FROM inventario WHERE producto_id = ?",
        [pId]
      );
      const totalStock = Number(stockRows[0]?.total_stock || 0);

      // Consultar cantidad ya presente en el carrito
      const [existingRows]: any = await pool.execute(
        "SELECT id, cantidad FROM carrito_items WHERE carrito_id = ? AND producto_id = ? AND eliminado_en IS NULL LIMIT 1",
        [cartId, pId]
      );

      const currentQtyInCart = existingRows && existingRows.length > 0 ? Number(existingRows[0].cantidad) : 0;
      const targetQty = currentQtyInCart + requestedQty;

      if (targetQty > totalStock) {
        const disponible = Math.max(0, totalStock - currentQtyInCart);
        return NextResponse.json(
          {
            error: "Sin stock suficiente",
            message:
              disponible > 0
                ? `Solo quedan ${disponible} piezas disponibles para agregar.`
                : "No hay más piezas disponibles de este producto.",
            stockDisponible: totalStock,
          },
          { status: 400 }
        );
      }

      if (existingRows && existingRows.length > 0) {
        await pool.execute(
          "UPDATE carrito_items SET cantidad = ?, precio_unitario_al_agregar = ? WHERE id = ?",
          [targetQty, precioUnitario, existingRows[0].id]
        );
      } else {
        await pool.execute(
          `INSERT INTO carrito_items 
            (carrito_id, producto_id, combo_id, cantidad, precio_unitario_al_agregar, grupo_id, grupo_tipo, grupo_clave, descuento_porcentaje) 
           VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
          [
            cartId,
            pId,
            requestedQty,
            precioUnitario,
            grupo_id || null,
            grupo_tipo || null,
            grupo_clave || null,
            descuento_porcentaje ? Number(descuento_porcentaje) : null,
          ]
        );
      }
    } else if (combo_id) {
      // 2. Agregar Combo
      const cId = Number(combo_id);

      const [comboRows]: any = await pool.execute(
        "SELECT id, nombre, slug, descuento_porcentaje, activo FROM combos WHERE id = ? LIMIT 1",
        [cId]
      );

      if (!comboRows || comboRows.length === 0 || !comboRows[0].activo) {
        return NextResponse.json(
          { error: "Combo no disponible o inactivo." },
          { status: 404 }
        );
      }

      const combo = comboRows[0];

      // Obtener productos del combo y validar stock de cada uno
      const [itemsCombo]: any = await pool.execute(
        `SELECT 
          cp.producto_id, 
          cp.cantidad, 
          p.precio, 
          p.precio_especial, 
          COALESCE(SUM(i.existencias), 0) as total_stock
         FROM combo_productos cp
         JOIN productos p ON p.id = cp.producto_id
         LEFT JOIN inventario i ON i.producto_id = cp.producto_id
         WHERE cp.combo_id = ?
         GROUP BY cp.producto_id`,
        [cId]
      );

      if (!itemsCombo || itemsCombo.length === 0) {
        return NextResponse.json(
          { error: "El combo no contiene productos." },
          { status: 400 }
        );
      }

      // Validar stock de cada producto para la cantidad de combos solicitada
      for (const item of itemsCombo) {
        const required = Number(item.cantidad) * requestedQty;
        if (Number(item.total_stock) < required) {
          return NextResponse.json(
            {
              error: "Sin stock suficiente",
              message: "Uno o más productos del combo están agotados.",
            },
            { status: 400 }
          );
        }
      }

      // Calcular precio unitario del combo con el descuento
      const subtotalSinDesc = itemsCombo.reduce((acc: number, item: any) => {
        const p = Number(item.precio_especial ?? item.precio);
        return acc + p * Number(item.cantidad);
      }, 0);

      const descuentoPct = Number(combo.descuento_porcentaje || 0);
      const precioUnitarioCombo = Math.round(subtotalSinDesc * (1 - descuentoPct / 100));

      const [existingComboRows]: any = await pool.execute(
        "SELECT id, cantidad FROM carrito_items WHERE carrito_id = ? AND combo_id = ? AND eliminado_en IS NULL LIMIT 1",
        [cartId, cId]
      );

      if (existingComboRows && existingComboRows.length > 0) {
        await pool.execute(
          "UPDATE carrito_items SET cantidad = cantidad + ?, precio_unitario_al_agregar = ? WHERE id = ?",
          [requestedQty, precioUnitarioCombo, existingComboRows[0].id]
        );
      } else {
        const grupoId = crypto.randomUUID();
        await pool.execute(
          `INSERT INTO carrito_items 
            (carrito_id, producto_id, combo_id, cantidad, precio_unitario_al_agregar, grupo_id, grupo_tipo, grupo_clave, descuento_porcentaje) 
           VALUES (?, NULL, ?, ?, ?, ?, 'combo', ?, ?)`,
          [cartId, cId, requestedQty, precioUnitarioCombo, grupoId, combo.slug || String(cId), descuentoPct]
        );
      }
    }

    // Calcular nuevo total de items
    const [countRows]: any = await pool.execute(
      "SELECT COALESCE(SUM(cantidad), 0) as total_items FROM carrito_items WHERE carrito_id = ? AND eliminado_en IS NULL",
      [cartId]
    );

    const totalItems = Number(countRows[0]?.total_items || 0);

    const successResponse = NextResponse.json(
      {
        success: true,
        exito: true,
        message: "Agregado a tu bolsa",
        totalItems,
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
    console.error("[CARRITO AGREGAR ERROR]:", error);
    return NextResponse.json(
      { error: "Error al agregar al carrito", message: error.message },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getOrCreateCart } from "@/lib/carrito";
import { getDbPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productoIds } = body;

    if (!Array.isArray(productoIds) || productoIds.length === 0) {
      return NextResponse.json(
        { error: "Debes seleccionar al menos un producto." },
        { status: 400 }
      );
    }

    const ids = productoIds.map((id) => Number(id)).filter((id) => !isNaN(id));
    if (ids.length === 0) {
      return NextResponse.json(
        { error: "Lista de productos inválida." },
        { status: 400 }
      );
    }

    const pool = getDbPool();
    const response = NextResponse.json({ ok: true });
    const { cartId } = await getOrCreateCart(req, response);

    // 1. Obtener productos y verificar stock de cada uno
    const placeholders = ids.map(() => "?").join(",");
    const [prodRows]: any = await pool.execute(
      `SELECT 
        p.id, 
        p.nombre, 
        p.tipo_rutina, 
        p.precio, 
        p.precio_especial, 
        p.activo,
        COALESCE(SUM(i.existencias), 0) as total_stock
       FROM productos p
       LEFT JOIN inventario i ON i.producto_id = p.id
       WHERE p.id IN (${placeholders}) AND p.activo = 1
       GROUP BY p.id`,
      ids
    );

    const prods = prodRows || [];
    if (prods.length !== ids.length) {
      return NextResponse.json(
        { error: "Uno o más productos seleccionados no están disponibles." },
        { status: 400 }
      );
    }

    // 2. Verificar que cada producto tenga stock disponible
    for (const p of prods) {
      if (Number(p.total_stock) < 1) {
        return NextResponse.json(
          { error: `El producto "${p.nombre}" está agotado.` },
          { status: 400 }
        );
      }
    }

    // 3. Verificar si aplica el 10% de descuento:
    // Solo aplica si son exactamente 3 productos y tienen pasos distintos (limpiador, serum, protector)
    const pasos = new Set(prods.map((p: any) => p.tipo_rutina).filter(Boolean));
    const aplicaDescuento =
      prods.length === 3 &&
      pasos.size === 3 &&
      pasos.has("limpiador") &&
      pasos.has("serum") &&
      pasos.has("protector");

    const descuentoMultiplicador = aplicaDescuento ? 0.9 : 1.0;

    // 4. Agregar cada producto al carrito
    for (const p of prods) {
      const basePrice = Number(p.precio_especial ?? p.precio);
      const finalUnitario = Math.round(basePrice * descuentoMultiplicador);

      // Verificar si ya existe en el carrito
      const [existingRows]: any = await pool.execute(
        "SELECT id, cantidad FROM carrito_items WHERE carrito_id = ? AND producto_id = ? LIMIT 1",
        [cartId, p.id]
      );

      if (existingRows && existingRows.length > 0) {
        const newQty = Number(existingRows[0].cantidad) + 1;
        await pool.execute(
          "UPDATE carrito_items SET cantidad = ?, precio_unitario_al_agregar = ? WHERE id = ?",
          [newQty, finalUnitario, existingRows[0].id]
        );
      } else {
        await pool.execute(
          `INSERT INTO carrito_items 
            (carrito_id, producto_id, combo_id, cantidad, precio_unitario_al_agregar) 
           VALUES (?, ?, NULL, 1, ?)`,
          [cartId, p.id, finalUnitario]
        );
      }
    }

    // Obtener total de items en el carrito
    const [countRows]: any = await pool.execute(
      "SELECT COALESCE(SUM(cantidad), 0) as totalItems FROM carrito_items WHERE carrito_id = ?",
      [cartId]
    );

    const totalItems = Number(countRows[0]?.totalItems || 0);

    const message = aplicaDescuento
      ? "¡Rutina completa agregada con 10% de descuento!"
      : `${prods.length} ${prods.length === 1 ? "producto agregado" : "productos agregados"} a tu bolsa`;

    return NextResponse.json({
      success: true,
      totalItems,
      message,
    });
  } catch (error: any) {
    console.error("Error en POST /api/carrito/rutina:", error);
    return NextResponse.json(
      { error: "Error al agregar rutina al carrito" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pool = getDbPool();

    // Consultar hasta 3 combos activos y vigentes por fecha
    const [comboRows]: any = await pool.execute(
      `SELECT 
        id, 
        nombre, 
        slug, 
        descripcion_corta, 
        descuento_porcentaje, 
        color_fondo, 
        activo, 
        inicia_en, 
        termina_en
       FROM combos
       WHERE activo = 1 
         AND inicia_en <= NOW() 
         AND (termina_en IS NULL OR termina_en >= NOW())
       ORDER BY id ASC
       LIMIT 3`
    );

    const combos = await Promise.all(
      (comboRows || []).map(async (c: any) => {
        // Obtener productos que componen el combo y el stock disponible
        const [prodRows]: any = await pool.execute(
          `SELECT 
            cp.producto_id, 
            cp.cantidad, 
            p.nombre, 
            p.precio, 
            p.precio_especial,
            COALESCE(SUM(i.existencias), 0) as total_stock
           FROM combo_productos cp
           JOIN productos p ON p.id = cp.producto_id
           LEFT JOIN inventario i ON i.producto_id = cp.producto_id
           WHERE cp.combo_id = ?
           GROUP BY cp.producto_id`,
          [c.id]
        );

        const productos = prodRows || [];
        const subtotalOriginal = productos.reduce((acc: number, p: any) => {
          const precioItem = Number(p.precio_especial ?? p.precio);
          return acc + precioItem * Number(p.cantidad);
        }, 0);

        const descuentoPct = Number(c.descuento_porcentaje || 0);
        const precioConDescuento = Math.round(subtotalOriginal * (1 - descuentoPct / 100));

        // Un combo está agotado si cualquiera de sus productos no tiene stock suficiente
        const agotado = productos.some((p: any) => Number(p.total_stock) < Number(p.cantidad));

        return {
          id: Number(c.id),
          nombre: c.nombre,
          slug: c.slug,
          descripcion_corta: c.descripcion_corta,
          descuento_porcentaje: descuentoPct,
          color_fondo: c.color_fondo,
          precio_original: subtotalOriginal,
          precio_final: precioConDescuento,
          agotado,
          productos: productos.map((p: any) => ({
            id: Number(p.producto_id),
            nombre: p.nombre,
            cantidad: Number(p.cantidad),
            precio: Number(p.precio),
            precio_especial: p.precio_especial ? Number(p.precio_especial) : null,
          })),
        };
      })
    );

    return NextResponse.json({ combos }, { status: 200 });
  } catch (error: any) {
    console.error("[COMBOS SEMANA ERROR]:", error);
    return NextResponse.json({ error: error.message, combos: [] }, { status: 500 });
  }
}

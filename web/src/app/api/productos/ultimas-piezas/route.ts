import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const pool = getDbPool();

    // 4 productos activos con stock total entre 1 y 5, ordenados de menor a mayor stock
    const [rows]: any = await pool.execute(
      `SELECT 
        p.id, 
        p.sku, 
        p.nombre, 
        p.slug, 
        p.categoria_id, 
        p.descripcion, 
        p.precio, 
        p.precio_especial, 
        p.color_fondo, 
        p.color_frasco, 
        p.imagen_url,
        c.nombre as categoria_nombre,
        COALESCE(SUM(i.existencias), 0) as total_stock
       FROM productos p
       JOIN categorias c ON c.id = p.categoria_id
       JOIN inventario i ON i.producto_id = p.id
       WHERE p.activo = 1
       GROUP BY p.id
       HAVING total_stock BETWEEN 1 AND 5
       ORDER BY total_stock ASC, p.id ASC
       LIMIT 4`
    );

    const productos = (rows || []).map((r: any) => ({
      id: Number(r.id),
      sku: r.sku,
      nombre: r.nombre,
      slug: r.slug,
      categoria_nombre: r.categoria_nombre,
      descripcion: r.descripcion,
      precio: Number(r.precio),
      precio_especial: r.precio_especial ? Number(r.precio_especial) : null,
      color_fondo: r.color_fondo,
      color_frasco: r.color_frasco,
      imagen_url: r.imagen_url,
      total_stock: Number(r.total_stock),
      etiqueta_stock: Number(r.total_stock) === 1 ? "Última pieza" : `Quedan ${r.total_stock}`,
    }));

    return NextResponse.json({ productos }, { status: 200 });
  } catch (error: any) {
    console.error("[ULTIMAS PIEZAS ERROR]:", error);
    return NextResponse.json({ error: error.message, productos: [] }, { status: 500 });
  }
}

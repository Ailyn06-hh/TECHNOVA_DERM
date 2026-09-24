import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    if (q.length < 2) {
      return NextResponse.json({ productos: [] }, { status: 200 });
    }

    const pool = getDbPool();

    // Buscar hasta 6 productos activos por nombre o descripción (insensible a acentos con COLLATE utf8mb4_unicode_ci)
    const [rows]: any = await pool.execute(
      `SELECT 
        p.id, 
        p.nombre, 
        p.slug, 
        p.precio, 
        p.precio_especial, 
        p.color_fondo, 
        p.color_frasco,
        c.nombre as categoria_nombre
      FROM productos p
      JOIN categorias c ON c.id = p.categoria_id
      WHERE p.activo = 1 
        AND (p.nombre LIKE ? OR p.descripcion LIKE ? OR c.nombre LIKE ?)
      ORDER BY 
        CASE WHEN p.nombre LIKE ? THEN 1 ELSE 2 END,
        p.id ASC
      LIMIT 6`,
      [`%${q}%`, `%${q}%`, `%${q}%`, `${q}%`]
    );

    return NextResponse.json({ productos: rows || [] }, { status: 200 });
  } catch (error: any) {
    console.error("[BUSCAR PRODUCTOS ERROR]:", error);
    return NextResponse.json(
      { error: "Error al buscar productos", detalles: error.message },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getAuthUserFromRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = getAuthUserFromRequest(req);
    const pool = getDbPool();

    let productoComprado: { id: number; nombre: string } | null = null;

    if (session?.userId) {
      // 1. Obtener el producto más reciente comprado por el usuario
      const [lastOrderRows]: any = await pool.execute(
        `SELECT p.id, p.nombre 
         FROM pedidos ped 
         JOIN pedido_items pi ON pi.pedido_id = ped.id 
         JOIN productos p ON p.id = pi.producto_id 
         WHERE ped.usuario_id = ? 
           AND ped.estado NOT IN ('borrador', 'cancelado', 'pago_fallido', 'expirado')
         ORDER BY ped.creado_en DESC, pi.id DESC 
         LIMIT 1`,
        [session.userId]
      );

      if (lastOrderRows && lastOrderRows.length > 0) {
        productoComprado = {
          id: Number(lastOrderRows[0].id),
          nombre: lastOrderRows[0].nombre,
        };
      }
    }

    // Si hay producto comprado, buscar relacionados con stock > 0
    if (productoComprado) {
      const [relRows]: any = await pool.execute(
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
         FROM productos_relacionados pr
         JOIN productos p ON p.id = pr.relacionado_id
         JOIN categorias c ON c.id = p.categoria_id
         LEFT JOIN inventario i ON i.producto_id = p.id
         WHERE pr.producto_id = ? AND p.activo = 1
         GROUP BY p.id
         HAVING total_stock > 0
         ORDER BY pr.prioridad ASC
         LIMIT 4`,
        [productoComprado.id]
      );

      let productos = relRows || [];

      // Si hay menos de 4, completar con productos de la misma categoría con stock
      if (productos.length < 4) {
        const existingIds = [productoComprado.id, ...productos.map((p: any) => p.id)];
        const placeholders = existingIds.map(() => "?").join(",");
        const limitNeeded = 4 - productos.length;

        const [catRows]: any = await pool.execute(
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
           LEFT JOIN inventario i ON i.producto_id = p.id
           WHERE p.id NOT IN (${placeholders}) AND p.activo = 1
           GROUP BY p.id
           HAVING total_stock > 0
           ORDER BY p.id ASC
           LIMIT ${limitNeeded}`,
          existingIds
        );

        productos = [...productos, ...(catRows || [])];
      }

      return NextResponse.json({
        tipo: "comprado",
        titulo: `Porque compraste ${productoComprado.nombre}`,
        productoComprado: productoComprado.nombre,
        productos: productos.map(formatProduct),
      });
    }

    // Si no hay sesión o no hay compras: "Más vendidos"
    const [bestSellerRows]: any = await pool.execute(
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
       LEFT JOIN inventario i ON i.producto_id = p.id
       WHERE p.activo = 1
       GROUP BY p.id
       HAVING total_stock > 0
       ORDER BY p.id ASC
       LIMIT 4`
    );

    return NextResponse.json({
      tipo: "mas_vendidos",
      titulo: "Más vendidos",
      productoComprado: null,
      productos: (bestSellerRows || []).map(formatProduct),
    });
  } catch (error: any) {
    console.error("[RELACIONADOS ERROR]:", error);
    return NextResponse.json({ error: error.message, productos: [] }, { status: 500 });
  }
}

function formatProduct(r: any) {
  return {
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
  };
}

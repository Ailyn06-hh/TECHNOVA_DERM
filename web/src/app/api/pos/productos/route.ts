import { NextRequest, NextResponse } from "next/server";
import { getDispositivoFromRequest, getPosSessionFromRequest } from "@/lib/pos-session";
import { getDbPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const dispositivo = await getDispositivoFromRequest(req);
    const session = await getPosSessionFromRequest(req);

    if (!dispositivo || !session) {
      return NextResponse.json(
        { error: "Sesión o terminal POS no válida.", redirect: "/pos" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const categoria = (searchParams.get("categoria") || "todos").toLowerCase().trim();
    const q = (searchParams.get("q") || "").trim();

    const pool = getDbPool();

    // Caso Especial: Pestaña "Combos"
    if (categoria === "combos") {
      const [comboRows]: any = await pool.execute(
        `SELECT id, nombre, slug, descripcion_corta, descuento_porcentaje, color_fondo, activo
         FROM combos
         WHERE activo = 1
         ORDER BY id ASC`
      );

      const combos = [];
      for (const cb of comboRows || []) {
        // Consultar productos componentes del combo y su stock en esta sucursal
        const [cpRows]: any = await pool.execute(
          `SELECT cp.producto_id, cp.cantidad, p.nombre, p.precio, p.precio_especial,
                  p.color_fondo, p.color_frasco,
                  COALESCE(i.existencias, 0) as stock_tienda
           FROM combo_productos cp
           JOIN productos p ON p.id = cp.producto_id
           LEFT JOIN inventario i ON i.producto_id = cp.producto_id AND i.sucursal_id = ?
           WHERE cp.combo_id = ?`,
          [dispositivo.sucursalId, cb.id]
        );

        const productosCombo: any[] = cpRows || [];
        let subtotalBase = 0;
        let maxCombosPosibles = 9999;

        for (const p of productosCombo) {
          const pUnit = Number(p.precio_especial ?? p.precio);
          subtotalBase += pUnit * Number(p.cantidad);
          const posibles = Math.floor(Number(p.stock_tienda) / Number(p.cantidad || 1));
          if (posibles < maxCombosPosibles) {
            maxCombosPosibles = posibles;
          }
        }

        if (productosCombo.length === 0) maxCombosPosibles = 0;

        const descPct = Number(cb.descuento_porcentaje || 0);
        const precioConDescuento = Math.round(subtotalBase * (1 - descPct / 100) * 100) / 100;

        combos.push({
          id: cb.id,
          tipoItem: "combo",
          nombre: cb.nombre,
          slug: cb.slug,
          descripcion: cb.descripcion_corta,
          descuento_porcentaje: descPct,
          precio_lista: subtotalBase,
          precio: precioConDescuento,
          color_fondo: cb.color_fondo || "#FDF2F4",
          color_frasco: "#6B1F4A",
          stock_tienda: maxCombosPosibles,
          productos: productosCombo,
        });
      }

      return NextResponse.json({
        exito: true,
        categoria: "combos",
        combos,
      });
    }

    // Consulta normal de Productos individuales
    let sql = `
      SELECT 
        p.id,
        p.sku,
        p.codigo_barras,
        p.nombre,
        p.slug,
        p.categoria_id,
        c.nombre as categoria_nombre,
        c.slug as categoria_slug,
        p.tipo_rutina,
        p.precio,
        p.precio_especial,
        p.color_fondo,
        p.color_frasco,
        p.activo,
        COALESCE(i.existencias, 0) as stock_tienda
      FROM productos p
      JOIN categorias c ON c.id = p.categoria_id
      LEFT JOIN inventario i ON i.producto_id = p.id AND i.sucursal_id = ?
      WHERE p.activo = 1
    `;
    const params: any[] = [dispositivo.sucursalId];

    // Filtro por categoría (si no es 'todos')
    if (categoria && categoria !== "todos") {
      sql += ` AND (c.slug = ? OR c.nombre LIKE ? OR p.tipo_rutina = ?)`;
      params.push(categoria, `%${categoria}%`, categoria);
    }

    // Filtro de búsqueda por texto o código de barras
    if (q) {
      sql += ` AND (p.codigo_barras = ? OR p.sku LIKE ? OR p.nombre LIKE ?)`;
      params.push(q, `%${q}%`, `%${q}%`);
    }

    sql += ` ORDER BY p.id ASC`;

    const [rows]: any = await pool.execute(sql, params);
    const productos = (rows || []).map((p: any) => ({
      id: Number(p.id),
      tipoItem: "producto",
      sku: p.sku,
      codigo_barras: p.codigo_barras,
      nombre: p.nombre,
      slug: p.slug,
      categoriaId: Number(p.categoria_id),
      categoriaNombre: p.categoria_nombre,
      categoriaSlug: p.categoria_slug,
      tipoRutina: p.tipo_rutina,
      precio: Number(p.precio),
      precio_especial: p.precio_especial !== null ? Number(p.precio_especial) : null,
      color_fondo: p.color_fondo || "#F3E1E4",
      color_frasco: p.color_frasco || "#D08C98",
      stock_tienda: Number(p.stock_tienda),
    }));

    return NextResponse.json({
      exito: true,
      categoria,
      productos,
    });
  } catch (error: any) {
    console.error("[GET /api/pos/productos Error]:", error);
    return NextResponse.json(
      { error: "Error al consultar catálogo de productos", details: error.message },
      { status: 500 }
    );
  }
}

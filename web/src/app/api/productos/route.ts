import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getAuthUserFromRequest } from "@/lib/session";
import { getSucursalRecogerHoy } from "@/lib/sucursal";
import { TIPOS_PIEL, PRESUPUESTOS } from "@/lib/perfilPiel";

export const dynamic = "force-dynamic";

// Whitelist de órdenes permitidos
const ORDENES_PERMITIDOS = [
  "mas_vendidos",
  "recomendados",
  "precio_asc",
  "precio_desc",
  "novedades",
] as const;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pool = getDbPool();

    // 1. Obtener sucursal para "Recoger hoy"
    const sucursal = await getSucursalRecogerHoy(req);

    // 2. Extraer y sanear parámetros
    const q = (searchParams.get("q") || "").trim();
    const categoriaRaw = (searchParams.get("categoria") || "").trim();
    const tipoPielRaw = (searchParams.get("tipo_piel") || "").trim();
    const precioRaw = (searchParams.get("precio") || "").trim();
    const disponibilidadRaw = (searchParams.get("disponibilidad") || "").trim();
    const ordenParam = (searchParams.get("orden") || "").trim();
    const pagina = Math.max(1, parseInt(searchParams.get("pagina") || "1", 10));
    const limiteParam = parseInt(searchParams.get("limite") || "12", 10);
    const limite = Math.min(100, Math.max(1, isNaN(limiteParam) ? 12 : limiteParam));
    const acumular = searchParams.get("acumular") === "true";

    // Parsear listas separadas por coma
    const categoriasSeleccionadas = categoriaRaw
      ? categoriaRaw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
      : [];

    const tiposPielSeleccionados = tipoPielRaw
      ? tipoPielRaw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
      : [];

    const preciosSeleccionados = precioRaw
      ? precioRaw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
      : [];

    const disponibilidadesSeleccionadas = disponibilidadRaw
      ? disponibilidadRaw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
      : [];

    // Orden válido
    const orden = ORDENES_PERMITIDOS.includes(ordenParam as any)
      ? ordenParam
      : "mas_vendidos";

    // 3. Obtener información de usuario / perfil para "recomendados" si aplica
    const session = getAuthUserFromRequest(req);
    let userSkinType: string | null = null;
    let userConcerns: string[] = [];

    if (session?.userId) {
      const [profileRows]: any = await pool.execute(
        "SELECT id, tipo_piel FROM perfiles_piel WHERE usuario_id = ? LIMIT 1",
        [session.userId]
      );
      if (profileRows && profileRows.length > 0) {
        userSkinType = profileRows[0].tipo_piel;
        const [concernsRows]: any = await pool.execute(
          "SELECT preocupacion FROM perfil_preocupaciones WHERE perfil_id = ?",
          [profileRows[0].id]
        );
        userConcerns = (concernsRows || []).map((c: any) => c.preocupacion);
      }
    }

    // 4. Construir cláusulas de filtros (helper reutilizable)
    const buildFilterClauses = (
      excludeGroup?: "categoria" | "tipo_piel" | "precio" | "disponibilidad"
    ) => {
      const clauses: string[] = ["p.activo = 1"];
      const params: any[] = [];

      // Búsqueda q (nombre, categoría, descripción)
      if (q) {
        clauses.push(`(
          p.nombre LIKE ? OR 
          c.nombre LIKE ? OR 
          p.descripcion LIKE ?
        )`);
        const searchPattern = `%${q}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      // Filtro Categoría (OR dentro del grupo)
      if (excludeGroup !== "categoria" && categoriasSeleccionadas.length > 0) {
        const catPlaceholders = categoriasSeleccionadas.map(() => "?").join(",");
        clauses.push(`c.slug IN (${catPlaceholders})`);
        params.push(...categoriasSeleccionadas);
      }

      // Filtro Tipo de piel (OR dentro del grupo)
      if (excludeGroup !== "tipo_piel" && tiposPielSeleccionados.length > 0) {
        const pielPlaceholders = tiposPielSeleccionados.map(() => "?").join(",");
        clauses.push(`EXISTS (
          SELECT 1 FROM producto_tipos_piel ptp 
          WHERE ptp.producto_id = p.id AND ptp.tipo_piel IN (${pielPlaceholders})
        )`);
        params.push(...tiposPielSeleccionados);
      }

      // Filtro Precio (OR dentro del grupo)
      if (excludeGroup !== "precio" && preciosSeleccionados.length > 0) {
        const priceOrs: string[] = [];
        for (const pKey of preciosSeleccionados) {
          if (pKey === "bajo") {
            priceOrs.push("COALESCE(p.precio_especial, p.precio) <= 250");
          } else if (pKey === "medio") {
            priceOrs.push("(COALESCE(p.precio_especial, p.precio) > 250 AND COALESCE(p.precio_especial, p.precio) <= 450)");
          } else if (pKey === "alto") {
            priceOrs.push("COALESCE(p.precio_especial, p.precio) > 450");
          }
        }
        if (priceOrs.length > 0) {
          clauses.push(`(${priceOrs.join(" OR ")})`);
        }
      }

      // Filtro Disponibilidad (OR dentro del grupo)
      if (excludeGroup !== "disponibilidad" && disponibilidadesSeleccionadas.length > 0) {
        const dispOrs: string[] = [];
        for (const dKey of disponibilidadesSeleccionadas) {
          if (dKey === "recoger") {
            dispOrs.push(`EXISTS (
              SELECT 1 FROM inventario i_disp 
              WHERE i_disp.producto_id = p.id AND i_disp.sucursal_id = ? AND i_disp.existencias > 0
            )`);
            params.push(sucursal.id);
          } else if (dKey === "envio") {
            dispOrs.push(`(
              SELECT COALESCE(SUM(i_env.existencias), 0) 
              FROM inventario i_env 
              WHERE i_env.producto_id = p.id
            ) > 0`);
          }
        }
        if (dispOrs.length > 0) {
          clauses.push(`(${dispOrs.join(" OR ")})`);
        }
      }

      return {
        whereSql: clauses.join(" AND "),
        params,
      };
    }

    // 5. Consulta Principal de Productos
    const mainFilters = buildFilterClauses();

    // Contar total con los filtros actuales
    const [countRows]: any = await pool.execute(
      `SELECT COUNT(DISTINCT p.id) as total
       FROM productos p
       JOIN categorias c ON c.id = p.categoria_id
       WHERE ${mainFilters.whereSql}`,
      mainFilters.params
    );
    const total = Number(countRows[0]?.total || 0);

    // Determinar ordenamiento
    let orderClause = "";
    const orderParams: any[] = [];

    // Prioridad por stock general: si no hay filtro de disponibilidad, agotados al final
    const stockSort = disponibilidadesSeleccionadas.length === 0
      ? "(total_stock > 0) DESC, "
      : "";

    if (q && !searchParams.has("orden")) {
      // Relevancia por búsqueda: nombre primero
      orderClause = `${stockSort}CASE 
        WHEN p.nombre LIKE ? THEN 1 
        WHEN p.nombre LIKE ? THEN 2 
        ELSE 3 
      END ASC, p.id ASC`;
      orderParams.push(`${q}%`, `%${q}%`);
    } else {
      switch (orden) {
        case "precio_asc":
          orderClause = `${stockSort}COALESCE(p.precio_especial, p.precio) ASC, p.id ASC`;
          break;
        case "precio_desc":
          orderClause = `${stockSort}COALESCE(p.precio_especial, p.precio) DESC, p.id ASC`;
          break;
        case "novedades":
          orderClause = `${stockSort}p.creado_en DESC, p.id DESC`;
          break;
        case "recomendados":
          if (userSkinType) {
            orderClause = `${stockSort}(
              EXISTS (SELECT 1 FROM producto_tipos_piel ptp WHERE ptp.producto_id = p.id AND ptp.tipo_piel = ?)
            ) DESC, p.id ASC`;
            orderParams.push(userSkinType);
          } else {
            orderClause = `${stockSort}COALESCE(ventas_recientes, 0) DESC, p.id ASC`;
          }
          break;
        case "mas_vendidos":
        default:
          orderClause = `${stockSort}COALESCE(ventas_recientes, 0) DESC, p.id ASC`;
          break;
      }
    }

    // Límite y Offset
    // Si acumular es true (o página directa > 1), devolver desde 0 hasta (pagina * limite)
    const effectiveLimit = acumular ? pagina * limite : limite;
    const effectiveOffset = acumular ? 0 : (pagina - 1) * limite;

    const querySql = `
      SELECT 
        p.id, 
        p.sku, 
        p.nombre, 
        p.slug, 
        p.categoria_id, 
        p.tipo_rutina,
        p.descripcion, 
        p.precio, 
        p.precio_especial, 
        p.color_fondo, 
        p.color_frasco, 
        p.imagen_url,
        p.creado_en,
        c.nombre as categoria_nombre,
        c.slug as categoria_slug,
        COALESCE(SUM(i.existencias), 0) as total_stock,
        COALESCE((
          SELECT SUM(pi.cantidad)
          FROM pedido_items pi
          JOIN pedidos ped ON ped.id = pi.pedido_id
          WHERE pi.producto_id = p.id AND ped.creado_en >= DATE_SUB(NOW(), INTERVAL 90 DAY)
        ), 0) as ventas_recientes,
        DATEDIFF(NOW(), p.creado_en) as dias_desde_creacion
      FROM productos p
      JOIN categorias c ON c.id = p.categoria_id
      LEFT JOIN inventario i ON i.producto_id = p.id
      WHERE ${mainFilters.whereSql}
      GROUP BY p.id
      ORDER BY ${orderClause}
      LIMIT ${Number(effectiveLimit)} OFFSET ${Number(effectiveOffset)}
    `;

    const combinedParams = [...mainFilters.params, ...orderParams];
    const [rows]: any = await pool.execute(querySql, combinedParams);

    // Mapear productos con sus etiquetas de prioridad
    const productos = (rows || []).map((r: any) => {
      const totalStock = Number(r.total_stock);
      const precio = Number(r.precio);
      const precioEspecial = r.precio_especial ? Number(r.precio_especial) : null;
      const diasCreacion = Number(r.dias_desde_creacion ?? 999);

      // Una sola etiqueta por tarjeta con el orden estricto de prioridad:
      // 1. Stock 1 a 5: "Última pieza" o "Quedan N" (amarillo)
      // 2. Precio especial si existe (rosa)
      // 3. Nuevo si se creó en los últimos 30 días (verde)
      let badge: string | undefined;
      let badgeColor: "amber" | "rose" | "emerald" | undefined;

      if (totalStock >= 1 && totalStock <= 5) {
        badge = totalStock === 1 ? "Última pieza" : `Quedan ${totalStock}`;
        badgeColor = "amber";
      } else if (precioEspecial && precioEspecial < precio) {
        badge = "Precio especial";
        badgeColor = "rose";
      } else if (diasCreacion <= 30) {
        badge = "Nuevo";
        badgeColor = "emerald";
      }

      return {
        id: Number(r.id),
        sku: r.sku,
        nombre: r.nombre,
        slug: r.slug,
        categoria_nombre: r.categoria_nombre,
        categoria_slug: r.categoria_slug,
        tipo_rutina: r.tipo_rutina,
        descripcion: r.descripcion,
        precio,
        precio_especial: precioEspecial,
        color_fondo: r.color_fondo,
        color_frasco: r.color_frasco,
        imagen_url: r.imagen_url,
        total_stock: totalStock,
        badge,
        badge_color: badgeColor,
      };
    });

    const hayMas = effectiveOffset + productos.length < total;

    // 6. Facet Counts (Conteos para cada grupo de filtros con los demás filtros aplicados)

    // A) Categorías
    const catFilter = buildFilterClauses("categoria");
    const [catCountsRows]: any = await pool.execute(
      `SELECT c.slug, COUNT(DISTINCT p.id) as count
       FROM productos p
       JOIN categorias c ON c.id = p.categoria_id
       WHERE ${catFilter.whereSql}
       GROUP BY c.slug`,
      catFilter.params
    );
    const conteosCategorias: Record<string, number> = {};
    for (const r of catCountsRows || []) {
      conteosCategorias[r.slug] = Number(r.count);
    }

    // B) Tipos de piel
    const pielFilter = buildFilterClauses("tipo_piel");
    const [pielCountsRows]: any = await pool.execute(
      `SELECT ptp.tipo_piel, COUNT(DISTINCT p.id) as count
       FROM productos p
       JOIN categorias c ON c.id = p.categoria_id
       JOIN producto_tipos_piel ptp ON ptp.producto_id = p.id
       WHERE ${pielFilter.whereSql}
       GROUP BY ptp.tipo_piel`,
      pielFilter.params
    );
    const conteosTiposPiel: Record<string, number> = {};
    for (const t of TIPOS_PIEL) {
      conteosTiposPiel[t.id] = 0;
    }
    for (const r of pielCountsRows || []) {
      conteosTiposPiel[r.tipo_piel] = Number(r.count);
    }

    // C) Rangos de precio
    const precioFilter = buildFilterClauses("precio");
    const [precioCountsRows]: any = await pool.execute(
      `SELECT 
        SUM(CASE WHEN COALESCE(p.precio_especial, p.precio) <= 250 THEN 1 ELSE 0 END) as bajo,
        SUM(CASE WHEN COALESCE(p.precio_especial, p.precio) > 250 AND COALESCE(p.precio_especial, p.precio) <= 450 THEN 1 ELSE 0 END) as medio,
        SUM(CASE WHEN COALESCE(p.precio_especial, p.precio) > 450 THEN 1 ELSE 0 END) as alto
       FROM productos p
       JOIN categorias c ON c.id = p.categoria_id
       WHERE ${precioFilter.whereSql}`,
      precioFilter.params
    );
    const pCounts = precioCountsRows?.[0] || {};
    const conteosPrecios: Record<string, number> = {
      bajo: Number(pCounts.bajo || 0),
      medio: Number(pCounts.medio || 0),
      alto: Number(pCounts.alto || 0),
    };

    // D) Disponibilidad
    const dispFilter = buildFilterClauses("disponibilidad");
    const [dispCountsRows]: any = await pool.execute(
      `SELECT 
        SUM(CASE WHEN EXISTS (
          SELECT 1 FROM inventario i_rec 
          WHERE i_rec.producto_id = p.id AND i_rec.sucursal_id = ? AND i_rec.existencias > 0
        ) THEN 1 ELSE 0 END) as recoger,
        SUM(CASE WHEN (
          SELECT COALESCE(SUM(i_env.existencias), 0) 
          FROM inventario i_env 
          WHERE i_env.producto_id = p.id
        ) > 0 THEN 1 ELSE 0 END) as envio
       FROM productos p
       JOIN categorias c ON c.id = p.categoria_id
       WHERE ${dispFilter.whereSql}`,
      [sucursal.id, ...dispFilter.params]
    );
    const dCounts = dispCountsRows?.[0] || {};
    const conteosDisponibilidad: Record<string, number> = {
      recoger: Number(dCounts.recoger || 0),
      envio: Number(dCounts.envio || 0),
    };

    return NextResponse.json({
      productos,
      total,
      hayMas,
      pagina,
      conteos: {
        categorias: conteosCategorias,
        tipos_piel: conteosTiposPiel,
        precios: conteosPrecios,
        disponibilidad: conteosDisponibilidad,
      },
      sucursal,
      userSkinType,
    });
  } catch (error: any) {
    console.error("Error en GET /api/productos:", error);
    return NextResponse.json(
      { error: "Error al consultar catálogo de productos", details: error.message },
      { status: 500 }
    );
  }
}

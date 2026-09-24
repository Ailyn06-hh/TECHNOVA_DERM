import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import {
  DIAS_DEVOLUCION,
  DIAS_PARA_FACTURAR,
  COSTO_ENVIO,
  ENVIO_GRATIS_DESDE,
  DIAS_ENVIO,
} from "@/lib/marca";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const temaSlug = searchParams.get("tema")?.trim();
    const query = searchParams.get("q")?.trim();

    const pool = getDbPool();

    // 1. Obtener minutos de preparación de la sucursal principal
    const [sucRows]: any = await pool.execute(
      "SELECT minutos_preparacion FROM sucursales WHERE activa = 1 ORDER BY id ASC LIMIT 1"
    );
    const minutosPreparacion = Number(sucRows?.[0]?.minutos_preparacion || 60);

    // 2. Obtener temas
    const [temasRows]: any = await pool.execute(
      "SELECT id, slug, nombre, descripcion, icono, orden FROM ayuda_temas ORDER BY orden ASC"
    );

    // 3. Construir consulta de artículos
    let articulosSql = `
      SELECT a.id, a.tema_id, t.slug as tema_slug, t.nombre as tema_nombre,
             a.slug, a.pregunta, a.respuesta, a.destacado, a.orden,
             a.util_si, a.util_no
      FROM ayuda_articulos a
      JOIN ayuda_temas t ON a.tema_id = t.id
      WHERE a.activo = 1
    `;
    const params: any[] = [];

    if (query && query.length >= 2) {
      articulosSql += ` AND (LOWER(a.pregunta) LIKE LOWER(?) OR LOWER(a.respuesta) LIKE LOWER(?))`;
      params.push(`%${query}%`, `%${query}%`);
    } else if (temaSlug) {
      articulosSql += ` AND t.slug = ?`;
      params.push(temaSlug);
    }

    articulosSql += ` ORDER BY a.destacado DESC, a.orden ASC, (a.util_si - a.util_no) DESC`;

    const [artRows]: any = await pool.execute(articulosSql, params);

    // Función auxiliar para reemplazar variables en las respuestas
    const reemplazarVariables = (texto: string) => {
      if (!texto) return "";
      return texto
        .replace(/\{\{DIAS_DEVOLUCION\}\}/g, String(DIAS_DEVOLUCION))
        .replace(/\{\{DIAS_PARA_FACTURAR\}\}/g, String(DIAS_PARA_FACTURAR))
        .replace(/\{\{COSTO_ENVIO\}\}/g, String(COSTO_ENVIO))
        .replace(/\{\{ENVIO_GRATIS_DESDE\}\}/g, ENVIO_GRATIS_DESDE.toLocaleString("es-MX"))
        .replace(/\{\{DIAS_ENVIO\}\}/g, DIAS_ENVIO)
        .replace(/\{\{MINUTOS_PREPARACION\}\}/g, String(minutosPreparacion));
    };

    const articulos = artRows.map((r: any) => ({
      id: r.id,
      temaId: r.tema_id,
      temaSlug: r.tema_slug,
      temaNombre: r.tema_nombre,
      slug: r.slug,
      pregunta: r.pregunta,
      respuesta: reemplazarVariables(r.respuesta),
      destacado: Number(r.destacado) === 1,
      orden: r.orden,
      utilSi: Number(r.util_si || 0),
      utilNo: Number(r.util_no || 0),
    }));

    return NextResponse.json({
      exito: true,
      success: true,
      temas: temasRows,
      articulos,
      filtroTema: temaSlug || null,
      busqueda: query || null,
      totalResultados: articulos.length,
    });
  } catch (error: any) {
    console.error("[GET /api/ayuda Error]:", error);
    return NextResponse.json(
      { error: "Error al consultar centro de ayuda", details: error.message },
      { status: 500 }
    );
  }
}

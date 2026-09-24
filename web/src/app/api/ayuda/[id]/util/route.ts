import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const articuloId = Number(params.id);
    if (!articuloId || isNaN(articuloId)) {
      return NextResponse.json({ error: "ID de artículo inválido" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { util, voto } = body;

    const esUtil = util === true || voto === "si" || voto === true;
    const columna = esUtil ? "util_si" : "util_no";

    const pool = getDbPool();

    const [updateResult]: any = await pool.execute(
      `UPDATE ayuda_articulos 
       SET ${columna} = ${columna} + 1 
       WHERE id = ? AND activo = 1`,
      [articuloId]
    );

    if (updateResult.affectedRows === 0) {
      return NextResponse.json({ error: "Artículo no encontrado o inactivo" }, { status: 404 });
    }

    const [rows]: any = await pool.execute(
      "SELECT util_si, util_no FROM ayuda_articulos WHERE id = ?",
      [articuloId]
    );

    return NextResponse.json({
      exito: true,
      success: true,
      mensaje: esUtil ? "¡Gracias por tus comentarios!" : "Agradecemos tu retroalimentación.",
      articuloId,
      utilSi: Number(rows[0]?.util_si || 0),
      utilNo: Number(rows[0]?.util_no || 0),
    });
  } catch (error: any) {
    console.error("[POST /api/ayuda/[id]/util Error]:", error);
    return NextResponse.json(
      { error: "Error al registrar voto", details: error.message },
      { status: 500 }
    );
  }
}

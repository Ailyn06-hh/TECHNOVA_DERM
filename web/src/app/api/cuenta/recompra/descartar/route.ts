import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/session";
import { getDbPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = getAuthUserFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { productoId } = body;

    const pId = Number(productoId);
    if (!pId || isNaN(pId)) {
      return NextResponse.json({ error: "ID de producto inválido" }, { status: 400 });
    }

    const pool = getDbPool();

    // Guardar en recompras_descartadas por 30 días
    await pool.execute(
      `INSERT INTO recompras_descartadas (usuario_id, producto_id, hasta) 
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))
       ON DUPLICATE KEY UPDATE hasta = DATE_ADD(NOW(), INTERVAL 30 DAY)`,
      [session.userId, pId]
    );

    return NextResponse.json({
      success: true,
      exito: true,
      message: "Sugerencia descartada por 30 días",
    });
  } catch (error: any) {
    console.error("[POST /api/cuenta/recompra/descartar Error]:", error);
    return NextResponse.json(
      { error: "Error al descartar sugerencia", message: error.message },
      { status: 500 }
    );
  }
}

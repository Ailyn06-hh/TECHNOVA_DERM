import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/session";
import { getDbPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = getAuthUserFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const pool = getDbPool();

    const [result]: any = await pool.execute(
      `UPDATE notificaciones 
       SET leida = 1, leida_en = NOW() 
       WHERE usuario_id = ? AND leida = 0`,
      [session.userId]
    );

    return NextResponse.json({
      success: true,
      exito: true,
      mensaje: "Todas las notificaciones han sido marcadas como leídas",
      actualizadas: result.affectedRows,
    });
  } catch (error: any) {
    console.error("[POST /api/cuenta/notificaciones/leer-todas Error]:", error);
    return NextResponse.json(
      { error: "Error al marcar notificaciones", details: error.message },
      { status: 500 }
    );
  }
}

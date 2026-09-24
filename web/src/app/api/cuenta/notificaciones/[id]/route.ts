import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/session";
import { getDbPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getAuthUserFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const notifId = Number(params.id);
    if (!notifId || isNaN(notifId)) {
      return NextResponse.json({ error: "ID de notificación inválido" }, { status: 400 });
    }

    const pool = getDbPool();

    // Marcar como leída únicamente si pertenece al usuario en sesión
    const [result]: any = await pool.execute(
      `UPDATE notificaciones 
       SET leida = 1, leida_en = NOW() 
       WHERE id = ? AND usuario_id = ? AND leida = 0`,
      [notifId, session.userId]
    );

    return NextResponse.json({
      success: true,
      exito: true,
      mensaje: "Notificación marcada como leída",
      modificada: result.affectedRows > 0,
    });
  } catch (error: any) {
    console.error("[PATCH /api/cuenta/notificaciones/[id] Error]:", error);
    return NextResponse.json(
      { error: "Error al actualizar notificación", details: error.message },
      { status: 500 }
    );
  }
}

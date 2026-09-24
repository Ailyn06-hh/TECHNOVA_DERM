import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getAuthUserFromRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = getAuthUserFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json({ unreadCount: 0, notificaciones: [] }, { status: 200 });
    }

    const pool = getDbPool();

    // 1. Contar no leídas
    const [countRows]: any = await pool.execute(
      "SELECT COUNT(*) as unread_count FROM notificaciones WHERE usuario_id = ? AND leida = 0",
      [session.userId]
    );

    const unreadCount = Number(countRows[0]?.unread_count || 0);

    // 2. Obtener las últimas 5 notificaciones
    const [rows]: any = await pool.execute(
      `SELECT id, titulo, mensaje, leida, creado_en 
       FROM notificaciones 
       WHERE usuario_id = ? 
       ORDER BY creado_en DESC 
       LIMIT 5`,
      [session.userId]
    );

    return NextResponse.json({
      unreadCount,
      notificaciones: rows || [],
    });
  } catch (error: any) {
    console.error("[NOTIFICACIONES GET ERROR]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getAuthUserFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const pool = getDbPool();

    // Marcar todas como leídas para este usuario
    await pool.execute(
      "UPDATE notificaciones SET leida = 1 WHERE usuario_id = ? AND leida = 0",
      [session.userId]
    );

    return NextResponse.json({ success: true, message: "Notificaciones marcadas como leídas" });
  } catch (error: any) {
    console.error("[NOTIFICACIONES POST ERROR]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

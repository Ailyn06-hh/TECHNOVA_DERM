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

    const body = await req.json().catch(() => ({}));
    const { endpoint } = body;

    const pool = getDbPool();

    if (endpoint) {
      await pool.execute(
        "DELETE FROM suscripciones_push WHERE usuario_id = ? AND endpoint = ?",
        [session.userId, endpoint]
      );
    } else {
      await pool.execute(
        "DELETE FROM suscripciones_push WHERE usuario_id = ?",
        [session.userId]
      );
    }

    return NextResponse.json({
      success: true,
      exito: true,
      mensaje: "Suscripción push eliminada exitosamente",
    });
  } catch (error: any) {
    console.error("[POST /api/cuenta/push/desuscribir Error]:", error);
    return NextResponse.json(
      { error: "Error al desuscribir push", details: error.message },
      { status: 500 }
    );
  }
}

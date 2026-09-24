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
    const { endpoint, keys, navegador } = body;

    if (!endpoint || typeof endpoint !== "string") {
      return NextResponse.json({ error: "Endpoint inválido" }, { status: 400 });
    }

    const p256dh = keys?.p256dh;
    const auth = keys?.auth;

    if (!p256dh || !auth) {
      return NextResponse.json({ error: "Claves criptográficas de la suscripción incompletas" }, { status: 400 });
    }

    const pool = getDbPool();

    await pool.execute(
      `INSERT INTO suscripciones_push (usuario_id, endpoint, p256dh, auth, navegador, creado_en)
       VALUES (?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE 
         usuario_id = VALUES(usuario_id),
         p256dh = VALUES(p256dh),
         auth = VALUES(auth),
         navegador = VALUES(navegador)`,
      [session.userId, endpoint, p256dh, auth, navegador || "Navegador Web"]
    );

    return NextResponse.json({
      success: true,
      exito: true,
      mensaje: "Suscripción push guardada exitosamente",
    });
  } catch (error: any) {
    console.error("[POST /api/cuenta/push/suscribir Error]:", error);
    return NextResponse.json(
      { error: "Error al guardar suscripción push", details: error.message },
      { status: 500 }
    );
  }
}

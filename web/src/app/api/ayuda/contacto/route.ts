import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/session";
import { getDbPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUserFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { correo, asunto, mensaje, pedido_id } = body;

    const correoFinal = user?.correo || (correo && String(correo).trim().toLowerCase());
    if (!correoFinal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoFinal)) {
      return NextResponse.json({ error: "Ingresa un correo electrónico válido." }, { status: 400 });
    }

    const asuntoFinal = asunto ? String(asunto).trim() : "Consulta general de soporte";
    const mensajeFinal = mensaje ? String(mensaje).trim() : "";

    if (!mensajeFinal || mensajeFinal.length < 5) {
      return NextResponse.json(
        { error: "Por favor describe tu consulta con al menos 5 caracteres." },
        { status: 400 }
      );
    }

    const pool = getDbPool();

    const [result]: any = await pool.execute(
      `INSERT INTO tickets_soporte (usuario_id, correo, asunto, mensaje, pedido_id, estado, creado_en)
       VALUES (?, ?, ?, ?, ?, 'abierto', NOW())`,
      [user?.userId || null, correoFinal, asuntoFinal, mensajeFinal, pedido_id || null]
    );

    const ticketId = result.insertId;

    return NextResponse.json({
      exito: true,
      success: true,
      mensaje: "Tu ticket ha sido registrado. Un agente de soporte te responderá a la brevedad.",
      ticketId,
    });
  } catch (error: any) {
    console.error("[POST /api/ayuda/contacto Error]:", error);
    return NextResponse.json(
      { error: "Error al enviar mensaje de soporte", details: error.message },
      { status: 500 }
    );
  }
}

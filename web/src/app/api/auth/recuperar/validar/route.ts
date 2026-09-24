import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getDbPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token || typeof token !== "string" || token.length < 32) {
      return NextResponse.json(
        { valid: false, error: "El token es inválido o no fue proporcionado." },
        { status: 400 }
      );
    }

    const pool = getDbPool();
    // Hashear con SHA-256 para buscar en la base de datos
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const [rows]: any = await pool.execute(
      `SELECT r.id, r.expira_en, r.usado, u.nombre, u.apellido, u.correo 
       FROM restablecimientos_password r
       INNER JOIN usuarios u ON u.id = r.usuario_id
       WHERE r.token_hash = ? AND r.usado = 0 
       ORDER BY r.id DESC LIMIT 1`,
      [tokenHash]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        {
          valid: false,
          error: "Este enlace de recuperación es inválido o ya ha sido utilizado.",
        },
        { status: 404 }
      );
    }

    const record = rows[0];
    const now = new Date();
    const expiresAt = new Date(record.expira_en);

    if (now > expiresAt) {
      // Marcar expirado como usado para limpieza
      await pool.execute(
        "UPDATE restablecimientos_password SET usado = 1 WHERE id = ?",
        [record.id]
      );
      return NextResponse.json(
        {
          valid: false,
          error: "El enlace de recuperación ha expirado (vigencia de 30 minutos).",
        },
        { status: 410 }
      );
    }

    return NextResponse.json(
      {
        valid: true,
        nombre: record.nombre,
        apellido: record.apellido,
        correo: record.correo,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[API VALIDAR TOKEN ERROR]:", error);
    return NextResponse.json(
      { valid: false, error: "Error interno al validar el token." },
      { status: 500 }
    );
  }
}

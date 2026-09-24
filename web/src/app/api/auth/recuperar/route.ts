import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { getDbPool } from "@/lib/db";
import { normalizarIdentificador, MENSAJES_VALIDACION } from "@/lib/validaciones";
import { sendPasswordResetEmail } from "@/lib/mailer";

// Respuesta genérica idéntica para cumplir con el estándar de anti-enumeración de usuarios
const GENERIC_SUCCESS_RESPONSE = {
  success: true,
  message: "Listo. El enlace vence en 30 minutos.",
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier } = body;

    const norm = normalizarIdentificador(identifier);
    if (!norm.esValido) {
      return NextResponse.json(
        { error: MENSAJES_VALIDACION.IDENTIFICADOR_INVALIDO },
        { status: 400 }
      );
    }

    const pool = getDbPool();
    const cleanVal = norm.valor;

    // 1. Buscar usuario por correo o celular normalizado
    const [rows]: any = await pool.execute(
      `SELECT id, nombre, apellido, correo, celular, password_hash 
       FROM usuarios 
       WHERE correo = ? OR (celular = ? AND ? != '') 
       LIMIT 1`,
      [cleanVal, cleanVal, cleanVal]
    );

    // 2. Si el usuario no existe: simular trabajo criptográfico para mitigar timing attacks
    if (!rows || rows.length === 0) {
      await bcrypt.compare(
        "dummy-timing-password",
        "$2a$10$7EqJtq98hPqEX7fNZaFWoO0LqgP2Lw5jO8L7vC9GZJ1.M7n0O7A5m"
      );
      // Retornar siempre éxito (anti-enumeración)
      return NextResponse.json(GENERIC_SUCCESS_RESPONSE, { status: 200 });
    }

    const user = rows[0];

    // 3. Rate limiting en el servidor: máximo 3 solicitudes por cuenta cada 15 minutos
    const [rateRows]: any = await pool.execute(
      `SELECT COUNT(*) as total 
       FROM restablecimientos_password 
       WHERE usuario_id = ? AND creado_en >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)`,
      [user.id]
    );

    const totalRecentRequests = rateRows[0]?.total || 0;
    if (totalRecentRequests >= 3) {
      console.warn(`[RATE LIMIT RECUPERAR] Límite de 3 solicitudes alcanzado para usuario ${user.id}`);
      // No generar nuevo token, pero mantener respuesta idéntica (anti-enumeración)
      return NextResponse.json(GENERIC_SUCCESS_RESPONSE, { status: 200 });
    }

    // 4. Invalidar tokens anteriores no usados de este usuario
    await pool.execute(
      "UPDATE restablecimientos_password SET usado = 1 WHERE usuario_id = ? AND usado = 0",
      [user.id]
    );

    // 5. Generar token de alta entropía con crypto.randomBytes(32) y hashearlo con SHA-256
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    // 6. Guardar en base de datos con vigencia de 30 minutos
    await pool.execute(
      `INSERT INTO restablecimientos_password 
        (usuario_id, token_hash, expira_en, usado) 
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE), 0)`,
      [user.id, tokenHash]
    );

    // 7. Construir enlace de recuperación
    const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
    const resetUrl = `${appUrl}/recuperar/nueva?token=${rawToken}`;

    // 8. Enviar correo al correo asociado a la cuenta
    await sendPasswordResetEmail({
      to: user.correo,
      resetUrl,
      nombre: user.nombre,
    });

    return NextResponse.json(GENERIC_SUCCESS_RESPONSE, { status: 200 });
  } catch (error: any) {
    console.error("[API RECUPERAR ERROR]:", error);
    return NextResponse.json(
      {
        error: "Ocurrió un error al procesar la solicitud. Por favor intenta de nuevo.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

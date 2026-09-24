import crypto from "crypto";
import bcrypt from "bcryptjs";
import { getDbPool } from "./db";
import { sendVerificationEmail } from "./mailer";

export interface PendingVerificationUser {
  userId: number;
  correo: string;
  nombre: string;
  apellido: string;
  celular: string;
  lastSentAt: number; // timestamp en ms
}

export const PENDING_COOKIE_NAME = "pending_verification";

/**
 * Genera un código criptográficamente seguro de exactamente 6 dígitos (admite ceros iniciales como 004821)
 */
export function generateSecureCode(): string {
  const num = crypto.randomInt(0, 1000000);
  return num.toString().padStart(6, "0");
}

/**
 * Codifica la información del usuario pendiente en Base64 para guardarla en una cookie httpOnly
 */
export function encodePendingUser(user: PendingVerificationUser): string {
  return Buffer.from(JSON.stringify(user)).toString("base64url");
}

/**
 * Decodifica la información del usuario pendiente desde la cookie
 */
export function decodePendingUser(cookieValue: string | undefined): PendingVerificationUser | null {
  if (!cookieValue) return null;
  try {
    const json = Buffer.from(cookieValue, "base64url").toString("utf-8");
    return JSON.parse(json) as PendingVerificationUser;
  } catch {
    return null;
  }
}

/**
 * Invalida códigos anteriores no usados, genera un nuevo código, lo guarda hasheado en MySQL
 * y lo envía por correo electrónico (o consola en dev).
 */
export async function createAndSendVerificationCode(
  userId: number,
  correo: string,
  nombre: string
): Promise<{ code: string; success: boolean }> {
  const pool = getDbPool();
  const rawCode = generateSecureCode();
  const codeHash = await bcrypt.hash(rawCode, 10);

  // 1. Invalidar códigos pendientes anteriores del usuario
  await pool.execute(
    "UPDATE codigos_verificacion SET usado = 1 WHERE usuario_id = ? AND usado = 0",
    [userId]
  );

  // 2. Insertar nuevo código con vigencia de 10 minutos
  await pool.execute(
    `INSERT INTO codigos_verificacion 
      (usuario_id, codigo_hash, expira_en, intentos, usado) 
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE), 0, 0)`,
    [userId, codeHash]
  );

  // 3. Enviar correo
  const mailResult = await sendVerificationEmail({
    to: correo,
    code: rawCode,
    nombre,
  });

  return { code: rawCode, success: mailResult.success };
}

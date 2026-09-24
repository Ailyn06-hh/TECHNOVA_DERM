import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export interface SessionUser {
  userId: number;
  correo: string;
  nombre: string;
  verificado: boolean;
}

export const AUTH_COOKIE_NAME = "auth_session";
const SESSION_SECRET = process.env.SESSION_SECRET || "technova_derm_secure_session_key_2026";

/**
 * Crea un token de sesión firmado para la cookie httpOnly
 */
export function createSessionToken(user: SessionUser): string {
  const dataStr = Buffer.from(JSON.stringify(user)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(dataStr)
    .digest("base64url");
  return `${dataStr}.${signature}`;
}

/**
 * Verifica y decodifica el token de sesión
 */
export function verifySessionToken(token: string | undefined): SessionUser | null {
  if (!token || !token.includes(".")) return null;

  try {
    const [dataStr, signature] = token.split(".");
    const expectedSig = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(dataStr)
      .digest("base64url");

    if (signature !== expectedSig) {
      return null;
    }

    const json = Buffer.from(dataStr, "base64url").toString("utf-8");
    return JSON.parse(json) as SessionUser;
  } catch {
    return null;
  }
}

/**
 * Obtiene el usuario autenticado desde una NextRequest (para API routes)
 */
export function getAuthUserFromRequest(req: NextRequest): SessionUser | null {
  const cookie = req.cookies.get(AUTH_COOKIE_NAME);
  return verifySessionToken(cookie?.value);
}

/**
 * Obtiene el usuario autenticado en componentes de servidor de Next.js
 */
export function getAuthUserServer(): SessionUser | null {
  const cookieStore = cookies();
  const cookie = cookieStore.get(AUTH_COOKIE_NAME);
  return verifySessionToken(cookie?.value);
}

/**
 * Aplica la cookie de sesión autenticada a una NextResponse
 */
export function setAuthSessionCookie(response: NextResponse, user: SessionUser): void {
  const token = createSessionToken(user);
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 días de sesión
  });
}

/**
 * Limpia la cookie de sesión autenticada
 */
export function clearAuthSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

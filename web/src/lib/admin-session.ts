import crypto from "crypto";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getDbPool } from "@/lib/db";

const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || process.env.SESSION_SECRET || "technova_derm_admin_secret_key_2026";
export const ADMIN_SESSION_COOKIE = "admin_sesion";

export interface AdminSessionData {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  rol: "admin" | "gerente";
  sucursales: number[]; // IDs de sucursales autorizadas (para gerente)
  loginEn: string;
}

/**
 * Firma los datos de sesión con HMAC SHA-256 para la cookie admin_sesion
 */
export function signAdminSession(data: AdminSessionData): string {
  const dataStr = Buffer.from(JSON.stringify(data)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", ADMIN_SESSION_SECRET)
    .update(dataStr)
    .digest("base64url");
  return `${dataStr}.${signature}`;
}

/**
 * Valida la firma del token de sesión de administración
 */
export function verifyAdminSessionToken(token: string): AdminSessionData | null {
  if (!token || !token.includes(".")) return null;
  const [dataStr, signature] = token.split(".");
  if (!dataStr || !signature) return null;

  const expectedSignature = crypto
    .createHmac("sha256", ADMIN_SESSION_SECRET)
    .update(dataStr)
    .digest("base64url");

  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const jsonStr = Buffer.from(dataStr, "base64url").toString("utf8");
    return JSON.parse(jsonStr) as AdminSessionData;
  } catch {
    return null;
  }
}

/**
 * Obtiene y valida la sesión de administración a partir de un Request o NextRequest
 */
export async function getAdminSessionFromRequest(
  req: NextRequest | Request
): Promise<AdminSessionData | null> {
  try {
    let sessionToken: string | undefined;

    if ("cookies" in req && typeof req.cookies?.get === "function") {
      sessionToken = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    } else {
      const cookieHeader = req.headers.get("cookie") || "";
      const match = cookieHeader.match(new RegExp(`(?:^|; )${ADMIN_SESSION_COOKIE}=([^;]*)`));
      sessionToken = match ? decodeURIComponent(match[1]) : undefined;
    }

    if (!sessionToken) return null;

    const payload = verifyAdminSessionToken(sessionToken);
    if (!payload || !payload.id) return null;

    // Verificar en la BD que el usuario siga activo y no bloqueado
    const pool = getDbPool();
    const [rows]: any = await pool.query(
      `SELECT id, activo, bloqueado_hasta, rol
       FROM administradores
       WHERE id = ? AND activo = 1
       LIMIT 1`,
      [payload.id]
    );

    if (!rows || rows.length === 0) return null;
    const admin = rows[0];

    if (admin.bloqueado_hasta && new Date(admin.bloqueado_hasta) > new Date()) {
      return null;
    }

    // Si es gerente, actualizar lista viva de sucursales permitidas
    if (admin.rol === "gerente") {
      const [sucRows]: any = await pool.query(
        "SELECT sucursal_id FROM administrador_sucursales WHERE administrador_id = ?",
        [payload.id]
      );
      payload.sucursales = sucRows.map((r: any) => r.sucursal_id);
    }

    payload.rol = admin.rol;
    return payload;
  } catch (error) {
    console.error("[getAdminSessionFromRequest Error]:", error);
    return null;
  }
}

/**
 * Obtiene la sesión de administración en Server Components / layouts de Next.js
 */
export async function getAdminSessionServer(): Promise<AdminSessionData | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
    if (!sessionToken) return null;

    const payload = verifyAdminSessionToken(sessionToken);
    if (!payload || !payload.id) return null;

    const pool = getDbPool();
    const [rows]: any = await pool.query(
      `SELECT id, nombre, apellido, correo, rol, activo, bloqueado_hasta
       FROM administradores
       WHERE id = ? AND activo = 1
       LIMIT 1`,
      [payload.id]
    );

    if (!rows || rows.length === 0) return null;
    const admin = rows[0];

    if (admin.bloqueado_hasta && new Date(admin.bloqueado_hasta) > new Date()) {
      return null;
    }

    let sucursales: number[] = [];
    if (admin.rol === "gerente") {
      const [sucRows]: any = await pool.query(
        "SELECT sucursal_id FROM administrador_sucursales WHERE administrador_id = ?",
        [payload.id]
      );
      sucursales = sucRows.map((r: any) => r.sucursal_id);
    }

    return {
      id: admin.id,
      nombre: admin.nombre,
      apellido: admin.apellido,
      correo: admin.correo,
      rol: admin.rol,
      sucursales,
      loginEn: payload.loginEn || new Date().toISOString(),
    };
  } catch (error) {
    console.error("[getAdminSessionServer Error]:", error);
    return null;
  }
}

/**
 * Registra una acción de administración en la tabla inmutable auditoria_admin
 */
export async function registrarAuditoriaAdmin(params: {
  adminId?: number | null;
  accion: string;
  entidad: string;
  entidadId?: string | number | null;
  detalle?: any;
  ip?: string | null;
}): Promise<void> {
  try {
    const pool = getDbPool();
    const detalleJson = params.detalle ? JSON.stringify(params.detalle) : null;
    const entidadIdStr = params.entidadId !== undefined && params.entidadId !== null
      ? String(params.entidadId)
      : null;

    await pool.query(
      `INSERT INTO auditoria_admin (administrador_id, accion, entidad, entidad_id, detalle, ip, creado_en)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        params.adminId || null,
        params.accion,
        params.entidad,
        entidadIdStr,
        detalleJson,
        params.ip || null,
      ]
    );
  } catch (error) {
    console.error("[registrarAuditoriaAdmin Error]:", error);
  }
}

import crypto from "crypto";
import { NextRequest } from "next/server";
import { getDbPool } from "@/lib/db";
import { NOMBRE_MARCA } from "@/lib/marca";

const POS_SESSION_SECRET = process.env.SESSION_SECRET || "technova_derm_secure_pos_session_2026";
export const POS_DEVICE_COOKIE = "pos_dispositivo";
export const POS_SESSION_COOKIE = "pos_sesion";

export interface DispositivoPos {
  id: number;
  sucursalId: number;
  sucursalNombre: string;
  sucursalNombreCompleto: string;
  nombre: string;
  activo: boolean;
}

export interface PosSessionData {
  turnoId: number;
  empleadoId: number;
  cajaId: number;
  sucursalId: number;
  nombre: string;
  apellido: string;
  rol: "cajera" | "supervisora" | "gerente" | "admin";
  cajaNombre: string;
  sucursalNombre: string;
  sucursalNombreCompleto: string;
  inicioTurno: string;
  horaEntrada?: string | null;
  horaSalida?: string | null;
}

/**
 * Genera hash SHA-256 en formato hex
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token.trim()).digest("hex");
}

/**
 * Valida y obtiene el dispositivo POS desde la cookie de la petición
 */
export async function getDispositivoFromRequest(
  req: NextRequest | Request
): Promise<DispositivoPos | null> {
  try {
    let rawToken: string | undefined;

    if ("cookies" in req && typeof req.cookies?.get === "function") {
      rawToken = req.cookies.get(POS_DEVICE_COOKIE)?.value;
    } else {
      const cookieHeader = req.headers.get("cookie") || "";
      const match = cookieHeader.match(new RegExp(`(?:^|; )${POS_DEVICE_COOKIE}=([^;]*)`));
      rawToken = match ? decodeURIComponent(match[1]) : undefined;
    }

    if (!rawToken || rawToken.length < 16) {
      return null;
    }

    const tokenHash = hashToken(rawToken);
    const pool = getDbPool();

    const [rows]: any = await pool.execute(
      `SELECT d.id, d.sucursal_id, d.nombre as dispositivo_nombre, d.activo,
              s.nombre as sucursal_nombre
       FROM dispositivos_pos d
       JOIN sucursales s ON d.sucursal_id = s.id
       WHERE d.token_hash = ? AND d.activo = 1
       LIMIT 1`,
      [tokenHash]
    );

    if (!rows || rows.length === 0) {
      return null;
    }

    const dev = rows[0];

    // Actualizar último uso de forma asíncrona
    pool.execute("UPDATE dispositivos_pos SET ultimo_uso = NOW() WHERE id = ?", [dev.id]).catch(() => {});

    const nombreSucursal = dev.sucursal_nombre;
    const sucursalNombreCompleto = nombreSucursal.toLowerCase().includes(NOMBRE_MARCA.toLowerCase())
      ? nombreSucursal
      : `${NOMBRE_MARCA} ${nombreSucursal}`;

    return {
      id: dev.id,
      sucursalId: dev.sucursal_id,
      sucursalNombre: nombreSucursal,
      sucursalNombreCompleto,
      nombre: dev.dispositivo_nombre,
      activo: Boolean(dev.activo),
    };
  } catch (error) {
    console.error("[getDispositivoFromRequest Error]:", error);
    return null;
  }
}

/**
 * Genera cookie firmada para la sesión del turno en POS
 */
export function signPosSession(data: PosSessionData): string {
  const dataStr = Buffer.from(JSON.stringify(data)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", POS_SESSION_SECRET)
    .update(dataStr)
    .digest("base64url");
  return `${dataStr}.${signature}`;
}

/**
 * Valida y obtiene los datos del turno en sesión
 */
export async function getPosSessionFromRequest(
  req: NextRequest | Request
): Promise<PosSessionData | null> {
  try {
    let sessionToken: string | undefined;

    if ("cookies" in req && typeof req.cookies?.get === "function") {
      sessionToken = req.cookies.get(POS_SESSION_COOKIE)?.value;
    } else {
      const cookieHeader = req.headers.get("cookie") || "";
      const match = cookieHeader.match(new RegExp(`(?:^|; )${POS_SESSION_COOKIE}=([^;]*)`));
      sessionToken = match ? decodeURIComponent(match[1]) : undefined;
    }

    if (!sessionToken || !sessionToken.includes(".")) {
      return null;
    }

    const [dataStr, signature] = sessionToken.split(".");
    if (!dataStr || !signature) return null;

    const expectedSignature = crypto
      .createHmac("sha256", POS_SESSION_SECRET)
      .update(dataStr)
      .digest("base64url");

    if (signature !== expectedSignature) {
      return null;
    }

    const payload: PosSessionData = JSON.parse(Buffer.from(dataStr, "base64url").toString("utf8"));

    // Verificar en la BD que el turno siga con estado 'abierto'
    const pool = getDbPool();
    const [turnoRows]: any = await pool.execute(
      "SELECT id, estado FROM turnos WHERE id = ? AND empleado_id = ? AND estado = 'abierto' LIMIT 1",
      [payload.turnoId, payload.empleadoId]
    );

    if (!turnoRows || turnoRows.length === 0) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error("[getPosSessionFromRequest Error]:", error);
    return null;
  }
}

/**
 * Registra una acción en la bitácora de auditoría del POS
 */
export async function registrarAuditoriaPos(
  tipo: string,
  sucursalId: number,
  detalle: string,
  empleadoId?: number | null
): Promise<void> {
  try {
    const pool = getDbPool();
    await pool.execute(
      `INSERT INTO auditoria_pos (tipo, empleado_id, sucursal_id, detalle, creado_en)
       VALUES (?, ?, ?, ?, NOW())`,
      [tipo, empleadoId || null, sucursalId, detalle]
    );
  } catch (error) {
    console.error("[registrarAuditoriaPos Error]:", error);
  }
}

/**
 * Obtiene el dispositivo registrado desde un Server Component de Next.js
 */
export async function getDispositivoServer(): Promise<DispositivoPos | null> {
  try {
    const { cookies } = await import("next/headers");
    const rawToken = cookies().get(POS_DEVICE_COOKIE)?.value;
    if (!rawToken || rawToken.length < 16) return null;

    const tokenHash = hashToken(rawToken);
    const pool = getDbPool();

    const [rows]: any = await pool.execute(
      `SELECT d.id, d.sucursal_id, d.nombre as dispositivo_nombre, d.activo,
              s.nombre as sucursal_nombre
       FROM dispositivos_pos d
       JOIN sucursales s ON d.sucursal_id = s.id
       WHERE d.token_hash = ? AND d.activo = 1
       LIMIT 1`,
      [tokenHash]
    );

    if (!rows || rows.length === 0) return null;

    const dev = rows[0];
    const nombreSucursal = dev.sucursal_nombre;
    const sucursalNombreCompleto = nombreSucursal.toLowerCase().includes(NOMBRE_MARCA.toLowerCase())
      ? nombreSucursal
      : `${NOMBRE_MARCA} ${nombreSucursal}`;

    return {
      id: dev.id,
      sucursalId: dev.sucursal_id,
      sucursalNombre: nombreSucursal,
      sucursalNombreCompleto,
      nombre: dev.dispositivo_nombre,
      activo: Boolean(dev.activo),
    };
  } catch {
    return null;
  }
}

/**
 * Obtiene la sesión activa de un turno desde un Server Component de Next.js
 */
export async function getPosSessionServer(): Promise<PosSessionData | null> {
  try {
    const { cookies } = await import("next/headers");
    const sessionToken = cookies().get(POS_SESSION_COOKIE)?.value;
    if (!sessionToken || !sessionToken.includes(".")) return null;

    const [dataStr, signature] = sessionToken.split(".");
    if (!dataStr || !signature) return null;

    const expectedSignature = crypto
      .createHmac("sha256", POS_SESSION_SECRET)
      .update(dataStr)
      .digest("base64url");

    if (signature !== expectedSignature) return null;

    const payload: PosSessionData = JSON.parse(Buffer.from(dataStr, "base64url").toString("utf8"));

    const pool = getDbPool();
    const [turnoRows]: any = await pool.execute(
      "SELECT id, estado FROM turnos WHERE id = ? AND empleado_id = ? AND estado = 'abierto' LIMIT 1",
      [payload.turnoId, payload.empleadoId]
    );

    if (!turnoRows || turnoRows.length === 0) return null;

    return payload;
  } catch {
    return null;
  }
}


import { NextRequest } from "next/server";
import { getDbPool } from "@/lib/db";
import { getAuthUserFromRequest } from "@/lib/session";
import { cookies } from "next/headers";

export interface SucursalInfo {
  id: number;
  nombre: string;
  direccion?: string;
}

/**
 * Obtiene la sucursal activa para "Recoger hoy":
 * 1. Si hay sesión activa: sucursal_preferida_id del usuario en la BD.
 * 2. Si no hay sesión o sucursal_preferida_id es NULL: cookie 'sucursal_id'.
 * 3. Si no hay cookie o no es válida: primera sucursal activa en la BD (Centro).
 *
 * TODO: Agregar selector interactivo de sucursal en el header/modal para cambiar la tienda física preferida.
 */
export async function getSucursalRecogerHoy(
  req?: NextRequest
): Promise<SucursalInfo> {
  const pool = getDbPool();

  // 1. Obtener primera sucursal activa de tipo tienda como fallback garantizado
  const [firstRows]: any = await pool.execute(
    "SELECT id, nombre, direccion FROM sucursales WHERE activa = 1 AND tipo != 'bodega' ORDER BY id ASC LIMIT 1"
  );
  const fallbackSucursal: SucursalInfo =
    firstRows && firstRows.length > 0
      ? {
          id: Number(firstRows[0].id),
          nombre: firstRows[0].nombre,
          direccion: firstRows[0].direccion,
        }
      : { id: 1, nombre: "Centro" };

  // 2. Verificar sesión de usuario
  let userId: number | null = null;
  if (req) {
    const session = getAuthUserFromRequest(req);
    userId = session?.userId || null;
  }

  if (userId) {
    const [userRows]: any = await pool.execute(
      `SELECT s.id, s.nombre, s.direccion 
       FROM usuarios u
       JOIN sucursales s ON s.id = u.sucursal_preferida_id
       WHERE u.id = ? AND s.activa = 1 AND s.tipo != 'bodega'
       LIMIT 1`,
      [userId]
    );

    if (userRows && userRows.length > 0) {
      return {
        id: Number(userRows[0].id),
        nombre: userRows[0].nombre,
        direccion: userRows[0].direccion,
      };
    }
  }

  // 3. Verificar cookie 'sucursal_id'
  let cookieSucursalId: string | undefined;
  if (req) {
    cookieSucursalId = req.cookies.get("sucursal_id")?.value;
  } else {
    try {
      const cookieStore = cookies();
      cookieSucursalId = cookieStore.get("sucursal_id")?.value;
    } catch {
      // Si se invoca fuera de contexto de cookies de Next.js
    }
  }

  if (cookieSucursalId && !isNaN(Number(cookieSucursalId))) {
    const sId = Number(cookieSucursalId);
    const [cookieRows]: any = await pool.execute(
      "SELECT id, nombre, direccion FROM sucursales WHERE id = ? AND activa = 1 AND tipo != 'bodega' LIMIT 1",
      [sId]
    );

    if (cookieRows && cookieRows.length > 0) {
      return {
        id: Number(cookieRows[0].id),
        nombre: cookieRows[0].nombre,
        direccion: cookieRows[0].direccion,
      };
    }
  }

  // 4. Fallback default (Centro)
  return fallbackSucursal;
}

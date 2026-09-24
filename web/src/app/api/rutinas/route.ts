import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/session";
import { getDbPool } from "@/lib/db";
import {
  getRutinasArmadas,
  getCombosParaRutinas,
} from "@/lib/recomendaciones";

export const dynamic = "force-dynamic";

const TIPOS_VALIDOS = new Set(["mixta", "seca", "grasa", "normal", "sensible", "todas"]);

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    let pielParam = searchParams.get("piel")?.toLowerCase() || "";

    const sessionUser = getAuthUserFromRequest(req);
    const userId = sessionUser?.userId || null;
    const pool = getDbPool();

    // Obtener perfil del usuario si está autenticado
    let userTipoPiel: string | null = null;
    let userName: string | null = null;

    if (userId) {
      const [userRows]: any = await pool.execute(
        `SELECT u.nombre, pp.tipo_piel 
         FROM usuarios u 
         LEFT JOIN perfiles_piel pp ON pp.usuario_id = u.id 
         WHERE u.id = ? LIMIT 1`,
        [userId]
      );
      if (userRows && userRows.length > 0) {
        userName = userRows[0].nombre;
        userTipoPiel = userRows[0].tipo_piel || null;
      }
    }

    // Determinar pestaña activa si no viene en el query param:
    // ?piel= si es válida; si no, la del perfil del usuario; si no hay perfil o sesión, "todas"
    let tipoPielSeleccionado = "todas";
    if (pielParam && TIPOS_VALIDOS.has(pielParam)) {
      tipoPielSeleccionado = pielParam;
    } else if (userTipoPiel && TIPOS_VALIDOS.has(userTipoPiel)) {
      tipoPielSeleccionado = userTipoPiel;
    }

    // Armar las secciones de rutinas para el tipo seleccionado
    const secciones = await getRutinasArmadas(tipoPielSeleccionado, userId);

    // Obtener combos vigentes de la semana
    const combos = await getCombosParaRutinas(userId);

    return NextResponse.json(
      {
        tipoPiel: tipoPielSeleccionado,
        userProfile: userId
          ? {
              userId,
              nombre: userName,
              tipo_piel: userTipoPiel,
            }
          : null,
        secciones,
        combos,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[API RUTINAS GET ERROR]:", error);
    return NextResponse.json(
      { error: "Error al obtener las rutinas", message: error.message },
      { status: 500 }
    );
  }
}

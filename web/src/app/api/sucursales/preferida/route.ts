import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/session";
import { getDbPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = getAuthUserFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const sucursalId = Number(body.sucursal_id);

    if (!sucursalId || isNaN(sucursalId)) {
      return NextResponse.json({ error: "sucursal_id inválido" }, { status: 400 });
    }

    const pool = getDbPool();

    // Si el usuario está autenticado, guardar en su perfil
    if (session?.userId) {
      await pool.execute(
        "UPDATE usuarios SET sucursal_preferida_id = ? WHERE id = ?",
        [sucursalId, session.userId]
      );
    }

    const response = NextResponse.json({ exito: true, sucursalId });
    // Guardar también cookie sucursal_id
    response.cookies.set({
      name: "sucursal_id",
      value: String(sucursalId),
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 días
      sameSite: "lax",
    });

    return response;
  } catch (err: any) {
    console.error("[POST /api/sucursales/preferida Error]:", err);
    return NextResponse.json({ error: "Error al actualizar sucursal preferida" }, { status: 500 });
  }
}

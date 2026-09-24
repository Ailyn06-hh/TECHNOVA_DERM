import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getAuthUserFromRequest } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = getAuthUserFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { error: "No has iniciado sesión o tu sesión ha expirado." },
        { status: 401 }
      );
    }

    const pool = getDbPool();

    // Marcar onboarding como omitido para este usuario
    await pool.execute(
      "UPDATE usuarios SET onboarding_omitido = 1 WHERE id = ?",
      [session.userId]
    );

    return NextResponse.json(
      {
        success: true,
        message: "Has omitido el perfil de piel por ahora.",
        redirectUrl: "/",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[API OMITIR ONBOARDING ERROR]:", error);
    return NextResponse.json(
      { error: "Error al omitir el paso de onboarding.", details: error.message },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/session";
import { getRecomendacionRutina } from "@/lib/recomendaciones";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = getAuthUserFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json({ hasSession: false, hasProfile: false }, { status: 200 });
    }

    const recomendacion = await getRecomendacionRutina(session.userId);

    return NextResponse.json(
      {
        hasSession: true,
        nombre: session.nombre,
        ...recomendacion,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[RECOMENDACIONES API ERROR]:", error);
    return NextResponse.json(
      { error: "Error al calcular recomendación", details: error.message },
      { status: 500 }
    );
  }
}

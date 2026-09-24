import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/session";
import { getCombosParaRutinas } from "@/lib/recomendaciones";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sessionUser = getAuthUserFromRequest(req);
    const userId = sessionUser?.userId || null;

    const combos = await getCombosParaRutinas(userId);

    // Retorna hasta 3 combos vigentes para la sección de combos
    return NextResponse.json({ combos: combos.slice(0, 3) }, { status: 200 });
  } catch (error: any) {
    console.error("[COMBOS SEMANA ERROR]:", error);
    return NextResponse.json({ error: error.message, combos: [] }, { status: 500 });
  }
}

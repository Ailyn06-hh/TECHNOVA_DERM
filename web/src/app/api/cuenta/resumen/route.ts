import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/session";
import { getResumenCuenta } from "@/lib/cuenta";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = getAuthUserFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const data = await getResumenCuenta(session.userId, {
      nombre: session.nombre,
      correo: session.correo,
    });

    return NextResponse.json({
      success: true,
      exito: true,
      ...data,
    });
  } catch (error: any) {
    console.error("[GET /api/cuenta/resumen Error]:", error);
    return NextResponse.json(
      { error: "Error al cargar resumen de cuenta", message: error.message },
      { status: 500 }
    );
  }
}

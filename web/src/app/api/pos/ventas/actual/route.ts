import { NextRequest, NextResponse } from "next/server";
import { getDispositivoFromRequest, getPosSessionFromRequest } from "@/lib/pos-session";
import { getOrCreateBorradorVenta } from "@/lib/pos/ventas";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const dispositivo = await getDispositivoFromRequest(req);
    const session = await getPosSessionFromRequest(req);

    if (!dispositivo || !session) {
      return NextResponse.json(
        { error: "Sesión o dispositivo POS no válido.", redirect: "/pos" },
        { status: 401 }
      );
    }

    const ticket = await getOrCreateBorradorVenta(
      session.turnoId,
      dispositivo.sucursalId,
      session.empleadoId,
      session.cajaId
    );

    return NextResponse.json({
      exito: true,
      ticket,
    });
  } catch (error: any) {
    console.error("[GET /api/pos/ventas/actual Error]:", error);
    return NextResponse.json(
      { error: "Error al obtener la venta actual", details: error.message },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getDispositivoFromRequest, getPosSessionFromRequest } from "@/lib/pos-session";
import { analizarInventario } from "@/lib/pos/inventario";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const dispositivo = await getDispositivoFromRequest(req);
    const session = await getPosSessionFromRequest(req);

    if (!dispositivo || !session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const alertas = await analizarInventario(dispositivo.sucursalId);

    return NextResponse.json({
      exito: true,
      alertas,
    });
  } catch (error: any) {
    console.error("[GET /api/pos/inventario/alertas Error]:", error);
    return NextResponse.json(
      { error: "Error al calcular alertas de inventario", details: error.message },
      { status: 500 }
    );
  }
}

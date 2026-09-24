import { NextRequest, NextResponse } from "next/server";
import { getDispositivoFromRequest } from "@/lib/pos-session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const dispositivo = await getDispositivoFromRequest(req);

    if (!dispositivo) {
      return NextResponse.json({
        registrado: false,
        error: "Este dispositivo no está registrado como caja",
      });
    }

    return NextResponse.json({
      registrado: true,
      dispositivo,
    });
  } catch (error: any) {
    console.error("[GET /api/pos/dispositivos/validar Error]:", error);
    return NextResponse.json(
      { registrado: false, error: "Error al validar dispositivo" },
      { status: 500 }
    );
  }
}

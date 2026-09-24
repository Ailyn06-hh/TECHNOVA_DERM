import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/session";
import { obtenerMisPedidos } from "@/lib/pedidos";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUserFromRequest(req);
    if (!user?.userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const estado = searchParams.get("estado") || "todos";
    const canal = searchParams.get("canal") || "todos";
    const pagina = parseInt(searchParams.get("pagina") || "1", 10) || 1;

    const resultado = await obtenerMisPedidos({
      userId: user.userId,
      estado,
      canal,
      pagina,
      limite: 10,
    });

    return NextResponse.json(resultado);
  } catch (error: any) {
    console.error("[API MIS PEDIDOS ERROR]:", error);
    return NextResponse.json(
      { error: "Error al obtener los pedidos", details: error.message },
      { status: 500 }
    );
  }
}

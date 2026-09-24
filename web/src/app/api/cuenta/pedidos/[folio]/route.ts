import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/session";
import { obtenerDetallePedido } from "@/lib/pedidos";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { folio: string } }
) {
  try {
    const user = getAuthUserFromRequest(req);
    if (!user?.userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { folio } = params;
    if (!folio) {
      return NextResponse.json({ error: "Folio no proporcionado" }, { status: 400 });
    }

    const detalle = await obtenerDetallePedido(folio, user.userId);
    if (!detalle) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    return NextResponse.json(detalle);
  } catch (error: any) {
    console.error("[API DETALLE PEDIDO ERROR]:", error);
    return NextResponse.json(
      { error: "Error al obtener el detalle del pedido", details: error.message },
      { status: 500 }
    );
  }
}

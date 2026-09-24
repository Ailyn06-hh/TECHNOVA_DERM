import { NextRequest, NextResponse } from "next/server";
import { getDispositivoFromRequest, getPosSessionFromRequest } from "@/lib/pos-session";
import { getDbPool } from "@/lib/db";
import { getOrCreateBorradorVenta } from "@/lib/pos/ventas";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dispositivo = await getDispositivoFromRequest(req);
    const session = await getPosSessionFromRequest(req);

    if (!dispositivo || !session) {
      return NextResponse.json(
        { error: "Sesión o dispositivo POS no válido.", redirect: "/pos" },
        { status: 401 }
      );
    }

    const pedidoId = Number(params.id);
    if (!pedidoId) {
      return NextResponse.json({ error: "ID de venta inválido." }, { status: 400 });
    }

    const pool = getDbPool();

    const [pedRows]: any = await pool.execute(
      "SELECT id, turno_id, estado, folio FROM pedidos WHERE id = ? LIMIT 1",
      [pedidoId]
    );

    if (!pedRows || pedRows.length === 0) {
      return NextResponse.json({ error: "Venta no encontrada." }, { status: 404 });
    }

    const pedido = pedRows[0];
    if (pedido.turno_id !== session.turnoId) {
      return NextResponse.json(
        { error: "Esta venta pertenece a otro turno de caja." },
        { status: 403 }
      );
    }

    if (pedido.estado !== "borrador") {
      return NextResponse.json(
        { error: "Solo se pueden descartar ventas en estado borrador." },
        { status: 400 }
      );
    }

    // Limpiar items y marcar pedido como cancelado
    await pool.execute("DELETE FROM pedido_items WHERE pedido_id = ?", [pedidoId]);
    await pool.execute("UPDATE pedidos SET estado = 'cancelado' WHERE id = ?", [pedidoId]);

    // Crear un nuevo borrador limpio inmediatamente
    const nuevoTicket = await getOrCreateBorradorVenta(
      session.turnoId,
      dispositivo.sucursalId,
      session.empleadoId,
      session.cajaId
    );

    return NextResponse.json({
      exito: true,
      mensaje: `Venta ${pedido.folio} descartada. Nueva venta lista.`,
      ticket: nuevoTicket,
    });
  } catch (error: any) {
    console.error("[DELETE /api/pos/ventas/[id] Error]:", error);
    return NextResponse.json(
      { error: "Error al descartar la venta", details: error.message },
      { status: 500 }
    );
  }
}

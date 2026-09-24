import { NextRequest, NextResponse } from "next/server";
import { getDispositivoFromRequest, getPosSessionFromRequest } from "@/lib/pos-session";
import { getOrCreateBorradorVenta } from "@/lib/pos/ventas";
import { getDbPool } from "@/lib/db";
import { PREFIJO_FOLIO_POS } from "@/lib/marca";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const dispositivo = await getDispositivoFromRequest(req);
    const session = await getPosSessionFromRequest(req);

    if (!dispositivo || !session) {
      return NextResponse.json(
        { error: "Sesión o dispositivo POS no válido.", redirect: "/pos" },
        { status: 401 }
      );
    }

    const pool = getDbPool();

    // Crear un nuevo pedido en estado borrador forzando nuevo folio
    const [insertResult]: any = await pool.execute(
      `INSERT INTO pedidos (
        folio, canal, tipo_entrega, sucursal_id, empleado_id, turno_id, caja_id,
        subtotal, descuento, total, estado, creado_en
      ) VALUES (
        NULL, 'tienda', 'mostrador', ?, ?, ?, ?,
        0.00, 0.00, 0.00, 'borrador', NOW()
      )`,
      [dispositivo.sucursalId, session.empleadoId, session.turnoId, session.cajaId]
    );

    const pedidoId = insertResult.insertId;
    const folioGenerado = `${PREFIJO_FOLIO_POS || "V"}-${pedidoId}`;

    await pool.execute("UPDATE pedidos SET folio = ? WHERE id = ?", [
      folioGenerado,
      pedidoId,
    ]);

    const { calcularTicketPos } = await import("@/lib/pos/ventas");
    const ticket = await calcularTicketPos(pedidoId, dispositivo.sucursalId);

    return NextResponse.json({
      exito: true,
      mensaje: `Nueva venta ${ticket.folio} iniciada.`,
      ticket,
    });
  } catch (error: any) {
    console.error("[POST /api/pos/ventas Error]:", error);
    return NextResponse.json(
      { error: "Error al crear nueva venta", details: error.message },
      { status: 500 }
    );
  }
}

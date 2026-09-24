import { NextRequest, NextResponse } from "next/server";
import { getDispositivoFromRequest, getPosSessionFromRequest } from "@/lib/pos-session";
import { getDbPool } from "@/lib/db";
import { cambiarEstado } from "@/lib/pedidos";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { folio: string } }
) {
  try {
    const dispositivo = await getDispositivoFromRequest(req);
    const session = await getPosSessionFromRequest(req);

    if (!dispositivo || !session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const folio = params.folio?.toUpperCase();
    const body = await req.json().catch(() => ({}));
    const accion = String(body.accion || "").trim(); // 'empezar' | 'marcar_listo'

    const pool = getDbPool();

    const [rows]: any = await pool.execute(
      `SELECT id, folio, sucursal_id, estado, tipo_entrega 
       FROM pedidos 
       WHERE folio = ? LIMIT 1`,
      [folio]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    const pedido = rows[0];

    if (pedido.sucursal_id !== dispositivo.sucursalId) {
      return NextResponse.json(
        { error: "Este pedido no pertenece a esta sucursal" },
        { status: 403 }
      );
    }

    if (accion === "empezar") {
      if (pedido.estado !== "pagado") {
        return NextResponse.json(
          { error: `No se puede empezar a preparar un pedido en estado "${pedido.estado}"` },
          { status: 400 }
        );
      }

      await cambiarEstado(
        pedido.id,
        "preparando",
        `Preparación iniciada por ${session.nombre} en ${session.sucursalNombre}`,
        pool,
        session.empleadoId
      );

      return NextResponse.json({
        exito: true,
        nuevoEstado: "preparando",
        mensaje: "Pedido en preparación",
      });
    }

    if (accion === "marcar_listo") {
      if (pedido.estado !== "preparando") {
        return NextResponse.json(
          { error: `Solo los pedidos en preparación pueden marcarse como listos` },
          { status: 400 }
        );
      }

      await cambiarEstado(
        pedido.id,
        "listo_para_recoger",
        `Pedido empaquetado y listo para recoger por ${session.nombre}`,
        pool,
        session.empleadoId
      );

      return NextResponse.json({
        exito: true,
        nuevoEstado: "listo_para_recoger",
        mensaje: "Pedido marcado como listo para recoger y clienta notificada",
      });
    }

    return NextResponse.json(
      { error: "Acción no reconocida. Usa 'empezar' o 'marcar_listo'." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[POST /api/pos/por-recoger/[folio]/preparar Error]:", error);
    return NextResponse.json(
      { error: "Error al actualizar estado de preparación", details: error.message },
      { status: 500 }
    );
  }
}

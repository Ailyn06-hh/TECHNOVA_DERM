import { NextRequest, NextResponse } from "next/server";
import { getDispositivoFromRequest, getPosSessionFromRequest } from "@/lib/pos-session";
import { getDbPool } from "@/lib/db";
import { calcularTicketPos } from "@/lib/pos/ventas";

export const dynamic = "force-dynamic";

export async function PUT(
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

    const body = await req.json().catch(() => ({}));
    const { usuario_id } = body;

    const pool = getDbPool();

    // Validar venta
    const [pedRows]: any = await pool.execute(
      "SELECT id, turno_id, estado FROM pedidos WHERE id = ? LIMIT 1",
      [pedidoId]
    );

    if (!pedRows || pedRows.length === 0) {
      return NextResponse.json({ error: "Venta no encontrada." }, { status: 404 });
    }

    if (pedRows[0].turno_id !== session.turnoId) {
      return NextResponse.json(
        { error: "Esta venta pertenece a otro turno de caja." },
        { status: 403 }
      );
    }

    if (pedRows[0].estado !== "borrador") {
      return NextResponse.json(
        { error: "Esta venta ya fue cobrada y no puede modificarse." },
        { status: 400 }
      );
    }

    let nuevoUsuarioId: number | null = null;
    let clienteEmail: string | null = null;
    let clienteCelular: string | null = null;

    if (usuario_id) {
      const [userRows]: any = await pool.execute(
        "SELECT id, nombre, apellido, correo, celular FROM usuarios WHERE id = ? LIMIT 1",
        [Number(usuario_id)]
      );

      if (!userRows || userRows.length === 0) {
        return NextResponse.json({ error: "Clienta no encontrada." }, { status: 404 });
      }

      nuevoUsuarioId = userRows[0].id;
      clienteEmail = userRows[0].correo;
      clienteCelular = userRows[0].celular;
    }

    await pool.execute(
      "UPDATE pedidos SET usuario_id = ?, cliente_email = ?, cliente_celular = ? WHERE id = ?",
      [nuevoUsuarioId, clienteEmail, clienteCelular, pedidoId]
    );

    const ticket = await calcularTicketPos(pedidoId, dispositivo.sucursalId);

    return NextResponse.json({
      exito: true,
      mensaje: nuevoUsuarioId ? "Clienta vinculada a la venta." : "Clienta desvinculada.",
      ticket,
    });
  } catch (error: any) {
    console.error("[PUT /api/pos/ventas/[id]/cliente Error]:", error);
    return NextResponse.json(
      { error: "Error al actualizar clienta", details: error.message },
      { status: 500 }
    );
  }
}

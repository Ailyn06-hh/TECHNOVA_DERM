import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/session";
import { getDbPool } from "@/lib/db";
import { getProveedorPagos } from "@/lib/pagos";
import { sendCardActivityEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getAuthUserFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const cardId = Number(params.id);
    if (!cardId || isNaN(cardId)) {
      return NextResponse.json({ error: "ID de tarjeta inválido" }, { status: 400 });
    }

    const pool = getDbPool();
    const [rows]: any = await pool.execute(
      "SELECT id, mes_vencimiento, anio_vencimiento FROM metodos_pago WHERE id = ? AND usuario_id = ? LIMIT 1",
      [cardId, session.userId]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "Tarjeta no encontrada" }, { status: 404 });
    }

    const card = rows[0];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (
      card.anio_vencimiento < currentYear ||
      (card.anio_vencimiento === currentYear && card.mes_vencimiento < currentMonth)
    ) {
      return NextResponse.json(
        { error: "No es posible marcar como predeterminada una tarjeta vencida." },
        { status: 400 }
      );
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute(
        "UPDATE metodos_pago SET predeterminado = 0 WHERE usuario_id = ?",
        [session.userId]
      );
      await conn.execute(
        "UPDATE metodos_pago SET predeterminado = 1 WHERE id = ? AND usuario_id = ?",
        [cardId, session.userId]
      );
      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

    return NextResponse.json({
      exito: true,
      mensaje: "Tarjeta seleccionada como predeterminada.",
    });
  } catch (err: any) {
    console.error("[PATCH /api/cuenta/tarjetas/[id] Error]:", err);
    return NextResponse.json(
      { error: "Error al actualizar tarjeta predeterminada", details: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getAuthUserFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const cardId = Number(params.id);
    if (!cardId || isNaN(cardId)) {
      return NextResponse.json({ error: "ID de tarjeta inválido" }, { status: 400 });
    }

    const pool = getDbPool();
    const [rows]: any = await pool.execute(
      "SELECT id, marca, ultimos4 FROM metodos_pago WHERE id = ? AND usuario_id = ? LIMIT 1",
      [cardId, session.userId]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "Tarjeta no encontrada" }, { status: 404 });
    }

    const { marca, ultimos4 } = rows[0];

    // Eliminar a través del proveedor seguro
    const proveedor = getProveedorPagos();
    const eliminada = await proveedor.eliminarTarjeta(session.userId, cardId);

    if (!eliminada) {
      return NextResponse.json(
        { error: "No fue posible eliminar la tarjeta." },
        { status: 500 }
      );
    }

    // Registrar notificación omnicanal de seguridad
    const { notificar } = await import("@/lib/notificaciones");
    await notificar(session.userId, {
      tipo: "cuenta",
      evento: "tarjeta_eliminada",
      titulo: "Tarjeta eliminada",
      mensaje: `Se eliminó la tarjeta ${marca.toUpperCase()} terminación ${ultimos4} de tu cuenta de Technova-Derm.`,
      enlace: "/cuenta/direcciones",
      correo: session.correo,
    });

    return NextResponse.json({
      exito: true,
      mensaje: `Tarjeta terminación ${ultimos4} eliminada de tu cuenta.`,
    });
  } catch (err: any) {
    console.error("[DELETE /api/cuenta/tarjetas/[id] Error]:", err);
    return NextResponse.json(
      { error: "Error al eliminar la tarjeta", details: err.message },
      { status: 500 }
    );
  }
}

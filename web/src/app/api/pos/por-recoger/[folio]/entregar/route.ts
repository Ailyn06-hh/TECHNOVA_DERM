import { NextRequest, NextResponse } from "next/server";
import { getDispositivoFromRequest, getPosSessionFromRequest } from "@/lib/pos-session";
import { getDbPool } from "@/lib/db";
import { cambiarEstado } from "@/lib/pedidos";
import { estaCodigoVerificado, limpiarVerificacion } from "@/lib/pos/verificacion-cache";

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
    if (!folio) {
      return NextResponse.json({ error: "Folio no especificado" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { metodoPago, efectivoRecibido, cambio, autorizacionTerminal } = body;

    const pool = getDbPool();

    // 1. Obtener pedido actual y validar pertenencia
    const [rows]: any = await pool.execute(
      `SELECT p.id, p.folio, p.sucursal_id, p.tipo_entrega, p.estado, p.total,
              p.entregado_en, p.entregado_por,
              e.nombre as entregado_por_nombre, e.apellido as entregado_por_apellido
       FROM pedidos p
       LEFT JOIN empleados e ON e.id = p.entregado_por
       WHERE p.folio = ? LIMIT 1`,
      [folio]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    const pedido = rows[0];

    // Detección de carrera: si otra caja ya lo entregó
    if (pedido.estado === "entregado") {
      let hora = "recientemente";
      if (pedido.entregado_en) {
        const d = new Date(pedido.entregado_en);
        const h = String(d.getHours()).padStart(2, "0");
        const m = String(d.getMinutes()).padStart(2, "0");
        hora = `${h}:${m}`;
      }
      const nombreCajera = pedido.entregado_por_nombre
        ? `${pedido.entregado_por_nombre} ${pedido.entregado_por_apellido || ""}`.trim()
        : "otra colaboradora";

      return NextResponse.json(
        {
          error: `Este pedido ya fue entregado por ${nombreCajera} a las ${hora}`,
          yaEntregado: true,
        },
        { status: 409 }
      );
    }

    if (pedido.sucursal_id !== dispositivo.sucursalId) {
      return NextResponse.json(
        { error: "Este pedido pertenece a otra sucursal y no puede entregarse aquí." },
        { status: 403 }
      );
    }

    if (!["listo_para_recoger", "por_pagar_en_tienda"].includes(pedido.estado)) {
      return NextResponse.json(
        { error: `El pedido debe estar en estado 'listo_para_recoger' o 'por_pagar_en_tienda' (actual: ${pedido.estado})` },
        { status: 400 }
      );
    }

    // 2. Revalidar que el código haya sido verificado en esta sesión en los últimos 5 minutos
    const verificado = estaCodigoVerificado(folio, session.empleadoId);
    if (!verificado) {
      return NextResponse.json(
        {
          error: "El código de recogida no ha sido verificado o expiró. Por favor solicita el código a la clienta nuevamente.",
          requiereVerificacion: true,
        },
        { status: 400 }
      );
    }

    // Si es por pagar en tienda, requiere método de pago
    if (pedido.estado === "por_pagar_en_tienda" && !metodoPago) {
      return NextResponse.json(
        { error: "Debes seleccionar el método de pago para cobrar antes de entregar." },
        { status: 400 }
      );
    }

    // 3. Ejecutar entrega en transacción
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Si es 'por_pagar_en_tienda', registramos el cobro
      if (pedido.estado === "por_pagar_en_tienda") {
        const metodoFinal = metodoPago || "efectivo";
        const efecRecibidoNum = Number(efectivoRecibido) || Number(pedido.total);
        const cambioNum = Number(cambio) || 0;

        await conn.execute(
          `UPDATE pedidos 
           SET metodo_pago = ?, efectivo_recibido = ?, cambio = ?
           WHERE id = ?`,
          [metodoFinal, efecRecibidoNum, cambioNum, pedido.id]
        );

        // Registrar pago
        await conn.execute(
          `INSERT INTO pagos (pedido_id, empleado_id, proveedor, referencia_proveedor, estado, monto, autorizacion_terminal, creado_en)
           VALUES (?, ?, ?, ?, 'aprobado', ?, ?, NOW())`,
          [
            pedido.id,
            session.empleadoId,
            metodoFinal,
            `POS-REC-${folio}-${Date.now()}`,
            pedido.total,
            autorizacionTerminal || null,
          ]
        );

        // Registrar en movimientos_caja
        const tipoMov = metodoFinal === "efectivo" ? "venta_efectivo" : "venta_tarjeta";
        await conn.execute(
          `INSERT INTO movimientos_caja (turno_id, tipo, monto, pedido_id, empleado_id, creado_en)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [session.turnoId, tipoMov, pedido.total, pedido.id, session.empleadoId]
        );
      }

      // Marcar como entregado (con entregado_por, entregado_en, y notificar al cliente)
      await cambiarEstado(
        pedido.id,
        "entregado",
        `Pedido entregado en sucursal ${session.sucursalNombre} por ${session.nombre}`,
        conn,
        session.empleadoId
      );

      // Auditoría POS
      await conn.execute(
        `INSERT INTO auditoria_pos (tipo, empleado_id, sucursal_id, detalle, creado_en)
         VALUES ('entrega_recoger', ?, ?, ?, NOW())`,
        [
          session.empleadoId,
          dispositivo.sucursalId,
          JSON.stringify({
            folio,
            pedidoId: pedido.id,
            total: pedido.total,
            porPagar: pedido.estado === "por_pagar_en_tienda",
            cajera: session.nombre,
            turnoId: session.turnoId,
          }),
        ]
      );

      await conn.commit();
      limpiarVerificacion(folio, session.empleadoId);

      return NextResponse.json({
        exito: true,
        mensaje: `Pedido #${folio} entregado exitosamente.`,
      });
    } catch (txErr: any) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (error: any) {
    console.error("[POST /api/pos/por-recoger/[folio]/entregar Error]:", error);
    return NextResponse.json(
      { error: "Error al entregar el pedido", details: error.message },
      { status: 500 }
    );
  }
}

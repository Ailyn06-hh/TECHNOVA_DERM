import { NextRequest, NextResponse } from "next/server";
import { getDispositivoFromRequest, getPosSessionFromRequest, registrarAuditoriaPos } from "@/lib/pos-session";
import { getDbPool } from "@/lib/db";
import { calcularTicketPos } from "@/lib/pos/ventas";
import { notificar } from "@/lib/notificaciones";
import { NOMBRE_MARCA } from "@/lib/marca";
import { descontarInventario } from "@/lib/inventario";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const pool = getDbPool();
  let conn: any = null;

  try {
    const dispositivo = await getDispositivoFromRequest(req);
    const session = await getPosSessionFromRequest(req);

    if (!dispositivo || !session) {
      return NextResponse.json(
        { error: "Sesión o terminal POS no válida.", redirect: "/pos" },
        { status: 401 }
      );
    }

    const pedidoId = Number(params.id);
    if (!pedidoId) {
      return NextResponse.json({ error: "ID de venta inválido." }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      metodo_pago,
      efectivo_recibido,
      autorizacion_terminal,
      referencia_transferencia,
      monto_efectivo,
      monto_tarjeta,
      clave_idempotencia,
      enviar_whatsapp,
      whatsapp_celular,
    } = body;

    if (!["efectivo", "tarjeta_terminal", "transferencia", "mixto"].includes(metodo_pago)) {
      return NextResponse.json(
        { error: "Método de pago no válido para el Punto de Venta." },
        { status: 400 }
      );
    }

    // 1. Verificación de idempotencia
    if (clave_idempotencia) {
      const [idemRows]: any = await pool.execute(
        `SELECT id, folio, total, estado, metodo_pago, efectivo_recibido, cambio
         FROM pedidos 
         WHERE clave_idempotencia = ? AND estado = 'entregado' LIMIT 1`,
        [clave_idempotencia]
      );

      if (idemRows && idemRows.length > 0) {
        const pedRepetido = idemRows[0];
        return NextResponse.json({
          exito: true,
          mensaje: "Venta ya cobrada previamente (idempotencia).",
          repetido: true,
          folio: pedRepetido.folio,
          total: Number(pedRepetido.total),
          cambio: Number(pedRepetido.cambio || 0),
          metodo_pago: pedRepetido.metodo_pago,
        });
      }
    }

    // 2. Obtener y verificar pedido
    const [pedRows]: any = await pool.execute(
      "SELECT id, folio, turno_id, estado, usuario_id, sucursal_id FROM pedidos WHERE id = ? LIMIT 1",
      [pedidoId]
    );

    if (!pedRows || pedRows.length === 0) {
      return NextResponse.json({ error: "Venta no encontrada." }, { status: 404 });
    }

    const pedido = pedRows[0];
    if (pedido.turno_id !== session.turnoId) {
      return NextResponse.json(
        { error: "Esta venta no pertenece a tu turno activo." },
        { status: 403 }
      );
    }

    if (pedido.estado !== "borrador") {
      return NextResponse.json(
        { error: `Esta venta ya se encuentra en estado "${pedido.estado}".` },
        { status: 400 }
      );
    }

    // 3. Recalcular ticket para asegurar que los precios y descuentos están actualizados
    const ticket = await calcularTicketPos(pedidoId, dispositivo.sucursalId);
    if (ticket.items.length === 0) {
      return NextResponse.json(
        { error: "No puedes cobrar un ticket sin artículos." },
        { status: 400 }
      );
    }

    const totalCobrar = ticket.total;

    // Validar montos según método de pago
    let efecRecibidoNum = 0;
    let cambioNum = 0;
    let montoEfectivoFinal = 0;
    let montoTarjetaFinal = 0;

    if (metodo_pago === "efectivo") {
      efecRecibidoNum = Number(efectivo_recibido);
      if (isNaN(efecRecibidoNum) || efecRecibidoNum < totalCobrar) {
        return NextResponse.json(
          { error: `El efectivo recibido ($${efecRecibidoNum || 0}) no cubre el total de $${totalCobrar}.` },
          { status: 400 }
        );
      }
      cambioNum = Math.round((efecRecibidoNum - totalCobrar) * 100) / 100;
      montoEfectivoFinal = totalCobrar;
    } else if (metodo_pago === "tarjeta_terminal") {
      montoTarjetaFinal = totalCobrar;
    } else if (metodo_pago === "transferencia") {
      const ref = String(referencia_transferencia || "").trim();
      if (ref.length < 6 || ref.length > 40) {
        return NextResponse.json(
          { error: "La referencia o clave de rastreo de la transferencia debe tener entre 6 y 40 caracteres." },
          { status: 400 }
        );
      }
    } else if (metodo_pago === "mixto") {
      montoEfectivoFinal = Number(monto_efectivo || 0);
      montoTarjetaFinal = Number(monto_tarjeta || 0);

      const sumaMixta = Math.round((montoEfectivoFinal + montoTarjetaFinal) * 100) / 100;
      if (sumaMixta !== totalCobrar) {
        return NextResponse.json(
          { error: `La suma de efectivo ($${montoEfectivoFinal}) y tarjeta ($${montoTarjetaFinal}) debe ser exactamente igual al total ($${totalCobrar}).` },
          { status: 400 }
        );
      }

      efecRecibidoNum = Number(efectivo_recibido ?? montoEfectivoFinal);
      if (efecRecibidoNum < montoEfectivoFinal) {
        return NextResponse.json(
          { error: `El efectivo recibido ($${efecRecibidoNum}) no cubre la parte en efectivo de $${montoEfectivoFinal}.` },
          { status: 400 }
        );
      }
      cambioNum = Math.round((efecRecibidoNum - montoEfectivoFinal) * 100) / 100;
    }

    // 4. Iniciar transacción con bloqueo de filas de inventario
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Obtener los productos y cantidades consolidadas del ticket
    const consolidadoItems = new Map<number, number>();
    for (const item of ticket.items) {
      const prev = consolidadoItems.get(item.producto_id) || 0;
      consolidadoItems.set(item.producto_id, prev + item.cantidad);
    }

    const productIds = Array.from(consolidadoItems.keys());
    const placeholders = productIds.map(() => "?").join(",");

    // SELECT ... FOR UPDATE sobre el inventario de esta sucursal
    const [invRows]: any = await conn.execute(
      `SELECT i.producto_id, i.existencias, p.nombre
       FROM inventario i
       JOIN productos p ON p.id = i.producto_id
       WHERE i.sucursal_id = ? AND i.producto_id IN (${placeholders})
       FOR UPDATE`,
      [dispositivo.sucursalId, ...productIds]
    );

    const stockMap = new Map<number, { existencias: number; nombre: string }>();
    for (const r of invRows) {
      stockMap.set(Number(r.producto_id), {
        existencias: Number(r.existencias),
        nombre: r.nombre,
      });
    }

    // Comprobar existencias estrictas
    for (const [prodId, reqQty] of Array.from(consolidadoItems.entries())) {
      const info = stockMap.get(prodId);
      const stockDisponible = info ? info.existencias : 0;
      const nombreProd = info ? info.nombre : "Producto";

      if (stockDisponible < reqQty) {
        await conn.rollback();
        return NextResponse.json(
          {
            error: `Existencias insuficientes para "${nombreProd}". Se vendieron unidades en línea y solo quedan ${stockDisponible} en tienda.`,
            productoAfectado: nombreProd,
            stockRestante: stockDisponible,
          },
          { status: 409 }
        );
      }
    }

    // 5. Descontar inventario respetando FEFO (lotes y tabla general)
    for (const [prodId, reqQty] of Array.from(consolidadoItems.entries())) {
      await descontarInventario(conn, prodId, dispositivo.sucursalId, reqQty);
    }

    // 6. Actualizar pedido a estado 'entregado'
    await conn.execute(
      `UPDATE pedidos SET
        estado = 'entregado',
        tipo_entrega = 'mostrador',
        canal = 'tienda',
        metodo_pago = ?,
        referencia_transferencia = ?,
        efectivo_recibido = ?,
        cambio = ?,
        clave_idempotencia = ?,
        entregado_en = NOW()
       WHERE id = ?`,
      [
        metodo_pago,
        metodo_pago === "transferencia" ? (referencia_transferencia?.trim() || null) : null,
        efecRecibidoNum > 0 ? efecRecibidoNum : null,
        cambioNum > 0 ? cambioNum : 0,
        clave_idempotencia || null,
        pedidoId,
      ]
    );

    // 7. Registrar pago
    const proveedorFinal =
      metodo_pago === "efectivo"
        ? "efectivo"
        : metodo_pago === "tarjeta_terminal"
        ? "terminal_pos"
        : metodo_pago === "transferencia"
        ? "transferencia_spei"
        : "mixto";

    const [pagoResult]: any = await conn.execute(
      `INSERT INTO pagos (
        pedido_id, empleado_id, proveedor, referencia_proveedor, estado, monto, autorizacion_terminal, creado_en
      ) VALUES (?, ?, ?, ?, 'aprobado', ?, ?, NOW())`,
      [
        pedidoId,
        session.empleadoId,
        proveedorFinal,
        referencia_transferencia?.trim() || null,
        totalCobrar,
        autorizacion_terminal || null,
      ]
    );

    // 8. Registrar movimientos de caja para el arqueo y corte
    if (metodo_pago === "efectivo") {
      await conn.execute(
        `INSERT INTO movimientos_caja (turno_id, tipo, monto, pedido_id, empleado_id, creado_en)
         VALUES (?, 'venta_efectivo', ?, ?, ?, NOW())`,
        [session.turnoId, totalCobrar, pedidoId, session.empleadoId]
      );
    } else if (metodo_pago === "tarjeta_terminal") {
      await conn.execute(
        `INSERT INTO movimientos_caja (turno_id, tipo, monto, pedido_id, empleado_id, creado_en)
         VALUES (?, 'venta_tarjeta', ?, ?, ?, NOW())`,
        [session.turnoId, totalCobrar, pedidoId, session.empleadoId]
      );
    } else if (metodo_pago === "transferencia") {
      await conn.execute(
        `INSERT INTO movimientos_caja (turno_id, tipo, monto, pedido_id, empleado_id, creado_en)
         VALUES (?, 'venta_transferencia', ?, ?, ?, NOW())`,
        [session.turnoId, totalCobrar, pedidoId, session.empleadoId]
      );
    } else if (metodo_pago === "mixto") {
      if (montoEfectivoFinal > 0) {
        await conn.execute(
          `INSERT INTO movimientos_caja (turno_id, tipo, monto, pedido_id, empleado_id, creado_en)
           VALUES (?, 'venta_efectivo', ?, ?, ?, NOW())`,
          [session.turnoId, montoEfectivoFinal, pedidoId, session.empleadoId]
        );
      }
      if (montoTarjetaFinal > 0) {
        await conn.execute(
          `INSERT INTO movimientos_caja (turno_id, tipo, monto, pedido_id, empleado_id, creado_en)
           VALUES (?, 'venta_tarjeta', ?, ?, ?, NOW())`,
          [session.turnoId, montoTarjetaFinal, pedidoId, session.empleadoId]
        );
      }
    }

    // 9. Registrar evento de pedido
    await conn.execute(
      `INSERT INTO pedido_eventos (pedido_id, estado, nota, creado_en)
       VALUES (?, 'entregado', ?, NOW())`,
      [
        pedidoId,
        `Venta mostrador completada en ${session.cajaNombre} por ${session.nombre} ${session.apellido}.`,
      ]
    );

    // Commit de la transacción
    await conn.commit();

    // 10. Auditoría POS
    await registrarAuditoriaPos(
      "venta_cobrada",
      dispositivo.sucursalId,
      `Venta #${ticket.folio} cobrada por $${totalCobrar} (${metodo_pago}).`,
      session.empleadoId
    );

    // 11. Notificaciones a la clienta (si está registrada)
    if (ticket.clienta?.id) {
      try {
        await notificar(
          ticket.clienta.id,
          {
            tipo: "pedido",
            evento: "compra_mostrador",
            titulo: "¡Gracias por tu compra en tienda!",
            mensaje: `Tu compra con folio ${ticket.folio} por $${totalCobrar} se ha registrado con éxito en tu historial de ${NOMBRE_MARCA}.`,
            enlace: `/cuenta/pedidos/${ticket.folio}`,
          }
        );
      } catch (notifErr) {
        console.error("[notificar Error]:", notifErr);
      }
    }

    // TODO: Si se solicitó WhatsApp, loggear envío (pendiente proveedor WhatsApp)
    if (enviar_whatsapp) {
      const celDestino = whatsapp_celular || ticket.clienta?.celular;
      console.log(`[WhatsApp Ticket]: Envío solicitado a ${celDestino} para folio ${ticket.folio}. (Omitido: proveedor pendiente).`);
    }

    return NextResponse.json({
      exito: true,
      mensaje: "¡Venta cobrada con éxito!",
      recibo: {
        folio: ticket.folio,
        fechaHoraTexto: ticket.fechaHoraTexto,
        total: totalCobrar,
        subtotal: ticket.subtotal,
        totalDescuento: ticket.totalDescuento,
        metodo_pago,
        efectivo_recibido: efecRecibidoNum,
        cambio: cambioNum,
        autorizacion_terminal: autorizacion_terminal || null,
        referencia_transferencia: referencia_transferencia?.trim() || null,
        sucursal: session.sucursalNombreCompleto,
        caja: session.cajaNombre,
        cajera: `${session.nombre} ${session.apellido}`,
        clienta: ticket.clienta,
        items: ticket.items,
        lineasDescuento: ticket.lineasDescuento,
      },
    });
  } catch (error: any) {
    if (conn) {
      try {
        await conn.rollback();
      } catch {}
    }
    console.error("[POST /api/pos/ventas/[id]/cobrar Error]:", error);
    return NextResponse.json(
      { error: "Error al procesar el cobro de la venta", details: error.message },
      { status: 500 }
    );
  } finally {
    if (conn) {
      conn.release();
    }
  }
}

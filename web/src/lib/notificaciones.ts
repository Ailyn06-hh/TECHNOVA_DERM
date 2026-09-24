import { getDbPool } from "./db";
import { sendOrderConfirmationEmail } from "./mailer";
import { NOMBRE_MARCA } from "./marca";

export interface WhatsAppNotificationPayload {
  telefono: string;
  nombreCliente: string;
  folioPedido: string;
  nombreSucursal: string;
  direccionSucursal: string;
  horaRecogida: string;
}

/**
 * Notifica al cliente por WhatsApp cuando su pedido esté listo para recoger
 */
export async function notificarWhatsAppPedidoListo(
  payload: WhatsAppNotificationPayload
): Promise<{ enviado: boolean; mensajeId?: string }> {
  // TODO: Integrar API oficial de WhatsApp Business (Twilio / Meta Graph API)
  // Utiliza el celular registrado del usuario para enviar la plantilla verificada:
  // "¡Hola {nombreCliente}! Tu pedido {folioPedido} de Technova-Derm ya está listo para recoger en {nombreSucursal} ({direccionSucursal})."
  console.log(
    `[WhatsApp Simulado] Mensaje enviado a ${payload.telefono}: Pedido ${payload.folioPedido} listo en ${payload.nombreSucursal}.`
  );

  return {
    enviado: true,
    mensajeId: `wa_msg_${Date.now()}`,
  };
}

/**
 * Envía la confirmación de pedido por correo, registra en notificaciones y programa WhatsApp.
 * Protegido contra duplicados con `confirmacion_enviada`.
 */
export async function enviarConfirmacionPedido(
  pedido: any,
  connOrPool?: any
): Promise<boolean> {
  const db = connOrPool || getDbPool();

  try {
    // 1. Verificar si ya fue enviada para no duplicar correo ni notificación
    const [pRows]: any = await db.execute(
      "SELECT id, folio, usuario_id, total, tipo_entrega, sucursal_id, codigo_recogida, estado, confirmacion_enviada, envio_calle, envio_numero, envio_colonia, envio_cp, envio_ciudad, envio_estado FROM pedidos WHERE id = ? LIMIT 1",
      [pedido.id]
    );

    if (!pRows || pRows.length === 0) return false;
    const p = pRows[0];

    if (Number(p.confirmacion_enviada) === 1) {
      return true; // Ya enviada
    }

    // 2. Obtener datos del usuario
    const [uRows]: any = await db.execute(
      "SELECT nombre, correo, celular FROM usuarios WHERE id = ? LIMIT 1",
      [p.usuario_id]
    );
    const usuario = uRows?.[0] || { nombre: "Cliente", correo: "", celular: "" };

    // 3. Obtener items del pedido
    const [itemRows]: any = await db.execute(
      `SELECT pi.cantidad, pi.precio_unitario, pr.nombre 
       FROM pedido_items pi
       JOIN productos pr ON pr.id = pi.producto_id
       WHERE pi.pedido_id = ?`,
      [p.id]
    );

    const items = (itemRows || []).map((it: any) => ({
      nombre: it.nombre,
      cantidad: Number(it.cantidad),
      precio: Number(it.precio_unitario),
    }));

    // 4. Datos de sucursal o envío
    let sucursalNombre: string | undefined;
    let sucursalDireccion: string | undefined;
    let sucursalHorario: string | undefined;

    if (p.tipo_entrega === "recoger" && p.sucursal_id) {
      const [sRows]: any = await db.execute(
        "SELECT nombre, direccion, direccion_corta, hora_apertura, hora_cierre FROM sucursales WHERE id = ? LIMIT 1",
        [p.sucursal_id]
      );
      if (sRows && sRows.length > 0) {
        sucursalNombre = sRows[0].nombre.startsWith(NOMBRE_MARCA)
          ? sRows[0].nombre
          : `${NOMBRE_MARCA} ${sRows[0].nombre}`;
        sucursalDireccion = sRows[0].direccion;
        if (sRows[0].hora_apertura && sRows[0].hora_cierre) {
          sucursalHorario = `${sRows[0].hora_apertura.slice(0, 5)} - ${sRows[0].hora_cierre.slice(0, 5)}`;
        }
      }
    }

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const enlaceConfirmacion = `${appUrl}/checkout/confirmacion/${p.folio}`;

    const direccionEnvioStr = p.tipo_entrega === "envio"
      ? `${p.envio_calle} #${p.envio_numero}, Col. ${p.envio_colonia}, C.P. ${p.envio_cp}, ${p.envio_ciudad}, ${p.envio_estado}`
      : undefined;

    // 5. Enviar correo vía mailer
    if (usuario.correo) {
      await sendOrderConfirmationEmail({
        to: usuario.correo,
        nombre: usuario.nombre || "Cliente",
        folio: p.folio,
        total: Number(p.total),
        tipoEntrega: p.tipo_entrega,
        codigoRecogida: p.codigo_recogida || undefined,
        sucursalNombre,
        sucursalDireccion,
        sucursalHorario,
        envioDireccion: direccionEnvioStr,
        envioFechaEstimada: "2 a 3 días hábiles",
        items,
        enlaceConfirmacion,
      });
    }

    // 6. Registrar notificación en la base de datos (para la campana de notificaciones)
    const esApartado = p.estado === "por_pagar_en_tienda";
    const tituloNotif = esApartado
      ? `Pedido #${p.folio} apartado con éxito`
      : `Pedido #${p.folio} confirmado`;
    const mensajeNotif = esApartado
      ? `Tu pedido #${p.folio} está apartado en ${sucursalNombre || "tienda"}. Código de recogida: ${p.codigo_recogida || "N/A"}.`
      : `Tu pedido #${p.folio} está confirmado. Te avisaremos cuando esté listo.`;

    await db.execute(
      `INSERT INTO notificaciones (usuario_id, titulo, mensaje, leida, creado_en)
       VALUES (?, ?, ?, 0, NOW())`,
      [p.usuario_id, tituloNotif, mensajeNotif]
    );

    // 7. WhatsApp: TODO (Registrar log o disparar si ya está listo)
    if (usuario.celular) {
      console.log(
        `[WhatsApp Omnicanal] Notificación de confirmación de pedido #${p.folio} para ${usuario.celular}`
      );
    }

    // 8. Marcar confirmacion_enviada = 1
    await db.execute(
      "UPDATE pedidos SET confirmacion_enviada = 1 WHERE id = ?",
      [p.id]
    );

    return true;
  } catch (err) {
    console.error("[enviarConfirmacionPedido Error]:", err);
    return false;
  }
}

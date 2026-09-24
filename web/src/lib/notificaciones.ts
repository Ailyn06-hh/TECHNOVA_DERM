import { getDbPool } from "./db";
import { sendNotificationEmail, sendOrderConfirmationEmail } from "./mailer";
import { NOMBRE_MARCA } from "./marca";
import webpush from "web-push";

// Configuración de llaves VAPID si están presentes en las variables de entorno
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      process.env.VAPID_CORREO || `mailto:notificaciones@technovaderm.com`,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  } catch (err: any) {
    console.error("[VAPID INIT ERROR]:", err.message);
  }
}

export type TipoNotificacion = "pedido" | "recompra" | "favorito" | "promocion" | "cuenta";
export type CategoriaPreferencia = "pedidos" | "recompras" | "favoritos" | "promociones";
export type CanalNotificacion = "push" | "whatsapp" | "correo";

export interface NotificarOptions {
  tipo: TipoNotificacion;
  evento: string;
  titulo: string;
  mensaje: string;
  enlace?: string;
  correo?: string;
}

/**
 * Eventos críticos de seguridad y compra que siempre se envían por correo
 * independientemente de las preferencias del usuario.
 */
const EVENTOS_EXCEPCION_CORREO = [
  "pedido_confirmado",
  "confirmacion_pedido",
  "cambio_password",
  "tarjeta_agregada",
  "tarjeta_eliminada",
  "verificacion_cuenta",
];

/**
 * Función centralizada para emitir avisos en Technova-Derm.
 * 1. Siempre inserta la notificación en la tabla `notificaciones`.
 * 2. Consulta las preferencias del usuario por categoría y despacha en canales activos (Push, Correo, WhatsApp).
 * 3. Registra cada intento en `notificacion_envios`.
 * 4. Nunca rompe el flujo que la llamó.
 */
export async function notificar(
  usuarioId: number,
  options: NotificarOptions,
  connOrPool?: any
): Promise<{ notificacionId?: number; exitoso: boolean }> {
  const db = connOrPool || getDbPool();

  try {
    // 1. Siempre insertar notificación en la tabla
    const [insertResult]: any = await db.execute(
      `INSERT INTO notificaciones 
        (usuario_id, tipo, evento, titulo, mensaje, enlace, leida, creado_en)
       VALUES (?, ?, ?, ?, ?, ?, 0, NOW())`,
      [
        usuarioId,
        options.tipo,
        options.evento || null,
        options.titulo,
        options.mensaje,
        options.enlace || null,
      ]
    );

    const notificacionId = insertResult?.insertId;

    // 2. Determinar categoría de preferencia
    const tipoToCategoria: Record<TipoNotificacion, CategoriaPreferencia> = {
      pedido: "pedidos",
      recompra: "recompras",
      favorito: "favoritos",
      promocion: "promociones",
      cuenta: "pedidos",
    };
    const categoria = tipoToCategoria[options.tipo] || "pedidos";

    // 3. Consultar preferencias de este usuario
    const [prefRows]: any = await db.execute(
      "SELECT canal, activo FROM preferencias_notificacion WHERE usuario_id = ? AND categoria = ?",
      [usuarioId, categoria]
    );

    const prefsMap: Record<CanalNotificacion, boolean> = {
      push: categoria === "pedidos" || categoria === "recompras" || categoria === "favoritos",
      whatsapp: categoria === "pedidos" || categoria === "recompras",
      correo: categoria === "pedidos",
    };

    if (Array.isArray(prefRows) && prefRows.length > 0) {
      for (const p of prefRows) {
        prefsMap[p.canal as CanalNotificacion] = Number(p.activo) === 1;
      }
    }

    // Excepción obligatoria por correo para seguridad / compra
    const forzarCorreo = EVENTOS_EXCEPCION_CORREO.includes(options.evento);
    const canalCorreoActivo = forzarCorreo || prefsMap.correo;

    // 4. Obtener datos del usuario (correo, celular, nombre)
    const [userRows]: any = await db.execute(
      "SELECT nombre, correo, celular FROM usuarios WHERE id = ? LIMIT 1",
      [usuarioId]
    );
    const usuario = userRows?.[0] || { nombre: "Cliente", correo: options.correo || "", celular: "" };

    // --- CANAL 1: PUSH (Notificaciones del navegador) ---
    if (prefsMap.push) {
      try {
        const [subRows]: any = await db.execute(
          "SELECT id, endpoint, p256dh, auth FROM suscripciones_push WHERE usuario_id = ?",
          [usuarioId]
        );

        if (!subRows || subRows.length === 0) {
          await db.execute(
            `INSERT INTO notificacion_envios (notificacion_id, canal, estado, detalle, creado_en)
             VALUES (?, 'push', 'omitido', 'Sin suscripciones push registradas', NOW())`,
            [notificacionId]
          );
        } else {
          for (const sub of subRows) {
            try {
              if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
                const pushPayload = JSON.stringify({
                  titulo: options.titulo,
                  mensaje: options.mensaje,
                  enlace: options.enlace || "/cuenta/notificaciones",
                  tipo: options.tipo,
                  evento: options.evento,
                  icono: "/favicon.ico",
                  marca: NOMBRE_MARCA,
                });

                await webpush.sendNotification(
                  {
                    endpoint: sub.endpoint,
                    keys: {
                      p256dh: sub.p256dh,
                      auth: sub.auth,
                    },
                  },
                  pushPayload
                );

                await db.execute(
                  `INSERT INTO notificacion_envios (notificacion_id, canal, estado, detalle, creado_en)
                   VALUES (?, 'push', 'enviado', ?, NOW())`,
                  [notificacionId, `Enviado a endpoint ${sub.endpoint.slice(0, 40)}...`]
                );
              } else {
                await db.execute(
                  `INSERT INTO notificacion_envios (notificacion_id, canal, estado, detalle, creado_en)
                   VALUES (?, 'push', 'omitido', 'VAPID no configurado en entorno local', NOW())`,
                  [notificacionId]
                );
              }
            } catch (pushErr: any) {
              // Si la suscripción expiró o fue revocada por el navegador (404 o 410 Gone), eliminarla
              const statusCode = pushErr.statusCode || pushErr.status;
              if (statusCode === 404 || statusCode === 410) {
                await db.execute("DELETE FROM suscripciones_push WHERE id = ?", [sub.id]);
                await db.execute(
                  `INSERT INTO notificacion_envios (notificacion_id, canal, estado, detalle, creado_en)
                   VALUES (?, 'push', 'fallido', 'Suscripción caducada (410/404) y eliminada', NOW())`,
                  [notificacionId]
                );
              } else {
                await db.execute(
                  `INSERT INTO notificacion_envios (notificacion_id, canal, estado, detalle, creado_en)
                   VALUES (?, 'push', 'fallido', ?, NOW())`,
                  [notificacionId, `Error push: ${pushErr.message || String(pushErr)}`]
                );
              }
            }
          }
        }
      } catch (err: any) {
        console.error("[notificar Push Error]:", err.message);
      }
    } else {
      await db.execute(
        `INSERT INTO notificacion_envios (notificacion_id, canal, estado, detalle, creado_en)
         VALUES (?, 'push', 'omitido', 'Canal desactivado por preferencias del usuario', NOW())`,
        [notificacionId]
      );
    }

    // --- CANAL 2: CORREO ELECTRÓNICO ---
    if (canalCorreoActivo) {
      const emailDestino = options.correo || usuario.correo;
      if (emailDestino) {
        try {
          const mailRes = await sendNotificationEmail({
            to: emailDestino,
            nombre: usuario.nombre,
            titulo: options.titulo,
            mensaje: options.mensaje,
            enlace: options.enlace,
            evento: options.evento,
          });

          await db.execute(
            `INSERT INTO notificacion_envios (notificacion_id, canal, estado, detalle, creado_en)
             VALUES (?, 'correo', ?, ?, NOW())`,
            [
              notificacionId,
              mailRes.success ? "enviado" : "fallido",
              mailRes.devMode ? "Modo dev (impreso en consola)" : "Enviado por SMTP",
            ]
          );
        } catch (mailErr: any) {
          await db.execute(
            `INSERT INTO notificacion_envios (notificacion_id, canal, estado, detalle, creado_en)
             VALUES (?, 'correo', 'fallido', ?, NOW())`,
            [notificacionId, `Error SMTP: ${mailErr.message}`]
          );
        }
      } else {
        await db.execute(
          `INSERT INTO notificacion_envios (notificacion_id, canal, estado, detalle, creado_en)
           VALUES (?, 'correo', 'omitido', 'Usuario sin correo electrónico registrado', NOW())`,
          [notificacionId]
        );
      }
    } else {
      await db.execute(
        `INSERT INTO notificacion_envios (notificacion_id, canal, estado, detalle, creado_en)
         VALUES (?, 'correo', 'omitido', 'Canal desactivado por preferencias del usuario', NOW())`,
        [notificacionId]
      );
    }

    // --- CANAL 3: WHATSAPP ---
    if (prefsMap.whatsapp) {
      // TODO: Proveedor de WhatsApp Business (Twilio / Meta Graph API). Por ahora se registra como 'omitido'
      await db.execute(
        `INSERT INTO notificacion_envios (notificacion_id, canal, estado, detalle, creado_en)
         VALUES (?, 'whatsapp', 'omitido', 'Proveedor no configurado', NOW())`,
        [notificacionId]
      );
      if (usuario.celular) {
        console.log(
          `[WhatsApp Omnicanal] Aviso "${options.titulo}" programado para ${usuario.celular} (Proveedor no configurado)`
        );
      }
    } else {
      await db.execute(
        `INSERT INTO notificacion_envios (notificacion_id, canal, estado, detalle, creado_en)
         VALUES (?, 'whatsapp', 'omitido', 'Canal desactivado por preferencias del usuario', NOW())`,
        [notificacionId]
      );
    }

    return { notificacionId, exitoso: true };
  } catch (err: any) {
    console.error("[notificar Error Fatal]:", err);
    return { exitoso: false };
  }
}

/**
 * Confirmación de pedido existente adaptada para usar notificar()
 */
export async function enviarConfirmacionPedido(
  pedido: any,
  connOrPool?: any
): Promise<boolean> {
  const db = connOrPool || getDbPool();

  try {
    const [pRows]: any = await db.execute(
      "SELECT id, folio, usuario_id, total, tipo_entrega, sucursal_id, codigo_recogida, estado, confirmacion_enviada, envio_calle, envio_numero, envio_colonia, envio_cp, envio_ciudad, envio_estado FROM pedidos WHERE id = ? LIMIT 1",
      [pedido.id]
    );

    if (!pRows || pRows.length === 0) return false;
    const p = pRows[0];

    if (Number(p.confirmacion_enviada) === 1) {
      return true; // Ya enviada
    }

    const [uRows]: any = await db.execute(
      "SELECT nombre, correo, celular FROM usuarios WHERE id = ? LIMIT 1",
      [p.usuario_id]
    );
    const usuario = uRows?.[0] || { nombre: "Cliente", correo: "", celular: "" };

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

    const esApartado = p.estado === "por_pagar_en_tienda";
    const tituloNotif = esApartado
      ? `Pedido #${p.folio} apartado con éxito`
      : `Pedido #${p.folio} confirmado`;
    const mensajeNotif = esApartado
      ? `Tu pedido #${p.folio} está apartado en ${sucursalNombre || "tienda"}. Código de recogida: ${p.codigo_recogida || "N/A"}.`
      : `Tu pedido #${p.folio} está confirmado. Te avisaremos cuando esté listo.`;

    // Utiliza notificar() centralizado para Push, WhatsApp y base de datos
    await notificar(
      p.usuario_id,
      {
        tipo: "pedido",
        evento: "pedido_confirmado",
        titulo: tituloNotif,
        mensaje: mensajeNotif,
        enlace: `/checkout/confirmacion/${p.folio}`,
        correo: usuario.correo,
      },
      db
    );

    await db.execute("UPDATE pedidos SET confirmacion_enviada = 1 WHERE id = ?", [p.id]);
    return true;
  } catch (err) {
    console.error("[enviarConfirmacionPedido Error]:", err);
    return false;
  }
}

/**
 * Notifica a usuarios compatibles al activar o publicar un nuevo combo.
 * Regla: solo usuarios con promociones activas y máximo 2 avisos promocionales por semana.
 */
export async function avisarComboNuevo(combo: {
  id: number;
  nombre: string;
  tipo_piel?: string | null;
  descuento_porcentaje?: number;
}): Promise<number> {
  const pool = getDbPool();
  let notificadosCount = 0;

  try {
    // 1. Usuarios con la categoría promociones activa en al menos un canal
    const [userRows]: any = await pool.execute(
      `SELECT DISTINCT u.id, u.nombre, u.correo, pp.tipo_piel as user_tipo_piel
       FROM usuarios u
       JOIN preferencias_notificacion pn ON pn.usuario_id = u.id AND pn.categoria = 'promociones' AND pn.activo = 1
       LEFT JOIN perfiles_piel pp ON pp.usuario_id = u.id`
    );

    if (!userRows || userRows.length === 0) return 0;

    for (const u of userRows) {
      // 2. Control de frecuencia: máximo 2 promociones por semana por usuario
      const [weeklyCountRows]: any = await pool.execute(
        `SELECT COUNT(*) as total 
         FROM notificaciones 
         WHERE usuario_id = ? AND tipo = 'promocion' AND creado_en > DATE_SUB(NOW(), INTERVAL 7 DAY)`,
        [u.id]
      );

      if (Number(weeklyCountRows[0]?.total || 0) >= 2) {
        continue;
      }

      // Priorización de tipo de piel si el combo lo especifica
      if (combo.tipo_piel && u.user_tipo_piel && combo.tipo_piel !== "todas" && combo.tipo_piel !== u.user_tipo_piel) {
        continue;
      }

      await notificar(u.id, {
        tipo: "promocion",
        evento: "combo_nuevo",
        titulo: `Nuevo Combo de la Semana: ${combo.nombre}`,
        mensaje: `Ahorra ${combo.descuento_porcentaje ? `${combo.descuento_porcentaje}%` : "más"} en este combo pensado para tu piel en ${NOMBRE_MARCA}.`,
        enlace: "/rutinas#combos",
        correo: u.correo,
      });

      notificadosCount++;
    }
  } catch (err: any) {
    console.error("[avisarComboNuevo Error]:", err.message);
  }

  return notificadosCount;
}

export interface WhatsAppNotificationPayload {
  telefono: string;
  nombreCliente: string;
  folioPedido: string;
  nombreSucursal: string;
  direccionSucursal: string;
  horaRecogida: string;
}

/**
 * Notifica al cliente por WhatsApp cuando su pedido esté listo para recoger (compatibilidad)
 */
export async function notificarWhatsAppPedidoListo(
  payload: WhatsAppNotificationPayload
): Promise<{ enviado: boolean; mensajeId?: string }> {
  console.log(
    `[WhatsApp Simulado] Mensaje enviado a ${payload.telefono}: Pedido ${payload.folioPedido} listo en ${payload.nombreSucursal}.`
  );

  return {
    enviado: true,
    mensajeId: `wa_msg_${Date.now()}`,
  };
}

/**
 * Formatea fechas relativas para notificaciones en español (es-MX)
 */
export function formatearFechaNotificacion(fechaInput: Date | string): string {
  const fecha = new Date(fechaInput);
  const ahora = new Date();
  const diffMs = Math.max(0, ahora.getTime() - fecha.getTime());
  const diffMin = Math.floor(diffMs / (1000 * 60));

  if (diffMin < 60) {
    if (diffMin <= 1) return "Hace un momento";
    return `Hace ${diffMin} min`;
  }

  const esHoy =
    fecha.getDate() === ahora.getDate() &&
    fecha.getMonth() === ahora.getMonth() &&
    fecha.getFullYear() === ahora.getFullYear();

  if (esHoy) {
    const hh = String(fecha.getHours()).padStart(2, "0");
    const mm = String(fecha.getMinutes()).padStart(2, "0");
    return `Hoy · ${hh}:${mm}`;
  }

  const ayer = new Date(ahora);
  ayer.setDate(ahora.getDate() - 1);
  const esAyer =
    fecha.getDate() === ayer.getDate() &&
    fecha.getMonth() === ayer.getMonth() &&
    fecha.getFullYear() === ayer.getFullYear();

  if (esAyer) {
    const hh = String(fecha.getHours()).padStart(2, "0");
    const mm = String(fecha.getMinutes()).padStart(2, "0");
    return `Ayer · ${hh}:${mm}`;
  }

  return fecha.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });
}


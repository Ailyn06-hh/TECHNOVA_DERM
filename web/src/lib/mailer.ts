import nodemailer from "nodemailer";
import { NOMBRE_MARCA, LEMA } from "./marca";

interface SendVerificationEmailOptions {
  to: string;
  code: string;
  nombre?: string;
}

interface SendPasswordResetEmailOptions {
  to: string;
  resetUrl: string;
  nombre?: string;
}

interface SendPasswordChangedOptions {
  to: string;
  nombre?: string;
  fechaHora: string;
}

function getSmtpConfig() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT) || 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const mailFrom = process.env.MAIL_FROM || `${NOMBRE_MARCA} <no-reply@technovaderm.com>`;
  const isConfigured = Boolean(smtpHost && smtpUser && smtpPass);

  return { smtpHost, smtpPort, smtpUser, smtpPass, mailFrom, isConfigured };
}

function getTransporter(config: ReturnType<typeof getSmtpConfig>) {
  return nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass,
    },
  });
}

/**
 * Envía un correo con el código de verificación de 6 dígitos.
 */
export async function sendVerificationEmail({
  to,
  code,
  nombre,
}: SendVerificationEmailOptions): Promise<{ success: boolean; devMode: boolean }> {
  const config = getSmtpConfig();

  // MODO DESARROLLO (Fallback cuando no hay SMTP configurado)
  if (!config.isConfigured) {
    console.log("\n=======================================================");
    console.log("🌸 [TECHNOVA-DERM] CORREO DE VERIFICACIÓN (MODO DEV)");
    console.log(`📧 Destinatario : ${to}`);
    if (nombre) console.log(`👤 Nombre       : ${nombre}`);
    console.log(`🔑 CÓDIGO 6 DÍG : \x1b[1m\x1b[35m${code}\x1b[0m`);
    console.log("⏱️  Vigencia     : 10 minutos");
    console.log("ℹ️  SMTP no configurado en .env.local. Usando consola.");
    console.log("=======================================================\n");
    return { success: true, devMode: true };
  }

  // MODO PRODUCCIÓN / SMTP CONFIGURADO
  try {
    const transporter = getTransporter(config);

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verifica tu cuenta - Technova-Derm</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #FAF7F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1A1715;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FAF7F5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="520" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #EAE4DD;">
                <tr>
                  <td align="center" style="background-color: #6B1F4A; padding: 36px 24px; text-align: center;">
                    <h1 style="margin: 0; color: #FAF7F5; font-size: 26px; font-weight: normal; letter-spacing: -0.5px;">Technova-Derm</h1>
                    <p style="margin: 8px 0 0 0; color: #F3E1E4; font-size: 13px; font-weight: 300;">E-Business Omnicanal & Skincare</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 36px 32px; text-align: center;">
                    <div style="width: 56px; height: 56px; margin: 0 auto 20px auto; background-color: #F3E1E4; border-radius: 50%; line-height: 56px; font-size: 24px;">
                      💬
                    </div>
                    <h2 style="margin: 0 0 12px 0; font-size: 22px; color: #1A1715; font-weight: 600;">Verifica tu cuenta</h2>
                    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #66605C;">
                      ${nombre ? `Hola <strong>${nombre}</strong>,<br>` : ""}
                      Gracias por registrarte. Ingresa el siguiente código de 6 dígitos en la pantalla de verificación para activar tu cuenta:
                    </p>
                    <div style="background-color: #F8F5F0; border: 2px dashed #6B1F4A; border-radius: 14px; padding: 18px 24px; margin: 0 auto 24px auto; display: inline-block;">
                      <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #6B1F4A; font-family: monospace;">${code}</span>
                    </div>
                    <p style="margin: 0 0 16px 0; font-size: 12px; color: #8A817C;">
                      ⏱️ Este código es válido durante <strong>10 minutos</strong>.
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #AAA39D; line-height: 1.4;">
                      Si tú no creaste esta cuenta, puedes desestimar este mensaje de forma segura.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #F8F5F0; padding: 20px 24px; text-align: center; border-top: 1px solid #ECE7E1;">
                    <p style="margin: 0; font-size: 11px; color: #9A928D;">
                      © 2026 Technova-Derm · E-Business Omnicanal · HackaTec 2026
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: config.mailFrom,
      to,
      subject: `${code} es tu código de verificación de Technova-Derm`,
      text: `Tu código de verificación de Technova-Derm es: ${code}. Es válido durante 10 minutos.`,
      html: htmlContent,
    });

    console.log(`[MAILER] Correo de verificación enviado con éxito a ${to}`);
    return { success: true, devMode: false };
  } catch (err: any) {
    console.error("[MAILER ERROR] Error al enviar correo vía SMTP:", err.message);
    console.log(`🌸 [FALLBACK DEV CODE]: ${code} para ${to}`);
    return { success: false, devMode: false };
  }
}

/**
 * Envía un correo con el enlace seguro para restablecer la contraseña.
 */
export async function sendPasswordResetEmail({
  to,
  resetUrl,
  nombre,
}: SendPasswordResetEmailOptions): Promise<{ success: boolean; devMode: boolean }> {
  const config = getSmtpConfig();

  // MODO DESARROLLO (Fallback cuando no hay SMTP configurado)
  if (!config.isConfigured) {
    console.log("\n=======================================================");
    console.log("🔑 [TECHNOVA-DERM] RECUPERACIÓN DE CONTRASEÑA (MODO DEV)");
    console.log(`📧 Destinatario : ${to}`);
    if (nombre) console.log(`👤 Nombre       : ${nombre}`);
    console.log(`🔗 ENLACE RESET : \x1b[1m\x1b[36m${resetUrl}\x1b[0m`);
    console.log("⏱️  Vigencia     : 30 minutos (un solo uso)");
    console.log("ℹ️  SMTP no configurado en .env.local. Usa el enlace de arriba.");
    console.log("=======================================================\n");
    return { success: true, devMode: true };
  }

  // MODO PRODUCCIÓN / SMTP CONFIGURADO
  try {
    const transporter = getTransporter(config);

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recupera tu contraseña - Technova-Derm</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #FAF7F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1A1715;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FAF7F5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="520" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #EAE4DD;">
                <tr>
                  <td align="center" style="background-color: #6B1F4A; padding: 36px 24px; text-align: center;">
                    <h1 style="margin: 0; color: #FAF7F5; font-size: 26px; font-weight: normal; letter-spacing: -0.5px;">Technova-Derm</h1>
                    <p style="margin: 8px 0 0 0; color: #F3E1E4; font-size: 13px; font-weight: 300;">E-Business Omnicanal & Skincare</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 36px 32px; text-align: center;">
                    <div style="width: 56px; height: 56px; margin: 0 auto 20px auto; background-color: #F3E1E4; border-radius: 50%; line-height: 56px; font-size: 24px;">
                      🔒
                    </div>
                    <h2 style="margin: 0 0 12px 0; font-size: 22px; color: #1A1715; font-weight: 600;">Recupera tu contraseña</h2>
                    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #66605C;">
                      ${nombre ? `Hola <strong>${nombre}</strong>,<br>` : ""}
                      Recibimos una solicitud para restablecer la contraseña de tu cuenta en Technova-Derm. Haz clic en el siguiente botón para crear una nueva:
                    </p>

                    <!-- Botón Vino Principal -->
                    <div style="margin: 0 auto 28px auto;">
                      <a href="${resetUrl}" style="background-color: #6B1F4A; color: #FFFFFF; text-decoration: none; padding: 14px 32px; border-radius: 9999px; font-size: 14px; font-weight: 600; display: inline-block; box-shadow: 0 2px 6px rgba(107,31,74,0.3);">
                        Crear nueva contraseña
                      </a>
                    </div>

                    <p style="margin: 0 0 12px 0; font-size: 12px; color: #8A817C;">
                      ⏱️ Este enlace es de <strong>un solo uso</strong> y vence en <strong>30 minutos</strong>.
                    </p>
                    <p style="margin: 0 0 20px 0; font-size: 12px; color: #AAA39D; line-height: 1.4;">
                      Si no solicitaste este cambio, puedes ignorar este correo de forma segura; tu contraseña actual continuará protegida.
                    </p>

                    <!-- Enlace de respaldo en texto plano -->
                    <div style="border-top: 1px dashed #EAE4DD; padding-top: 16px; text-align: left;">
                      <p style="margin: 0 0 6px 0; font-size: 11px; color: #8A817C;">
                        ¿El botón no funciona? Copia y pega este enlace en tu navegador:
                      </p>
                      <p style="margin: 0; font-size: 11px; color: #6B1F4A; word-break: break-all; font-family: monospace;">
                        ${resetUrl}
                      </p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #F8F5F0; padding: 20px 24px; text-align: center; border-top: 1px solid #ECE7E1;">
                    <p style="margin: 0; font-size: 11px; color: #9A928D;">
                      © 2026 Technova-Derm · E-Business Omnicanal · HackaTec 2026
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: config.mailFrom,
      to,
      subject: "Enlace para restablecer tu contraseña - Technova-Derm",
      text: `Para restablecer tu contraseña en Technova-Derm, abre el siguiente enlace: ${resetUrl} (Vence en 30 minutos).`,
      html: htmlContent,
    });

    console.log(`[MAILER] Correo de recuperación enviado con éxito a ${to}`);
    return { success: true, devMode: false };
  } catch (err: any) {
    console.error("[MAILER ERROR] Error al enviar correo de recuperación vía SMTP:", err.message);
    console.log(`🔑 [FALLBACK DEV RESET LINK]: ${resetUrl} para ${to}`);
    return { success: false, devMode: false };
  }
}

/**
 * Envía un correo avisando que la contraseña se cambió exitosamente.
 */
export async function sendPasswordChangedConfirmationEmail({
  to,
  nombre,
  fechaHora,
}: SendPasswordChangedOptions): Promise<{ success: boolean; devMode: boolean }> {
  const config = getSmtpConfig();

  // MODO DESARROLLO (Fallback cuando no hay SMTP configurado)
  if (!config.isConfigured) {
    console.log("\n=======================================================");
    console.log("🛡️ [TECHNOVA-DERM] CONTRASEÑA ACTUALIZADA (MODO DEV)");
    console.log(`📧 Destinatario : ${to}`);
    if (nombre) console.log(`👤 Nombre       : ${nombre}`);
    console.log(`🕒 Fecha y Hora : ${fechaHora}`);
    console.log("ℹ️  SMTP no configurado en .env.local. Usando consola.");
    console.log("=======================================================\n");
    return { success: true, devMode: true };
  }

  // MODO PRODUCCIÓN / SMTP CONFIGURADO
  try {
    const transporter = getTransporter(config);

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contraseña actualizada - Technova-Derm</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #FAF7F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1A1715;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FAF7F5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="520" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #EAE4DD;">
                <tr>
                  <td align="center" style="background-color: #6B1F4A; padding: 36px 24px; text-align: center;">
                    <h1 style="margin: 0; color: #FAF7F5; font-size: 26px; font-weight: normal; letter-spacing: -0.5px;">Technova-Derm</h1>
                    <p style="margin: 8px 0 0 0; color: #F3E1E4; font-size: 13px; font-weight: 300;">E-Business Omnicanal & Skincare</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 36px 32px; text-align: center;">
                    <div style="width: 56px; height: 56px; margin: 0 auto 20px auto; background-color: #E3EDE6; border-radius: 50%; line-height: 56px; font-size: 24px;">
                      ✅
                    </div>
                    <h2 style="margin: 0 0 12px 0; font-size: 22px; color: #1A1715; font-weight: 600;">Contraseña actualizada</h2>
                    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #66605C;">
                      ${nombre ? `Hola <strong>${nombre}</strong>,<br>` : ""}
                      Te confirmamos que la contraseña de tu cuenta de Technova-Derm fue cambiada exitosamente el <strong>${fechaHora}</strong>.
                    </p>
                    <p style="margin: 0; font-size: 12px; color: #8A817C; line-height: 1.4;">
                      Si tú no realizaste este cambio, por favor contacta de inmediato con nuestro equipo de soporte técnico para proteger tu cuenta.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #F8F5F0; padding: 20px 24px; text-align: center; border-top: 1px solid #ECE7E1;">
                    <p style="margin: 0; font-size: 11px; color: #9A928D;">
                      © 2026 Technova-Derm · E-Business Omnicanal · HackaTec 2026
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: config.mailFrom,
      to,
      subject: "Tu contraseña de Technova-Derm ha sido actualizada",
      text: `Tu contraseña de Technova-Derm fue actualizada el ${fechaHora}. Si no fuiste tú, contacta a soporte inmediatamente.`,
      html: htmlContent,
    });

    console.log(`[MAILER] Correo de confirmación de cambio enviado a ${to}`);
    return { success: true, devMode: false };
  } catch (err: any) {
    console.error("[MAILER ERROR] Error al enviar confirmación de cambio de contraseña:", err.message);
    return { success: false, devMode: false };
  }
}

export interface SendOrderConfirmationEmailOptions {
  to: string;
  nombre: string;
  folio: string;
  total: number;
  tipoEntrega: "recoger" | "envio";
  codigoRecogida?: string;
  sucursalNombre?: string;
  sucursalDireccion?: string;
  sucursalHorario?: string;
  envioDireccion?: string;
  envioFechaEstimada?: string;
  items: Array<{ nombre: string; cantidad: number; precio: number }>;
  enlaceConfirmacion: string;
}

/**
 * Envía el correo de confirmación de pedido con folio, productos, entrega y enlace.
 */
export async function sendOrderConfirmationEmail(
  options: SendOrderConfirmationEmailOptions
): Promise<{ success: boolean; devMode: boolean }> {
  const config = getSmtpConfig();
  const {
    to,
    nombre,
    folio,
    total,
    tipoEntrega,
    codigoRecogida,
    sucursalNombre,
    sucursalDireccion,
    sucursalHorario,
    envioDireccion,
    envioFechaEstimada,
    items,
    enlaceConfirmacion,
  } = options;

  const totalFormateado = `$${Number(total).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  // MODO DESARROLLO (Fallback cuando no hay SMTP configurado)
  if (!config.isConfigured) {
    console.log("\n=======================================================");
    console.log("🌸 [TECHNOVA-DERM] CORREO DE CONFIRMACIÓN DE PEDIDO (MODO DEV)");
    console.log(`📧 Destinatario : ${to}`);
    console.log(`👤 Nombre       : ${nombre}`);
    console.log(`📦 Folio Pedido : #${folio}`);
    console.log(`💰 Total        : ${totalFormateado}`);
    console.log(`🚚 Tipo Entrega : ${tipoEntrega === "recoger" ? "Recoger en Tienda" : "Envío a Domicilio"}`);
    if (tipoEntrega === "recoger") {
      console.log(`🏪 Sucursal     : ${sucursalNombre} (${sucursalDireccion})`);
      console.log(`🔑 Código Recog.: ${codigoRecogida || "N/A"}`);
      if (sucursalHorario) console.log(`🕒 Horario      : ${sucursalHorario}`);
    } else {
      console.log(`🏠 Dirección    : ${envioDireccion}`);
      console.log(`📅 Estimado     : ${envioFechaEstimada || "2 a 3 días hábiles"}`);
    }
    console.log(`📋 Productos    : ${items.map((it) => `${it.cantidad}x ${it.nombre} ($${it.precio})`).join(", ")}`);
    console.log(`🔗 Confirmación : ${enlaceConfirmacion}`);
    console.log("ℹ️  SMTP no configurado en .env.local. Usando consola.");
    console.log("=======================================================\n");
    return { success: true, devMode: true };
  }

  // MODO PRODUCCIÓN / SMTP CONFIGURADO
  try {
    const transporter = getTransporter(config);

    const itemsHtml = items
      .map(
        (it) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #ECE7E1; font-size: 13px; color: #1A1715;">
            <strong>${it.cantidad}x</strong> ${it.nombre}
          </td>
          <td align="right" style="padding: 10px 0; border-bottom: 1px solid #ECE7E1; font-size: 13px; font-weight: 600; color: #1A1715;">
            $${(Number(it.precio) * it.cantidad).toFixed(2)}
          </td>
        </tr>
      `
      )
      .join("");

    const detalleEntregaHtml =
      tipoEntrega === "recoger"
        ? `
        <div style="background-color: #F8F5F0; border-radius: 12px; padding: 18px; margin: 20px 0; text-align: left;">
          <p style="margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; font-weight: bold; color: #6B1F4A; letter-spacing: 0.5px;">Recolección en Tienda Física</p>
          <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: #1A1715;">${sucursalNombre}</p>
          <p style="margin: 0 0 10px 0; font-size: 12px; color: #66605C;">${sucursalDireccion}</p>
          ${
            codigoRecogida
              ? `<div style="background-color: #FFFFFF; border: 1px solid #E2D9D0; border-radius: 8px; padding: 12px; text-align: center;">
                  <span style="display: block; font-size: 11px; color: #8A817C; text-transform: uppercase;">Código de recogida:</span>
                  <span style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #1A1715; font-family: monospace;">${codigoRecogida}</span>
                  <span style="display: block; font-size: 11px; color: #8A817C; margin-top: 4px;">Muéstralo en caja para retirar tu pedido</span>
                </div>`
              : ""
          }
        </div>
      `
        : `
        <div style="background-color: #F8F5F0; border-radius: 12px; padding: 18px; margin: 20px 0; text-align: left;">
          <p style="margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; font-weight: bold; color: #6B1F4A; letter-spacing: 0.5px;">Envío a Domicilio</p>
          <p style="margin: 0 0 6px 0; font-size: 13px; color: #1A1715;"><strong>Dirección:</strong> ${envioDireccion}</p>
          <p style="margin: 0; font-size: 12px; color: #66605C;"><strong>Tiempo estimado:</strong> ${envioFechaEstimada || "2 a 3 días hábiles"}</p>
        </div>
      `;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pedido confirmado #${folio} - Technova-Derm</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #FAF7F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1A1715;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FAF7F5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="560" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #EAE4DD;">
                <tr>
                  <td align="center" style="background-color: #6B1F4A; padding: 36px 24px; text-align: center;">
                    <h1 style="margin: 0; color: #FAF7F5; font-size: 26px; font-weight: normal; letter-spacing: -0.5px;">Technova-Derm</h1>
                    <p style="margin: 8px 0 0 0; color: #F3E1E4; font-size: 13px; font-weight: 300;">Skincare pensado en tus días</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 36px 32px;">
                    <div style="text-align: center; margin-bottom: 24px;">
                      <div style="width: 56px; height: 56px; margin: 0 auto 16px auto; background-color: #E3EDE6; border-radius: 50%; line-height: 56px; font-size: 24px; text-align: center;">
                        🎉
                      </div>
                      <h2 style="margin: 0 0 8px 0; font-size: 22px; color: #1A1715; font-weight: 600;">¡Listo, ${nombre}! Tu pedido está confirmado</h2>
                      <p style="margin: 0; font-size: 13px; color: #8A817C;">Folio: <strong style="color: #6B1F4A;">#${folio}</strong></p>
                    </div>

                    ${detalleEntregaHtml}

                    <div style="margin: 24px 0;">
                      <h3 style="margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #8A817C; font-weight: 600;">Resumen del pedido</h3>
                      <table width="100%" border="0" cellspacing="0" cellpadding="0">
                        ${itemsHtml}
                        <tr>
                          <td style="padding: 14px 0 0 0; font-size: 15px; font-weight: 600; color: #1A1715;">Total:</td>
                          <td align="right" style="padding: 14px 0 0 0; font-size: 18px; font-weight: bold; color: #1A1715;">${totalFormateado}</td>
                        </tr>
                      </table>
                    </div>

                    <div style="text-align: center; margin-top: 32px;">
                      <a href="${enlaceConfirmacion}" style="display: inline-block; background-color: #6B1F4A; color: #FFFFFF; text-decoration: none; padding: 14px 28px; border-radius: 50px; font-size: 13px; font-weight: 600;">
                        Ver detalles de mi pedido
                      </a>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #F8F5F0; padding: 20px 24px; text-align: center; border-top: 1px solid #ECE7E1;">
                    <p style="margin: 0; font-size: 11px; color: #9A928D;">
                      © 2026 Technova-Derm · Compra en línea, en la app o en tienda.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: config.mailFrom,
      to,
      subject: `¡Pedido confirmado #${folio}! - Technova-Derm`,
      text: `¡Listo, ${nombre}! Tu pedido #${folio} de Technova-Derm está confirmado por un total de ${totalFormateado}. Consulta los detalles aquí: ${enlaceConfirmacion}`,
      html: htmlContent,
    });

    console.log(`[MAILER] Correo de confirmación de pedido #${folio} enviado a ${to}`);
    return { success: true, devMode: false };
  } catch (err: any) {
    console.error("[MAILER ERROR] Error al enviar confirmación de pedido:", err.message);
    return { success: false, devMode: false };
  }
}

/**
 * Notificación por correo sobre alta o baja de tarjeta guardada
 */
export async function sendCardActivityEmail({
  to,
  nombre,
  accion,
  marca = "Tarjeta",
  ultimos4,
}: {
  to: string;
  nombre?: string;
  accion: "agregada" | "eliminada";
  marca?: string;
  ultimos4: string;
}): Promise<{ success: boolean; devMode: boolean }> {
  const config = getSmtpConfig();
  const mensajeAccion =
    accion === "agregada"
      ? `Se agregó la tarjeta ${marca.toUpperCase()} terminación ${ultimos4} a tu cuenta.`
      : `Se eliminó la tarjeta terminación ${ultimos4} de tu cuenta.`;

  if (!config.isConfigured) {
    console.log("\n=======================================================");
    console.log("💳 [TECHNOVA-DERM] ACTIVIDAD DE TARJETA (MODO DEV)");
    console.log(`📧 Destinatario : ${to}`);
    if (nombre) console.log(`👤 Nombre       : ${nombre}`);
    console.log(`🔐 Notificación : ${mensajeAccion}`);
    console.log("=======================================================\n");
    return { success: true, devMode: true };
  }

  try {
    const transporter = getTransporter(config);
    await transporter.sendMail({
      from: config.mailFrom,
      to,
      subject: `Seguridad en tu cuenta: ${mensajeAccion} - ${NOMBRE_MARCA}`,
      text: `Hola ${nombre || "cliente"},\n\nTe informamos que ${mensajeAccion.toLowerCase()} Si no reconoces este movimiento, por favor contáctanos de inmediato.\n\nAtentamente,\nEquipo de ${NOMBRE_MARCA}`,
    });
    return { success: true, devMode: false };
  } catch (err: any) {
    console.error("[MAILER ERROR] Error al enviar correo de actividad de tarjeta:", err.message);
    return { success: false, devMode: false };
  }
}

export interface SendNotificationEmailOptions {
  to: string;
  nombre?: string;
  titulo: string;
  mensaje: string;
  enlace?: string;
  evento?: string;
}

/**
 * Envío de correos para notificaciones de eventos (pedidos, recompras, ofertas, etc.)
 */
export async function sendNotificationEmail({
  to,
  nombre,
  titulo,
  mensaje,
  enlace,
  evento,
}: SendNotificationEmailOptions): Promise<{ success: boolean; devMode: boolean }> {
  const config = getSmtpConfig();
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const urlFinal = enlace
    ? enlace.startsWith("http")
      ? enlace
      : `${appUrl}${enlace.startsWith("/") ? "" : "/"}${enlace}`
    : appUrl;

  if (!config.isConfigured) {
    console.log("\n=======================================================");
    console.log(`🔔 [${NOMBRE_MARCA}] CORREO DE NOTIFICACIÓN (MODO DEV)`);
    console.log(`📧 Destinatario : ${to}`);
    if (nombre) console.log(`👤 Nombre       : ${nombre}`);
    console.log(`🏷️ Evento       : ${evento || "general"}`);
    console.log(`📌 Título       : ${titulo}`);
    console.log(`💬 Mensaje      : ${mensaje}`);
    if (enlace) console.log(`🔗 Enlace       : ${urlFinal}`);
    console.log("=======================================================\n");
    return { success: true, devMode: true };
  }

  try {
    const transporter = getTransporter(config);
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <title>${titulo} - ${NOMBRE_MARCA}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #FAF7F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1A1715;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FAF7F5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="520" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #EAE4DD;">
                <tr>
                  <td align="center" style="background-color: #6B1F4A; padding: 30px 24px; text-align: center;">
                    <h1 style="margin: 0; color: #FAF7F5; font-size: 24px; font-weight: normal;">${NOMBRE_MARCA}</h1>
                    <p style="margin: 6px 0 0 0; color: #F3E1E4; font-size: 12px; font-weight: 300;">${LEMA}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 32px 28px; text-align: left;">
                    <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #1A1715; font-weight: 600;">${titulo}</h2>
                    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #66605C;">
                      ${nombre ? `Hola <strong>${nombre}</strong>,<br><br>` : ""}${mensaje}
                    </p>
                    ${
                      enlace
                        ? `<div style="text-align: center; margin-top: 24px;">
                            <a href="${urlFinal}" style="display: inline-block; background-color: #6B1F4A; color: #FFFFFF; text-decoration: none; padding: 12px 26px; border-radius: 50px; font-size: 13px; font-weight: 600;">
                              Ver en ${NOMBRE_MARCA}
                            </a>
                          </div>`
                        : ""
                    }
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #F8F5F0; padding: 16px 20px; text-align: center; border-top: 1px solid #ECE7E1;">
                    <p style="margin: 0; font-size: 11px; color: #9A928D;">
                      © 2026 ${NOMBRE_MARCA} · Compra en línea, en la app o en tienda.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: config.mailFrom,
      to,
      subject: `${titulo} - ${NOMBRE_MARCA}`,
      text: `${titulo}\n\n${nombre ? `Hola ${nombre},\n\n` : ""}${mensaje}\n\n${enlace ? `Accede aquí: ${urlFinal}` : ""}\n\n${NOMBRE_MARCA}`,
      html: htmlContent,
    });

    return { success: true, devMode: false };
  } catch (err: any) {
    console.error("[MAILER NOTIFICATION ERROR]:", err.message);
    return { success: false, devMode: false };
  }
}

export interface SendCorteCajaEmailOptions {
  to: string;
  sucursalNombre: string;
  cajaNombre: string;
  cajeraNombre: string;
  turnoId: number;
  inicioTurno: string;
  finTurno: string;
  fondoInicial: number;
  efectivoEsperado: number;
  efectivoContado: number;
  tarjetaEsperado: number;
  tarjetaContado: number;
  transferenciaEsperado: number;
  transferenciaContado: number;
  totalEsperado: number;
  totalContado: number;
  diferenciaTotal: number;
  ventasCount: number;
  ventasTotal: number;
  ticketPromedio: number;
  pedidosEntregados: number;
  devolucionesCount: number;
  devolucionesTotal: number;
  notas?: string | null;
  supervisorNombre?: string | null;
}

/**
 * Envío de reporte de corte de caja a gerencia de sucursal
 */
export async function sendCorteCajaEmail(
  opts: SendCorteCajaEmailOptions
): Promise<{ success: boolean; devMode: boolean }> {
  const config = getSmtpConfig();
  const fmt = (n: number) =>
    `$${Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const diffColor =
    Math.abs(opts.diferenciaTotal) <= 10
      ? "#059669"
      : opts.diferenciaTotal < 0
      ? "#DC2626"
      : "#D97706";

  if (!config.isConfigured) {
    console.log("\n=======================================================");
    console.log(`📊 [${NOMBRE_MARCA}] CORTE DE CAJA ENVIADO A GERENCIA (MODO DEV)`);
    console.log(`📧 Destinatario       : ${opts.to}`);
    console.log(`🏪 Sucursal / Caja    : ${opts.sucursalNombre} · ${opts.cajaNombre}`);
    console.log(`👤 Cajera             : ${opts.cajeraNombre}`);
    console.log(`🕒 Turno #${opts.turnoId}         : ${opts.inicioTurno} -> ${opts.finTurno}`);
    console.log(`💳 Ventas mostrador   : ${opts.ventasCount} (${fmt(opts.ventasTotal)}) · Prom: ${fmt(opts.ticketPromedio)}`);
    console.log(`📦 Pickups entregados : ${opts.pedidosEntregados}`);
    console.log(`💵 Fondo Inicial      : ${fmt(opts.fondoInicial)}`);
    console.log(`💵 Efectivo           : Esperado ${fmt(opts.efectivoEsperado)} | Contado ${fmt(opts.efectivoContado)}`);
    console.log(`💳 Tarjeta            : Esperado ${fmt(opts.tarjetaEsperado)} | Contado ${fmt(opts.tarjetaContado)}`);
    console.log(`🏛️ Transferencia      : Esperado ${fmt(opts.transferenciaEsperado)} | Contado ${fmt(opts.transferenciaContado)}`);
    console.log(`⚖️ Balance Total      : Esperado ${fmt(opts.totalEsperado)} | Contado ${fmt(opts.totalContado)} | Dif: ${fmt(opts.diferenciaTotal)}`);
    if (opts.supervisorNombre) console.log(`🛡️ Autorizado por     : ${opts.supervisorNombre}`);
    if (opts.notas) console.log(`📝 Notas              : ${opts.notas}`);
    console.log("ℹ️  SMTP no configurado en .env.local. Resumen enviado a consola.");
    console.log("=======================================================\n");
    return { success: true, devMode: true };
  }

  try {
    const transporter = getTransporter(config);
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <title>Corte de Caja Turno #${opts.turnoId} - ${NOMBRE_MARCA}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #FAF7F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1A1715;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FAF7F5; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="580" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #EAE4DD;">
                <tr>
                  <td align="center" style="background-color: #6B1F4A; padding: 30px 24px; text-align: center;">
                    <h1 style="margin: 0; color: #FAF7F5; font-size: 24px; font-weight: normal;">${NOMBRE_MARCA}</h1>
                    <p style="margin: 6px 0 0 0; color: #F3E1E4; font-size: 13px;">Reporte Oficial de Cierre y Arqueo de Caja</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 28px 24px;">
                    <div style="background-color: #F8F5F0; border-radius: 12px; padding: 16px; margin-bottom: 20px; font-size: 12px; line-height: 1.6; color: #57534E;">
                      <strong style="color: #1A1715; font-size: 14px;">Turno #${opts.turnoId} · ${opts.sucursalNombre}</strong><br>
                      <strong>Caja:</strong> ${opts.cajaNombre} &nbsp;|&nbsp; <strong>Cajera:</strong> ${opts.cajeraNombre}<br>
                      <strong>Inicio:</strong> ${opts.inicioTurno} &nbsp;|&nbsp; <strong>Cierre:</strong> ${opts.finTurno}
                    </div>

                    <h3 style="margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #78716C;">Resumen Operativo</h3>
                    <table width="100%" border="0" cellspacing="0" cellpadding="8" style="font-size: 12px; border-collapse: collapse; margin-bottom: 20px;">
                      <tr style="border-bottom: 1px solid #E7E5E4;">
                        <td>Ventas Mostrador</td>
                        <td align="right"><strong>${opts.ventasCount}</strong> (${fmt(opts.ventasTotal)})</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #E7E5E4;">
                        <td>Ticket Promedio</td>
                        <td align="right"><strong>${fmt(opts.ticketPromedio)}</strong></td>
                      </tr>
                      <tr style="border-bottom: 1px solid #E7E5E4;">
                        <td>Pedidos Recogidos (Omnicanal)</td>
                        <td align="right"><strong>${opts.pedidosEntregados}</strong></td>
                      </tr>
                      <tr style="border-bottom: 1px solid #E7E5E4;">
                        <td>Devoluciones</td>
                        <td align="right"><strong>${opts.devolucionesCount}</strong> (${fmt(opts.devolucionesTotal)})</td>
                      </tr>
                    </table>

                    <h3 style="margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #78716C;">Arqueo y Cierre de Valores</h3>
                    <table width="100%" border="0" cellspacing="0" cellpadding="8" style="font-size: 12px; border-collapse: collapse; margin-bottom: 20px;">
                      <tr style="background-color: #F5F5F4; font-weight: bold; font-size: 11px; text-transform: uppercase;">
                        <td>Método</td>
                        <td align="right">Esperado</td>
                        <td align="right">Contado</td>
                        <td align="right">Diferencia</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #E7E5E4;">
                        <td>Efectivo <span style="font-size: 10px; color: #78716C;">(Inc. fondo ${fmt(opts.fondoInicial)})</span></td>
                        <td align="right">${fmt(opts.efectivoEsperado)}</td>
                        <td align="right"><strong>${fmt(opts.efectivoContado)}</strong></td>
                        <td align="right">${fmt(opts.efectivoContado - opts.efectivoEsperado)}</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #E7E5E4;">
                        <td>Tarjeta Terminal</td>
                        <td align="right">${fmt(opts.tarjetaEsperado)}</td>
                        <td align="right"><strong>${fmt(opts.tarjetaContado)}</strong></td>
                        <td align="right">${fmt(opts.tarjetaContado - opts.tarjetaEsperado)}</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #E7E5E4;">
                        <td>Transferencia SPEI</td>
                        <td align="right">${fmt(opts.transferenciaEsperado)}</td>
                        <td align="right"><strong>${fmt(opts.transferenciaContado)}</strong></td>
                        <td align="right">${fmt(opts.transferenciaContado - opts.transferenciaEsperado)}</td>
                      </tr>
                      <tr style="background-color: #FAF7F5; font-weight: bold; font-size: 13px;">
                        <td>TOTAL</td>
                        <td align="right">${fmt(opts.totalEsperado)}</td>
                        <td align="right">${fmt(opts.totalContado)}</td>
                        <td align="right" style="color: ${diffColor};">${fmt(opts.diferenciaTotal)}</td>
                      </tr>
                    </table>

                    ${
                      opts.supervisorNombre
                        ? `<div style="padding: 10px 14px; background-color: #FEF3C7; border: 1px solid #FCD34D; border-radius: 10px; font-size: 11px; color: #92400E; margin-bottom: 16px;">
                            🛡️ <strong>Autorización de Supervisión:</strong> Diferencia autorizada por <strong>${opts.supervisorNombre}</strong>.
                          </div>`
                        : ""
                    }

                    ${
                      opts.notas
                        ? `<div style="background-color: #F8F5F0; border-radius: 10px; padding: 12px; font-size: 12px; color: #57534E; margin-bottom: 16px;">
                            <strong>Notas del turno:</strong><br>${opts.notas}
                          </div>`
                        : ""
                    }
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #F8F5F0; padding: 16px 20px; text-align: center; border-top: 1px solid #ECE7E1;">
                    <p style="margin: 0; font-size: 11px; color: #9A928D;">
                      © 2026 ${NOMBRE_MARCA} · Sistema POS Omnicanal · Cierre automático
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: config.mailFrom,
      to: opts.to,
      subject: `Corte de Caja Turno #${opts.turnoId} - ${opts.sucursalNombre} - ${NOMBRE_MARCA}`,
      text: `Corte de caja Turno #${opts.turnoId} en ${opts.sucursalNombre} (${opts.cajaNombre}). Cajera: ${opts.cajeraNombre}. Total contado: ${fmt(opts.totalContado)}. Diferencia: ${fmt(opts.diferenciaTotal)}.`,
      html: htmlContent,
    });

    return { success: true, devMode: false };
  } catch (err: any) {
    console.error("[MAILER CORTE ERROR]:", err.message);
    return { success: false, devMode: false };
  }
}



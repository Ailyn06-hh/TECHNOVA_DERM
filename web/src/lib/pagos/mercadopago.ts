import crypto from "crypto";
import { getDbPool } from "@/lib/db";
import type {
  ProveedorPagos,
  PaymentPedido,
  ResultadoCobro,
  PreferenciaRedireccion,
  ResultadoWebhook,
  DatosTarjetaToken,
} from "./types";

/**
 * Adaptador oficial de Mercado Pago (REST API en modo Sandbox)
 * No requiere librerías binarias externas y opera mediante HTTPS seguro.
 */
export class ProveedorMercadoPago implements ProveedorPagos {
  readonly nombre = "mercadopago";
  private accessToken: string;
  private webhookSecret: string;

  constructor() {
    this.accessToken = process.env.MP_ACCESS_TOKEN || "";
    this.webhookSecret = process.env.MP_WEBHOOK_SECRET || "";
  }

  async cobrar(
    pedido: PaymentPedido,
    token: string,
    claveIdempotencia: string
  ): Promise<ResultadoCobro> {
    if (!this.accessToken) {
      console.warn("[MercadoPago] MP_ACCESS_TOKEN no configurado en entorno.");
      return {
        aprobado: false,
        estado: "rechazado",
        mensaje: "El proveedor de pagos Mercado Pago no está configurado adecuadamente.",
      };
    }

    try {
      const response = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`,
          "X-Idempotency-Key": claveIdempotencia,
        },
        body: JSON.stringify({
          token,
          transaction_amount: pedido.total,
          description: `Pedido ${pedido.folio} - Technova-Derm`,
          payment_method_id: "visa", // Autodetectado por MP al procesar el token
          payer: {
            email: pedido.usuario_correo || "cliente@technovaderm.com",
            first_name: pedido.usuario_nombre || "Cliente",
          },
          external_reference: pedido.folio,
        }),
      });

      const data = await response.json();

      if (data.status === "approved") {
        return {
          aprobado: true,
          estado: "aprobado",
          idTransaccion: String(data.id),
          mensaje: "Pago aprobado con éxito.",
          detalleJson: data,
        };
      }

      if (data.status_detail === "cc_rejected_insufficient_amount") {
        return {
          aprobado: false,
          estado: "fondos_insuficientes",
          idTransaccion: String(data.id || ""),
          mensaje: "Fondos insuficientes en la tarjeta.",
          detalleJson: data,
        };
      }

      return {
        aprobado: false,
        estado: "rechazado",
        idTransaccion: String(data.id || ""),
        mensaje: data.message || "Tu banco rechazó el pago. Prueba con otra tarjeta.",
        detalleJson: data,
      };
    } catch (err: any) {
      console.error("[MercadoPago Error]:", err);
      return {
        aprobado: false,
        estado: "rechazado",
        mensaje: "Error de conexión con la pasarela de pagos.",
        detalleJson: { error: err.message },
      };
    }
  }

  async crearPreferencia(
    pedido: PaymentPedido,
    backUrls: { success: string; failure: string; pending: string }
  ): Promise<PreferenciaRedireccion> {
    if (!this.accessToken) {
      throw new Error("MP_ACCESS_TOKEN no configurado.");
    }

    const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({
        items: [
          {
            title: `Pedido ${pedido.folio} - Technova-Derm`,
            unit_price: pedido.total,
            quantity: 1,
          },
        ],
        external_reference: pedido.folio,
        back_urls: backUrls,
        auto_return: "approved",
      }),
    });

    const data = await response.json();
    return {
      idPreferencia: data.id,
      initPoint: data.init_point || data.sandbox_init_point,
    };
  }

  async verificarWebhook(
    headers: Record<string, string | string[] | undefined>,
    body: any
  ): Promise<ResultadoWebhook> {
    // Verificación de firma HMAC si MP_WEBHOOK_SECRET está configurado
    const xSignature = (headers["x-signature"] || "") as string;
    const xRequestId = (headers["x-request-id"] || "") as string;

    if (this.webhookSecret && xSignature) {
      const parts = xSignature.split(",");
      let ts = "";
      let hash = "";
      for (const p of parts) {
        const [k, v] = p.split("=");
        if (k.trim() === "ts") ts = v.trim();
        if (k.trim() === "v1") hash = v.trim();
      }

      const manifest = `id:${body?.data?.id};request-id:${xRequestId};ts:${ts};`;
      const expectedHash = crypto
        .createHmac("sha256", this.webhookSecret)
        .update(manifest)
        .digest("hex");

      if (hash !== expectedHash) {
        return { valido: false };
      }
    }

    const paymentId = body?.data?.id;
    if (!paymentId || !this.accessToken) {
      return { valido: false };
    }

    // Consultar el estado real del pago en Mercado Pago
    try {
      const pRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${this.accessToken}` },
      });
      const paymentData = await pRes.json();

      let estado: "aprobado" | "rechazado" | "pendiente" = "pendiente";
      if (paymentData.status === "approved") estado = "aprobado";
      else if (paymentData.status === "rejected") estado = "rechazado";

      return {
        valido: true,
        folio: paymentData.external_reference,
        estado,
        transaccionId: String(paymentData.id),
        detalleJson: paymentData,
      };
    } catch {
      return { valido: false };
    }
  }

  async guardarTarjeta(
    usuarioId: number,
    token: string,
    datos: DatosTarjetaToken
  ): Promise<{ id: number; token: string }> {
    const pool = getDbPool();

    await pool.execute(
      "UPDATE metodos_pago SET predeterminado = 0 WHERE usuario_id = ?",
      [usuarioId]
    );

    const [res]: any = await pool.execute(
      `INSERT INTO metodos_pago 
       (usuario_id, proveedor, token_proveedor, marca, ultimos4, titular, mes_vencimiento, anio_vencimiento, predeterminado, creado_en)
       VALUES (?, 'mercadopago', ?, ?, ?, ?, ?, ?, 1, NOW())`,
      [
        usuarioId,
        token,
        datos.marca.toLowerCase(),
        datos.ultimos4,
        datos.titular,
        datos.mesVencimiento,
        datos.anioVencimiento,
      ]
    );

    return {
      id: res.insertId,
      token,
    };
  }
}

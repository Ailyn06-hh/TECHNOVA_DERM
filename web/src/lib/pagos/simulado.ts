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
 * Adaptador de Pagos Simulado para Entorno de Desarrollo y Pruebas
 * NO procesa cargos reales.
 * Reglas de simulación basadas en la terminación del token o tarjeta:
 * - 4242: Aprobado
 * - 0002: Rechazado por el banco
 * - 9995: Fondos insuficientes
 */
export class ProveedorSimulado implements ProveedorPagos {
  readonly nombre = "simulado";

  async cobrar(
    pedido: PaymentPedido,
    token: string,
    claveIdempotencia: string
  ): Promise<ResultadoCobro> {
    // Extraer terminación de 4 dígitos si viene en el token (ej. tok_sim_4242_...)
    const match = token.match(/(\d{4})/);
    const ultimos4 = match ? match[1] : "4242";

    // 1. Simular Rechazo Bancario (0002)
    if (ultimos4 === "0002" || token.includes("0002")) {
      return {
        aprobado: false,
        estado: "rechazado",
        mensaje: "Tu banco rechazó el pago. Prueba con otra tarjeta.",
        idTransaccion: `sim_tx_err_${Date.now()}`,
        detalleJson: {
          motivo: "cc_rejected_high_risk",
          claveIdempotencia,
          ultimos4,
        },
      };
    }

    // 2. Simular Fondos Insuficientes (9995)
    if (ultimos4 === "9995" || token.includes("9995")) {
      return {
        aprobado: false,
        estado: "fondos_insuficientes",
        mensaje: "Fondos insuficientes en tu tarjeta. Intenta con otra tarjeta o método de pago.",
        idTransaccion: `sim_tx_insuf_${Date.now()}`,
        detalleJson: {
          motivo: "cc_rejected_insufficient_amount",
          claveIdempotencia,
          ultimos4,
        },
      };
    }

    // 3. Caso por defecto o 4242: Aprobado
    return {
      aprobado: true,
      estado: "aprobado",
      mensaje: "Pago aprobado exitosamente.",
      idTransaccion: `sim_tx_ok_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      detalleJson: {
        proveedor: "simulado",
        claveIdempotencia,
        monto: pedido.total,
        folio: pedido.folio,
        ultimos4,
        fecha: new Date().toISOString(),
      },
    };
  }

  async crearPreferencia(
    pedido: PaymentPedido,
    backUrls: { success: string; failure: string; pending: string }
  ): Promise<PreferenciaRedireccion> {
    const prefId = `pref_sim_${pedido.folio}_${Date.now()}`;
    // Pantalla intermedia simulada para Mercado Pago Checkout Pro
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const initPoint = `${appUrl}/checkout/simulado-mercadopago?prefId=${prefId}&folio=${pedido.folio}&total=${pedido.total}&success=${encodeURIComponent(backUrls.success)}&failure=${encodeURIComponent(backUrls.failure)}`;

    return {
      idPreferencia: prefId,
      initPoint,
    };
  }

  async verificarWebhook(
    headers: Record<string, string | string[] | undefined>,
    body: any
  ): Promise<ResultadoWebhook> {
    // En modo simulado, aceptar payloads de prueba
    if (!body || !body.data) {
      return { valido: false };
    }

    const { pedidoId, folio, estado, idTransaccion } = body.data;
    return {
      valido: true,
      pedidoId: pedidoId ? Number(pedidoId) : undefined,
      folio: folio || undefined,
      estado: estado === "aprobado" ? "aprobado" : "rechazado",
      transaccionId: idTransaccion || `sim_wh_${Date.now()}`,
      detalleJson: body,
    };
  }

  async guardarTarjeta(
    usuarioId: number,
    token: string,
    datos: DatosTarjetaToken,
    predeterminado: boolean = true
  ): Promise<{ id: number; token: string }> {
    const pool = getDbPool();

    // Contar cuántas tarjetas tiene el usuario
    const [countRows]: any = await pool.execute(
      "SELECT COUNT(*) as total FROM metodos_pago WHERE usuario_id = ?",
      [usuarioId]
    );
    const esPrimera = Number(countRows[0]?.total || 0) === 0;
    const debeSerPredeterminada = predeterminado || esPrimera;

    if (debeSerPredeterminada) {
      await pool.execute(
        "UPDATE metodos_pago SET predeterminado = 0 WHERE usuario_id = ?",
        [usuarioId]
      );
    }

    const [res]: any = await pool.execute(
      `INSERT INTO metodos_pago 
       (usuario_id, proveedor, token_proveedor, marca, ultimos4, titular, mes_vencimiento, anio_vencimiento, predeterminado, creado_en)
       VALUES (?, 'simulado', ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        usuarioId,
        token,
        datos.marca.toLowerCase(),
        datos.ultimos4,
        datos.titular,
        datos.mesVencimiento,
        datos.anioVencimiento,
        debeSerPredeterminada ? 1 : 0,
      ]
    );

    return {
      id: res.insertId,
      token,
    };
  }

  async eliminarTarjeta(
    usuarioId: number,
    metodoPagoId: number
  ): Promise<boolean> {
    const pool = getDbPool();

    const [rows]: any = await pool.execute(
      "SELECT id, predeterminado FROM metodos_pago WHERE id = ? AND usuario_id = ? LIMIT 1",
      [metodoPagoId, usuarioId]
    );

    if (!rows || rows.length === 0) {
      return false;
    }

    const eraPredeterminado = rows[0].predeterminado === 1;

    await pool.execute(
      "DELETE FROM metodos_pago WHERE id = ? AND usuario_id = ?",
      [metodoPagoId, usuarioId]
    );

    // Si era la predeterminada, la siguiente tarjeta vigente pasa a serlo
    if (eraPredeterminado) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      const [nextCards]: any = await pool.execute(
        `SELECT id FROM metodos_pago 
         WHERE usuario_id = ? 
           AND (anio_vencimiento > ? OR (anio_vencimiento = ? AND mes_vencimiento >= ?))
         ORDER BY id DESC LIMIT 1`,
        [usuarioId, currentYear, currentYear, currentMonth]
      );

      if (nextCards && nextCards.length > 0) {
        await pool.execute(
          "UPDATE metodos_pago SET predeterminado = 1 WHERE id = ?",
          [nextCards[0].id]
        );
      }
    }

    return true;
  }
}

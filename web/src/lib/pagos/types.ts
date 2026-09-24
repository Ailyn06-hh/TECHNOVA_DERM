/**
 * Tipos e interfaces comunes para el módulo de pagos de Technova-Derm
 * Soporta adaptadores desacoplados (simulado y mercadopago)
 */

export interface PaymentPedido {
  id: number;
  folio: string;
  total: number;
  usuario_id: number;
  usuario_correo?: string;
  usuario_nombre?: string;
}

export interface ResultadoCobro {
  aprobado: boolean;
  estado: "aprobado" | "rechazado" | "pendiente" | "fondos_insuficientes";
  idTransaccion?: string;
  mensaje: string;
  detalleJson?: any;
}

export interface PreferenciaRedireccion {
  idPreferencia: string;
  initPoint: string;
}

export interface ResultadoWebhook {
  valido: boolean;
  pedidoId?: number;
  folio?: string;
  estado?: "aprobado" | "rechazado" | "pendiente";
  transaccionId?: string;
  detalleJson?: any;
}

export interface DatosTarjetaToken {
  marca: string;
  ultimos4: string;
  titular: string;
  mesVencimiento: number;
  anioVencimiento: number;
}

export interface ProveedorPagos {
  readonly nombre: string;

  /**
   * Procesa el cobro de un pedido con tarjeta (tokenizada) o método directo
   */
  cobrar(
    pedido: PaymentPedido,
    token: string,
    claveIdempotencia: string
  ): Promise<ResultadoCobro>;

  /**
   * Crea una preferencia de pago para pasarelas con redirección (Checkout Pro)
   */
  crearPreferencia(
    pedido: PaymentPedido,
    backUrls: { success: string; failure: string; pending: string }
  ): Promise<PreferenciaRedireccion>;

  /**
   * Valida la autenticidad de una notificación webhook y extrae su estado
   */
  verificarWebhook(
    headers: Record<string, string | string[] | undefined>,
    body: any
  ): Promise<ResultadoWebhook>;

  /**
   * Almacena de forma segura una tarjeta tokenizada para uso futuro del usuario
   * REGLA: Nunca guarda números completos ni CVV
   */
  guardarTarjeta(
    usuarioId: number,
    token: string,
    datos: DatosTarjetaToken,
    predeterminado?: boolean
  ): Promise<{ id: number; token: string }>;

  /**
   * Elimina de forma segura una tarjeta guardada en el proveedor y en la base de datos
   */
  eliminarTarjeta(
    usuarioId: number,
    metodoPagoId: number
  ): Promise<boolean>;
}

import { ProveedorSimulado } from "./simulado";
import { ProveedorMercadoPago } from "./mercadopago";
import type { ProveedorPagos } from "./types";

export * from "./types";
export * from "./simulado";
export * from "./mercadopago";
export * from "./tokenizar";

/**
 * Retorna el adaptador de pagos activo según la variable de entorno PAGOS_PROVEEDOR.
 * Por defecto en desarrollo es 'simulado'.
 */
export function getProveedorPagos(): ProveedorPagos {
  const proveedor = (process.env.PAGOS_PROVEEDOR || "simulado").toLowerCase();

  if (proveedor === "mercadopago") {
    return new ProveedorMercadoPago();
  }

  return new ProveedorSimulado();
}

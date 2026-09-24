/**
 * Utilidades de formato de precios para Technova-Derm
 */
export function formatearPrecio(monto: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(monto);
}

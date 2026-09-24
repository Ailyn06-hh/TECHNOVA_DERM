/**
 * Matriz de roles y permisos para el Punto de Venta (POS) de Technova-Derm.
 * Permite verificar si la colaboradora en turno puede ejecutar acciones sensibles
 * o si se requiere autorización / PIN de supervisora.
 */

export type RolPos = "cajera" | "supervisora" | "gerente" | "admin";

export type AccionPos =
  | "iniciar_turno"
  | "cobrar_venta"
  | "cancelar_borrador"
  | "descuento_manual"
  | "cancelar_venta_cobrada"
  | "devolucion"
  | "apertura_cajon"
  | "corte_caja"
  | "ajuste_inventario"
  | "desbloqueo_codigo_recogida"
  | "entrega_sin_codigo";

export const PERMISOS_POS: Record<AccionPos, RolPos[]> = {
  iniciar_turno: ["cajera", "supervisora", "gerente", "admin"],
  cobrar_venta: ["cajera", "supervisora", "gerente", "admin"],
  cancelar_borrador: ["cajera", "supervisora", "gerente", "admin"],
  descuento_manual: ["supervisora", "gerente", "admin"],
  cancelar_venta_cobrada: ["supervisora", "gerente", "admin"],
  devolucion: ["supervisora", "gerente", "admin"],
  apertura_cajon: ["supervisora", "gerente", "admin"],
  corte_caja: ["cajera", "supervisora", "gerente", "admin"],
  ajuste_inventario: ["supervisora", "gerente", "admin"],
  desbloqueo_codigo_recogida: ["supervisora", "gerente", "admin"],
  entrega_sin_codigo: ["supervisora", "gerente", "admin"],
};

/**
 * Verifica si un rol tiene permiso para ejecutar una acción directa.
 */
export function tienePermisoPos(rol: RolPos | string, accion: AccionPos): boolean {
  const rolesPermitidos = PERMISOS_POS[accion] || [];
  return rolesPermitidos.includes(rol as RolPos);
}

/**
 * Indica si una acción requiere PIN supervisor en caso de que la cajera no tenga el rol.
 */
export function requiereAutorizacionSupervisor(rol: RolPos | string, accion: AccionPos): boolean {
  return !tienePermisoPos(rol, accion);
}

export default {
  PERMISOS_POS,
  tienePermisoPos,
  requiereAutorizacionSupervisor,
};

/**
 * Matriz de roles y permisos para el Punto de Venta (POS) de Technova-Derm.
 */

const PERMISOS_POS = {
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

function tienePermisoPos(rol, accion) {
  const rolesPermitidos = PERMISOS_POS[accion] || [];
  return rolesPermitidos.includes(rol);
}

function requiereAutorizacionSupervisor(rol, accion) {
  return !tienePermisoPos(rol, accion);
}

module.exports = {
  PERMISOS_POS,
  tienePermisoPos,
  requiereAutorizacionSupervisor,
  default: {
    PERMISOS_POS,
    tienePermisoPos,
    requiereAutorizacionSupervisor,
  },
};

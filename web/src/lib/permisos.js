/**
 * Centralizador de permisos Admin CRM Technova-Derm (versión JS)
 */
export function tienePermiso(admin, recurso, accion = "ver", sucursalId = null) {
  if (!admin) return false;
  if (admin.rol === "admin") return true;

  if (admin.rol === "gerente") {
    if (sucursalId !== null && sucursalId !== undefined) {
      const allowed = Array.isArray(admin.sucursales) ? admin.sucursales : [];
      if (!allowed.includes(Number(sucursalId))) {
        return false;
      }
    }

    switch (recurso) {
      case "panel":
      case "pedidos":
      case "inventario":
      case "productos":
      case "clientes":
      case "reportes":
        return true;
      case "reabastecimiento":
        return accion === "ver" || accion === "crear";
      case "promociones":
      case "usuarios":
        return accion === "ver";
      case "configuracion":
        return false;
      default:
        return false;
    }
  }

  return false;
}

export function puedeGestionarSucursal(admin, sucursalId) {
  if (!admin) return false;
  if (admin.rol === "admin") return true;
  const allowed = Array.isArray(admin.sucursales) ? admin.sucursales : [];
  return allowed.includes(Number(sucursalId));
}

export function obtenerSucursalesPermitidas(admin) {
  if (!admin) return [];
  if (admin.rol === "admin") return null;
  return admin.sucursales || [];
}

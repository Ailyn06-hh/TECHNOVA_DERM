import { AdminSessionData } from "./admin-session";

export type RolAdmin = "admin" | "gerente";

export type RecursoAdmin =
  | "panel"
  | "productos"
  | "inventario"
  | "pedidos"
  | "clientes"
  | "promociones"
  | "reabastecimiento"
  | "reportes"
  | "usuarios"
  | "configuracion";

export type AccionAdmin =
  | "ver"
  | "crear"
  | "editar"
  | "eliminar"
  | "aprobar_descuento"
  | "ajustar_inventario"
  | "cancelar_pedido"
  | "reembolsar"
  | "exportar_excel"
  | "gestionar_roles"
  | "crear_orden";

/**
 * Determina si el administrador tiene permiso para realizar una acción sobre un recurso,
 * opcionalmente validando la sucursal sobre la que opera.
 */
export function tienePermiso(
  admin: AdminSessionData | null | undefined,
  recurso: RecursoAdmin,
  accion: AccionAdmin = "ver",
  sucursalId?: number | null
): boolean {
  if (!admin) return false;

  // El rol 'admin' (Dueña / Administradora General) tiene acceso irrestricto
  if (admin.rol === "admin") {
    return true;
  }

  // Si el rol es 'gerente', solo tiene acceso a sus sucursales asignadas
  if (admin.rol === "gerente") {
    // Si la acción requiere sucursal específica, validar que pertenezca a sus sucursales
    if (sucursalId !== undefined && sucursalId !== null) {
      if (!admin.sucursales.includes(Number(sucursalId))) {
        return false;
      }
    }

    // Reglas específicas por recurso para gerente
    switch (recurso) {
      case "panel":
      case "pedidos":
      case "inventario":
      case "productos":
      case "clientes":
      case "reportes":
        return true;

      case "reabastecimiento":
        // El gerente puede ver y solicitar reabastecimiento para su tienda
        return accion === "ver" || accion === "crear";

      case "promociones":
        // El gerente puede ver combos y promociones
        return accion === "ver";

      case "usuarios":
        // El gerente no puede cambiar roles ni crear administradores globales
        return accion === "ver";

      case "configuracion":
        // Configuración global está reservada para admin
        return false;

      default:
        return false;
    }
  }

  return false;
}

/**
 * Valida si el administrador puede gestionar una sucursal dada.
 */
export function puedeGestionarSucursal(
  admin: AdminSessionData | null | undefined,
  sucursalId: number
): boolean {
  if (!admin) return false;
  if (admin.rol === "admin") return true;
  return admin.sucursales.includes(Number(sucursalId));
}

/**
 * Retorna las sucursales permitidas para consultas SQL.
 * Si es null, significa que tiene acceso a todas las sucursales.
 */
export function obtenerSucursalesPermitidas(
  admin: AdminSessionData | null | undefined
): number[] | null {
  if (!admin) return [];
  if (admin.rol === "admin") return null; // Todas
  return admin.sucursales || [];
}

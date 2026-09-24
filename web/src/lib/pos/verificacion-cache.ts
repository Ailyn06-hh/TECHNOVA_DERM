// In-memory cache for pickup code validations (TTL: 5 minutes)
declare global {
  // eslint-disable-next-line no-var
  var _posPickupVerificationCache: Map<string, { expiraEn: number; supervisoraId?: number }> | undefined;
}

const cache = global._posPickupVerificationCache || new Map<string, { expiraEn: number; supervisoraId?: number }>();
if (process.env.NODE_ENV !== "production") {
  global._posPickupVerificationCache = cache;
}

export function marcarCodigoVerificado(folio: string, empleadoId: number, supervisoraId?: number) {
  const clave = `${folio.toUpperCase()}:${empleadoId}`;
  cache.set(clave, {
    expiraEn: Date.now() + 5 * 60 * 1000, // 5 minutos
    supervisoraId,
  });
}

export function estaCodigoVerificado(folio: string, empleadoId: number): boolean {
  const clave = `${folio.toUpperCase()}:${empleadoId}`;
  const data = cache.get(clave);
  if (!data) return false;
  if (Date.now() > data.expiraEn) {
    cache.delete(clave);
    return false;
  }
  return true;
}

export function limpiarVerificacion(folio: string, empleadoId: number) {
  const clave = `${folio.toUpperCase()}:${empleadoId}`;
  cache.delete(clave);
}

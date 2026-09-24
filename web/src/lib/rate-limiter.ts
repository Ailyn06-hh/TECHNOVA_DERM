/**
 * Rate Limiter en memoria con ventana deslizante (Sliding Window)
 * Límite configurado: máximo 5 registros por IP cada hora
 */

import { NextRequest } from "next/server";

interface RegistroIntento {
  timestamps: number[];
}

// Mapa en memoria para tracking por IP
const registroIpMap = new Map<string, RegistroIntento>();

const VENTANA_MS = 60 * 60 * 1000; // 1 hora
const MAX_REGISTROS_POR_HORA = 5;

/**
 * Extrae la IP del cliente a partir de cabeceras de proxy o conexión
 */
export function obtenerIpCliente(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

/**
 * Verifica si la IP ha superado el límite de 5 registros por hora.
 */
export function verificarLimiteRegistroIp(ip: string): {
  permitido: boolean;
  restantes: number;
  reintentoEnSegundos?: number;
} {
  const ahora = Date.now();
  const limiteInferior = ahora - VENTANA_MS;

  const data = registroIpMap.get(ip);
  if (!data) {
    return { permitido: true, restantes: MAX_REGISTROS_POR_HORA };
  }

  // Filtrar timestamps que sigan dentro de la ventana de 1 hora
  data.timestamps = data.timestamps.filter((ts) => ts > limiteInferior);

  if (data.timestamps.length >= MAX_REGISTROS_POR_HORA) {
    const timestampMasAntiguo = data.timestamps[0];
    const tiempoParaLiberar = Math.ceil((timestampMasAntiguo + VENTANA_MS - ahora) / 1000);
    return {
      permitido: false,
      restantes: 0,
      reintentoEnSegundos: Math.max(1, tiempoParaLiberar),
    };
  }

  return {
    permitido: true,
    restantes: MAX_REGISTROS_POR_HORA - data.timestamps.length,
  };
}

/**
 * Registra un nuevo intento exitoso/consumido de registro para la IP
 */
export function registrarIntentoRegistroIp(ip: string): void {
  const ahora = Date.now();
  const data = registroIpMap.get(ip) || { timestamps: [] };
  data.timestamps.push(ahora);
  registroIpMap.set(ip, data);
}

/**
 * Función para resetear en entornos de pruebas
 */
export function _resetearRateLimiter(): void {
  registroIpMap.clear();
}

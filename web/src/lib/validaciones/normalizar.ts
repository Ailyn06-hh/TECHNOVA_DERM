/**
 * Funciones de normalización y limpieza de entradas de usuario
 * Regla: La contraseña NUNCA se normaliza ni se recorta (los espacios cuentan).
 */

/**
 * Normaliza un correo electrónico:
 * - Elimina espacios al inicio y al final
 * - Convierte a minúsculas
 */
export function normalizarCorreo(correo: string | null | undefined): string {
  if (!correo) return "";
  return correo.trim().toLowerCase();
}

/**
 * Normaliza un número celular mexicano a exactamente 10 dígitos:
 * - Elimina espacios, guiones, paréntesis, puntos y caracteres no numéricos
 * - Si inicia con el código de país +52 o 52 y tiene 12 dígitos, retira el prefijo 52
 * - Si tiene 10 dígitos, devuelve esos 10 dígitos
 */
export function normalizarCelular(celular: string | null | undefined): string {
  if (!celular) return "";

  // 1. Eliminar cualquier caracter que no sea dígito
  let digits = celular.replace(/\D/g, "");

  // 2. Si viene con prefijo mexicano '52' seguido de 10 dígitos (12 dígitos en total)
  if (digits.length === 12 && digits.startsWith("52")) {
    digits = digits.slice(2);
  }

  // 3. Si viene con 13 dígitos por prefijo '052' o '044' (histórico mexicano)
  if (digits.length === 13 && digits.startsWith("052")) {
    digits = digits.slice(3);
  }

  return digits;
}

/**
 * Normaliza nombres y apellidos:
 * - Quita espacios al inicio y final
 * - Colapsa múltiples espacios consecutivos en un solo espacio
 */
export function normalizarTexto(texto: string | null | undefined): string {
  if (!texto) return "";
  return texto.trim().replace(/\s+/g, " ");
}

export type TipoIdentificador = "correo" | "celular" | "invalido";

export interface IdentificadorNormalizado {
  tipo: TipoIdentificador;
  valor: string;
  original: string;
  esValido: boolean;
}

/**
 * Detecta si el identificador ingresado en login o recuperación es correo o celular
 * y lo normaliza según corresponda.
 */
export function normalizarIdentificador(
  identificador: string | null | undefined
): IdentificadorNormalizado {
  const original = identificador || "";
  const trimmed = original.trim();

  // Si contiene arroba '@', se evalúa como correo
  if (trimmed.includes("@")) {
    const correoNormalizado = normalizarCorreo(trimmed);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const esValido = emailRegex.test(correoNormalizado);

    return {
      tipo: "correo",
      valor: correoNormalizado,
      original,
      esValido,
    };
  }

  // En caso contrario, se evalúa como celular
  const celularNormalizado = normalizarCelular(trimmed);
  const esValido = celularNormalizado.length === 10;

  return {
    tipo: "celular",
    valor: celularNormalizado,
    original,
    esValido,
  };
}

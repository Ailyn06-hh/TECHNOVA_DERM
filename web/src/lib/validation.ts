/**
 * Utilidades de validación compartidas para autenticación y recuperación de contraseñas
 */

export const PASSWORD_HELP_TEXT = "Mínimo 8 caracteres, con una mayúscula y un número";

/**
 * Valida la robustez de una contraseña:
 * - Al menos 8 caracteres
 * - Al menos una letra mayúscula
 * - Al menos un dígito numérico
 */
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (!password) {
    return { isValid: false, error: "Ingresa una contraseña." };
  }

  const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(password)) {
    return {
      isValid: false,
      error: "Mínimo 8 caracteres, con al menos una mayúscula y un número.",
    };
  }

  return { isValid: true };
}

/**
 * Valida que la contraseña y su confirmación coincidan
 */
export function validatePasswordConfirmation(
  password: string,
  confirmPassword: string
): { isValid: boolean; error?: string } {
  if (!confirmPassword) {
    return { isValid: false, error: "Confirma tu contraseña." };
  }

  if (password !== confirmPassword) {
    return { isValid: false, error: "Las contraseñas no coinciden." };
  }

  return { isValid: true };
}

/**
 * Valida si un identificador es un correo válido o un número celular mexicano de 10 dígitos
 */
export function validateIdentifier(identifier: string): {
  isValid: boolean;
  type?: "email" | "phone";
  cleanValue: string;
  error?: string;
} {
  const trimmed = (identifier || "").trim();

  if (!trimmed) {
    return {
      isValid: false,
      cleanValue: "",
      error: "Por favor ingresa tu correo electrónico o celular.",
    };
  }

  // 1. Evaluar si es correo
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(trimmed)) {
    return {
      isValid: true,
      type: "email",
      cleanValue: trimmed.toLowerCase(),
    };
  }

  // 2. Evaluar si es celular (10 dígitos)
  const phoneDigits = trimmed.replace(/\D/g, "");
  if (phoneDigits.length === 10) {
    return {
      isValid: true,
      type: "phone",
      cleanValue: phoneDigits,
    };
  }

  return {
    isValid: false,
    cleanValue: trimmed,
    error: "Ingresa un correo electrónico válido o un celular de 10 dígitos.",
  };
}

/**
 * Diccionario centralizado de mensajes de validación y error en español
 */

export const MENSAJES_VALIDACION = {
  // Nombres
  NOMBRE_REQUERIDO: "El nombre es obligatorio.",
  NOMBRE_LONGITUD: "El nombre debe tener entre 2 y 50 caracteres.",
  NOMBRE_MIN_LONGITUD: "El nombre debe tener al menos 2 caracteres.",
  NOMBRE_CARACTERES_INVALIDOS: "El nombre solo puede contener letras, acentos, espacios, apóstrofe y guion.",
  NOMBRE_SOLO_SIMBOLOS: "El nombre no puede consistir únicamente de espacios o símbolos.",

  // Apellidos
  APELLIDO_REQUERIDO: "El apellido es obligatorio.",
  APELLIDO_LONGITUD: "El apellido debe tener entre 2 y 50 caracteres.",
  APELLIDO_MIN_LONGITUD: "El apellido debe tener al menos 2 caracteres.",
  APELLIDO_CARACTERES_INVALIDOS: "El apellido solo puede contener letras, acentos, espacios, apóstrofe y guion.",
  APELLIDO_SOLO_SIMBOLOS: "El apellido no puede consistir únicamente de espacios o símbolos.",

  // Correo
  CORREO_REQUERIDO: "Ingresa tu correo electrónico.",
  CORREO_INVALIDO: "Ingresa un correo electrónico con formato válido.",
  CORREO_MAX_LONGITUD: "El correo electrónico no puede exceder 254 caracteres.",
  CORREO_DUPLICADO: "Este correo ya tiene una cuenta",

  // Celular
  CELULAR_REQUERIDO: "Ingresa tu número celular.",
  CELULAR_INVALIDO: "El número celular debe tener exactamente 10 dígitos.",
  CELULAR_DUPLICADO: "Este celular ya está registrado",

  // Identificador mixto (Login / Recuperar)
  IDENTIFICADOR_REQUERIDO: "Por favor ingresa tu correo electrónico o celular.",
  IDENTIFICADOR_INVALIDO: "Ingresa un correo electrónico válido o un celular de 10 dígitos.",

  // Contraseña - Reglas individuales para PasswordRequirements
  REGLA_LONGITUD_MINIMA: "Mínimo 8 caracteres",
  REGLA_LONGITUD_MAXIMA_BYTES: "Máximo 72 bytes de longitud",
  REGLA_MAYUSCULA: "Al menos una letra mayúscula",
  REGLA_MINUSCULA: "Al menos una letra minúscula",
  REGLA_NUMERO: "Al menos un número",
  REGLA_SIN_ESPACIOS_EXTREMOS: "Sin espacios al inicio ni al final",
  REGLA_SIN_DATOS_PERSONALES: "No debe incluir tu nombre, apellido o correo",
  REGLA_NO_COMUN: "No debe ser una contraseña común o fácil de adivinar",

  // Contraseña - Errores de formulario
  CONTRASENA_REQUERIDA: "Ingresa tu contraseña.",
  CONTRASENA_CONFIRMACION_REQUERIDA: "Confirma tu contraseña.",
  CONTRASENAS_NO_COINCIDEN: "Las contraseñas no coinciden.",
  CONTRASENA_NO_CUMPLE_REQUISITOS: "La contraseña no cumple con todos los requisitos de seguridad.",
  CONTRASENA_IGUAL_ANTERIOR: "La nueva contraseña no puede ser idéntica a la contraseña actual. Elige una diferente.",

  // Términos y privacidad
  TERMINOS_REQUERIDOS: "Debes aceptar el aviso de privacidad y los términos para continuar.",

  // Servidor y seguridad
  CAMPOS_DESCONOCIDOS: "La solicitud contiene campos desconocidos o no permitidos.",
  TIPO_INCORRECTO: "Tipo de dato incorrecto para este campo.",
  RATE_LIMIT_REGISTRO: "Has alcanzado el límite de 5 registros por hora. Por favor intenta más tarde.",
} as const;

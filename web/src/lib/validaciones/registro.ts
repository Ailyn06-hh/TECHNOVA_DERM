/**
 * Validaciones específicas para el flujo de Registro de usuarios
 * Reglas compartidas entre el cliente (RegisterForm.tsx) y el servidor (POST /api/auth/registro)
 */

import { normalizarTexto, normalizarCorreo, normalizarCelular } from "./normalizar";
import { validarContrasena } from "./contrasena";
import { MENSAJES_VALIDACION } from "./mensajes";

// Letras permitidas en español (con acentos, diéresis, ñ), espacios, apóstrofo y guion
const CARACTERES_NOMBRE_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ' -]+$/;
const CONTIENE_LETRAS_REGEX = /[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CampoValidado {
  valida: boolean;
  error?: string;
  valorLimpio: string;
}

/**
 * Valida el Nombre:
 * - Obligatorio
 * - De 2 a 50 caracteres tras normalizar
 * - Solo letras (incluye acentos, ñ, ü), espacios, apóstrofo y guion
 * - No puede ser solo espacios ni solo símbolos
 */
export function validarNombre(nombre: string | null | undefined): CampoValidado {
  const original = nombre || "";
  const valorLimpio = normalizarTexto(original);

  if (!valorLimpio) {
    return {
      valida: false,
      error: MENSAJES_VALIDACION.NOMBRE_REQUERIDO,
      valorLimpio: "",
    };
  }

  if (!CONTIENE_LETRAS_REGEX.test(valorLimpio)) {
    return {
      valida: false,
      error: MENSAJES_VALIDACION.NOMBRE_SOLO_SIMBOLOS,
      valorLimpio,
    };
  }

  if (!CARACTERES_NOMBRE_REGEX.test(valorLimpio)) {
    return {
      valida: false,
      error: MENSAJES_VALIDACION.NOMBRE_CARACTERES_INVALIDOS,
      valorLimpio,
    };
  }

  if (valorLimpio.length < 2 || valorLimpio.length > 50) {
    return {
      valida: false,
      error: MENSAJES_VALIDACION.NOMBRE_LONGITUD,
      valorLimpio,
    };
  }

  return { valida: true, valorLimpio };
}

/**
 * Valida el Apellido:
 * - Obligatorio
 * - De 2 a 50 caracteres tras normalizar
 * - Solo letras (incluye acentos, ñ, ü), espacios, apóstrofo y guion
 * - No puede ser solo espacios ni solo símbolos
 */
export function validarApellido(apellido: string | null | undefined): CampoValidado {
  const original = apellido || "";
  const valorLimpio = normalizarTexto(original);

  if (!valorLimpio) {
    return {
      valida: false,
      error: MENSAJES_VALIDACION.APELLIDO_REQUERIDO,
      valorLimpio: "",
    };
  }

  if (!CONTIENE_LETRAS_REGEX.test(valorLimpio)) {
    return {
      valida: false,
      error: MENSAJES_VALIDACION.APELLIDO_SOLO_SIMBOLOS,
      valorLimpio,
    };
  }

  if (!CARACTERES_NOMBRE_REGEX.test(valorLimpio)) {
    return {
      valida: false,
      error: MENSAJES_VALIDACION.APELLIDO_CARACTERES_INVALIDOS,
      valorLimpio,
    };
  }

  if (valorLimpio.length < 2 || valorLimpio.length > 50) {
    return {
      valida: false,
      error: MENSAJES_VALIDACION.APELLIDO_LONGITUD,
      valorLimpio,
    };
  }

  return { valida: true, valorLimpio };
}

/**
 * Valida el Correo electrónico:
 * - Obligatorio
 * - Máximo 254 caracteres
 * - Formato válido
 * - Se normaliza en minúsculas
 */
export function validarCorreo(correo: string | null | undefined): CampoValidado {
  const original = correo || "";
  const valorLimpio = normalizarCorreo(original);

  if (!valorLimpio) {
    return {
      valida: false,
      error: MENSAJES_VALIDACION.CORREO_REQUERIDO,
      valorLimpio: "",
    };
  }

  if (valorLimpio.length > 254) {
    return {
      valida: false,
      error: MENSAJES_VALIDACION.CORREO_MAX_LONGITUD,
      valorLimpio,
    };
  }

  if (!EMAIL_REGEX.test(valorLimpio)) {
    return {
      valida: false,
      error: MENSAJES_VALIDACION.CORREO_INVALIDO,
      valorLimpio,
    };
  }

  return { valida: true, valorLimpio };
}

/**
 * Valida el Celular mexicano:
 * - Obligatorio
 * - Exactamente 10 dígitos tras normalizar (+52 / 52 retirados)
 */
export function validarCelular(celular: string | null | undefined): CampoValidado {
  const original = (celular || "").trim();
  const valorLimpio = normalizarCelular(original);

  if (!original) {
    return {
      valida: false,
      error: MENSAJES_VALIDACION.CELULAR_REQUERIDO,
      valorLimpio: "",
    };
  }

  if (valorLimpio.length !== 10) {
    return {
      valida: false,
      error: MENSAJES_VALIDACION.CELULAR_INVALIDO,
      valorLimpio,
    };
  }

  return { valida: true, valorLimpio };
}

/**
 * Valida la aceptación de términos y aviso de privacidad
 */
export function validarTerminos(acepta: boolean | null | undefined): { valida: boolean; error?: string } {
  if (acepta !== true) {
    return {
      valida: false,
      error: MENSAJES_VALIDACION.TERMINOS_REQUERIDOS,
    };
  }
  return { valida: true };
}

export const CAMPOS_PERMITIDOS_REGISTRO = [
  "nombre",
  "apellido",
  "correo",
  "celular",
  "password",
  "acepta_terminos",
  "acepta_promociones",
] as const;

export interface ResultadoValidacionRegistro {
  valido: boolean;
  errores: Record<string, string>;
  datosLimpios: {
    nombre: string;
    apellido: string;
    correo: string;
    celular: string;
    password: string;
    acepta_terminos: boolean;
    acepta_promociones: boolean;
  };
}

/**
 * Valida el payload completo de registro tanto en frontend como en el backend.
 * Incluye verificación de campos desconocidos y tipos de datos cuando se activa 'estricto'.
 */
export function validarRegistro(
  datos: any,
  opciones: { verificarCamposDesconocidos?: boolean } = {}
): ResultadoValidacionRegistro {
  const errores: Record<string, string> = {};

  if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
    return {
      valido: false,
      errores: { general: "El cuerpo de la solicitud debe ser un objeto JSON válido." },
      datosLimpios: {
        nombre: "",
        apellido: "",
        correo: "",
        celular: "",
        password: "",
        acepta_terminos: false,
        acepta_promociones: false,
      },
    };
  }

  // 1. Verificación estricta de campos desconocidos (servidor)
  if (opciones.verificarCamposDesconocidos) {
    const keys = Object.keys(datos);
    for (const key of keys) {
      if (!CAMPOS_PERMITIDOS_REGISTRO.includes(key as any)) {
        errores.general = `${MENSAJES_VALIDACION.CAMPOS_DESCONOCIDOS} (${key})`;
        break;
      }
    }
  }

  // 2. Verificación de tipos de datos
  if (datos.nombre !== undefined && typeof datos.nombre !== "string") {
    errores.nombre = MENSAJES_VALIDACION.TIPO_INCORRECTO;
  }
  if (datos.apellido !== undefined && typeof datos.apellido !== "string") {
    errores.apellido = MENSAJES_VALIDACION.TIPO_INCORRECTO;
  }
  if (datos.correo !== undefined && typeof datos.correo !== "string") {
    errores.correo = MENSAJES_VALIDACION.TIPO_INCORRECTO;
  }
  if (datos.celular !== undefined && typeof datos.celular !== "string") {
    errores.celular = MENSAJES_VALIDACION.TIPO_INCORRECTO;
  }
  if (datos.password !== undefined && typeof datos.password !== "string") {
    errores.password = MENSAJES_VALIDACION.TIPO_INCORRECTO;
  }
  if (
    datos.acepta_terminos !== undefined &&
    typeof datos.acepta_terminos !== "boolean"
  ) {
    errores.acepta_terminos = MENSAJES_VALIDACION.TIPO_INCORRECTO;
  }
  if (
    datos.acepta_promociones !== undefined &&
    typeof datos.acepta_promociones !== "boolean"
  ) {
    errores.acepta_promociones = MENSAJES_VALIDACION.TIPO_INCORRECTO;
  }

  // Si hay error estructural o de tipo, retornar inmediatamente
  if (Object.keys(errores).length > 0) {
    return {
      valido: false,
      errores,
      datosLimpios: {
        nombre: "",
        apellido: "",
        correo: "",
        celular: "",
        password: "",
        acepta_terminos: false,
        acepta_promociones: false,
      },
    };
  }

  // 3. Validar cada campo
  const resNombre = validarNombre(datos.nombre);
  if (!resNombre.valida && resNombre.error) {
    errores.nombre = resNombre.error;
  }

  const resApellido = validarApellido(datos.apellido);
  if (!resApellido.valida && resApellido.error) {
    errores.apellido = resApellido.error;
  }

  const resCorreo = validarCorreo(datos.correo);
  if (!resCorreo.valida && resCorreo.error) {
    errores.correo = resCorreo.error;
  }

  const resCelular = validarCelular(datos.celular);
  if (!resCelular.valida && resCelular.error) {
    errores.celular = resCelular.error;
  }

  // Contraseña con validación de datos personales usando los datos limpios
  const resPassword = validarContrasena(datos.password, {
    nombre: resNombre.valorLimpio,
    apellido: resApellido.valorLimpio,
    correo: resCorreo.valorLimpio,
  });
  if (!resPassword.valida) {
    errores.password =
      resPassword.errores[0] || MENSAJES_VALIDACION.CONTRASENA_NO_CUMPLE_REQUISITOS;
  }

  // Términos
  const resTerminos = validarTerminos(datos.acepta_terminos);
  if (!resTerminos.valida && resTerminos.error) {
    errores.acepta_terminos = resTerminos.error;
  }

  const valido = Object.keys(errores).length === 0;

  return {
    valido,
    errores,
    datosLimpios: {
      nombre: resNombre.valorLimpio,
      apellido: resApellido.valorLimpio,
      correo: resCorreo.valorLimpio,
      celular: resCelular.valorLimpio,
      password: datos.password || "", // La contraseña NO se recorta
      acepta_terminos: Boolean(datos.acepta_terminos),
      acepta_promociones: Boolean(datos.acepta_promociones),
    },
  };
}

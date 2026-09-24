/**
 * Reglas de validación de contraseñas y confirmación
 */

import { MENSAJES_VALIDACION } from "./mensajes";
import { esContrasenaComun } from "./contrasenas-comunes";

export interface ReglaContrasena {
  id:
    | "minimo_caracteres"
    | "maximo_bytes"
    | "mayuscula"
    | "minuscula"
    | "numero"
    | "sin_espacios_extremos"
    | "sin_datos_personales"
    | "no_comun";
  descripcion: string;
  cumplida: boolean;
}

export interface ContextoUsuario {
  nombre?: string;
  apellido?: string;
  correo?: string;
}

export interface ResultadoValidacionContrasena {
  valida: boolean;
  reglas: ReglaContrasena[];
  errores: string[];
}

/**
 * Mide el tamaño exacto en bytes de una cadena en UTF-8
 * Compatible tanto con Node.js como con el navegador (TextEncoder / Buffer).
 */
export function medirBytesUtf8(texto: string): number {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(texto).length;
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.byteLength(texto, "utf-8");
  }
  return encodeURI(texto).split(/%..|./).length - 1;
}

/**
 * Verifica si la contraseña contiene subcadenas del dato personal de 3 o más caracteres
 */
function contieneTextoPersonal(contrasena: string, valor: string | undefined): boolean {
  if (!valor) return false;
  const passLower = contrasena.toLowerCase();
  
  // Separar palabras (por ejemplo si el nombre es "Ana María")
  const palabras = valor
    .toLowerCase()
    .split(/[\s._-]+/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 3);

  for (const palabra of palabras) {
    if (passLower.includes(palabra)) {
      return true;
    }
  }

  return false;
}

/**
 * Valida una contraseña contra todas las reglas de seguridad
 * NOTA: La contraseña NUNCA se recorta; los espacios cuentan.
 */
export function validarContrasena(
  contrasena: string | null | undefined,
  contexto: ContextoUsuario = {}
): ResultadoValidacionContrasena {
  const pass = contrasena || "";

  // 1. Mínimo 8 caracteres
  const tieneMinimoCaracteres = pass.length >= 8;

  // 2. Máximo 72 bytes (límite real de bcrypt)
  const bytes = medirBytesUtf8(pass);
  const cumpleMaximoBytes = pass.length > 0 && bytes <= 72;

  // 3. Al menos una mayúscula
  const tieneMayuscula = /[A-ZÁÉÍÓÚÑ]/.test(pass);

  // 4. Al menos una minúscula
  const tieneMinuscula = /[a-záéíóúñ]/.test(pass);

  // 5. Al menos un número
  const tieneNumero = /[0-9]/.test(pass);

  // 6. Sin espacios al inicio ni al final
  const sinEspaciosExtremos =
    pass.length > 0 && !pass.startsWith(" ") && !pass.endsWith(" ");

  // 7. No debe contener nombre, apellido ni usuario de correo (>= 3 chars)
  let incluyeDatosPersonales = false;
  if (pass.length > 0) {
    if (contieneTextoPersonal(pass, contexto.nombre)) {
      incluyeDatosPersonales = true;
    }
    if (contieneTextoPersonal(pass, contexto.apellido)) {
      incluyeDatosPersonales = true;
    }
    if (contexto.correo) {
      const parteCorreo = contexto.correo.split("@")[0];
      if (contieneTextoPersonal(pass, parteCorreo)) {
        incluyeDatosPersonales = true;
      }
    }
  }
  const sinDatosPersonales = pass.length > 0 && !incluyeDatosPersonales;

  // 8. No debe estar en la lista de contraseñas comunes
  const noEsComun = pass.length > 0 && !esContrasenaComun(pass);

  const reglas: ReglaContrasena[] = [
    {
      id: "minimo_caracteres",
      descripcion: MENSAJES_VALIDACION.REGLA_LONGITUD_MINIMA,
      cumplida: tieneMinimoCaracteres,
    },
    {
      id: "maximo_bytes",
      descripcion: MENSAJES_VALIDACION.REGLA_LONGITUD_MAXIMA_BYTES,
      cumplida: cumpleMaximoBytes,
    },
    {
      id: "mayuscula",
      descripcion: MENSAJES_VALIDACION.REGLA_MAYUSCULA,
      cumplida: tieneMayuscula,
    },
    {
      id: "minuscula",
      descripcion: MENSAJES_VALIDACION.REGLA_MINUSCULA,
      cumplida: tieneMinuscula,
    },
    {
      id: "numero",
      descripcion: MENSAJES_VALIDACION.REGLA_NUMERO,
      cumplida: tieneNumero,
    },
    {
      id: "sin_espacios_extremos",
      descripcion: MENSAJES_VALIDACION.REGLA_SIN_ESPACIOS_EXTREMOS,
      cumplida: sinEspaciosExtremos,
    },
    {
      id: "sin_datos_personales",
      descripcion: MENSAJES_VALIDACION.REGLA_SIN_DATOS_PERSONALES,
      cumplida: sinDatosPersonales,
    },
    {
      id: "no_comun",
      descripcion: MENSAJES_VALIDACION.REGLA_NO_COMUN,
      cumplida: noEsComun,
    },
  ];

  const errores: string[] = [];
  if (!pass) {
    errores.push(MENSAJES_VALIDACION.CONTRASENA_REQUERIDA);
  } else {
    for (const regla of reglas) {
      if (!regla.cumplida) {
        errores.push(regla.descripcion);
      }
    }
  }

  const valida = Boolean(pass) && reglas.every((r) => r.cumplida);

  return {
    valida,
    reglas,
    errores,
  };
}

/**
 * Valida la coincidencia entre la contraseña y su confirmación
 */
export function validarConfirmacion(
  contrasena: string | null | undefined,
  confirmacion: string | null | undefined
): { valida: boolean; error?: string } {
  if (!confirmacion) {
    return {
      valida: false,
      error: MENSAJES_VALIDACION.CONTRASENA_CONFIRMACION_REQUERIDA,
    };
  }

  if (contrasena !== confirmacion) {
    return {
      valida: false,
      error: MENSAJES_VALIDACION.CONTRASENAS_NO_COINCIDEN,
    };
  }

  return { valida: true };
}

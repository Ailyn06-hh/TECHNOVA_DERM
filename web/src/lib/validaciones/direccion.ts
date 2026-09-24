export interface DireccionInput {
  id?: number;
  alias: string;
  calle_y_numero: string;
  calle?: string;
  numero_exterior?: string;
  numero_interior?: string | null;
  colonia: string;
  codigo_postal: string;
  ciudad: string;
  estado: string;
  referencias?: string | null;
  predeterminada?: boolean | number;
}

export interface DireccionValidationResult {
  valido: boolean;
  errores: Partial<Record<keyof DireccionInput | "calle_y_numero", string>>;
}

export function validarDireccion(input: Partial<DireccionInput>): DireccionValidationResult {
  const errores: Partial<Record<keyof DireccionInput | "calle_y_numero", string>> = {};

  // Alias: obligatorio, máximo 30 caracteres
  const alias = (input.alias || "").trim();
  if (!alias) {
    errores.alias = "El alias o identificador de la dirección es obligatorio (ej. Casa, Trabajo).";
  } else if (alias.length > 30) {
    errores.alias = "El alias no puede superar los 30 caracteres.";
  }

  // Calle y número: obligatorio, 5 a 120 caracteres, debe incluir al menos un número
  let calleYNumero = (input.calle_y_numero || "").trim();
  if (!calleYNumero && (input.calle || input.numero_exterior)) {
    calleYNumero = `${input.calle || ""} ${input.numero_exterior || ""}`.trim();
  }

  if (!calleYNumero) {
    errores.calle_y_numero = "La calle y número exterior son obligatorios.";
  } else if (calleYNumero.length < 5 || calleYNumero.length > 120) {
    errores.calle_y_numero = "La calle y número debe tener entre 5 y 120 caracteres.";
  } else if (!/\d/.test(calleYNumero)) {
    errores.calle_y_numero = "Por favor incluye el número exterior de tu domicilio (ej. Av. Madero 214).";
  }

  // Número interior: opcional, máximo 10
  if (input.numero_interior && input.numero_interior.trim().length > 10) {
    errores.numero_interior = "El número interior no puede superar 10 caracteres.";
  }

  // Colonia: obligatoria
  const colonia = (input.colonia || "").trim();
  if (!colonia) {
    errores.colonia = "La colonia o fraccionamiento es obligatoria.";
  } else if (colonia.length > 100) {
    errores.colonia = "La colonia no puede superar 100 caracteres.";
  }

  // Código postal: 5 dígitos numéricos
  const cp = (input.codigo_postal || "").trim();
  if (!cp) {
    errores.codigo_postal = "El código postal es obligatorio.";
  } else if (!/^\d{5}$/.test(cp)) {
    errores.codigo_postal = "El código postal debe constar de exactamente 5 dígitos numéricos.";
  }

  // Ciudad / Municipio
  const ciudad = (input.ciudad || "").trim();
  if (!ciudad) {
    errores.ciudad = "La ciudad o municipio es obligatoria.";
  } else if (ciudad.length > 100) {
    errores.ciudad = "La ciudad no puede superar 100 caracteres.";
  }

  // Estado
  const estado = (input.estado || "").trim();
  if (!estado) {
    errores.estado = "El estado es obligatorio.";
  } else if (estado.length > 100) {
    errores.estado = "El estado no puede superar 100 caracteres.";
  }

  // Referencias: opcional, máximo 200
  if (input.referencias && input.referencias.trim().length > 200) {
    errores.referencias = "Las referencias no pueden superar los 200 caracteres.";
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores,
  };
}

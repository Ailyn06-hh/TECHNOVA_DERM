export interface DireccionInput {
  alias?: string;
  calle: string;
  numero_exterior: string;
  numero_interior?: string | null;
  colonia: string;
  codigo_postal: string;
  ciudad: string;
  estado: string;
  referencias?: string | null;
  predeterminada?: boolean;
}

export interface DireccionValidationResult {
  valido: boolean;
  errores: Partial<Record<keyof DireccionInput, string>>;
}

export function validarDireccion(input: Partial<DireccionInput>): DireccionValidationResult {
  const errores: Partial<Record<keyof DireccionInput, string>> = {};

  const calle = (input.calle || "").trim();
  if (!calle) {
    errores.calle = "La calle es obligatoria.";
  } else if (calle.length < 2 || calle.length > 100) {
    errores.calle = "La calle debe tener entre 2 y 100 caracteres.";
  }

  const numExt = (input.numero_exterior || "").trim();
  if (!numExt) {
    errores.numero_exterior = "El número exterior es obligatorio.";
  } else if (numExt.length > 20) {
    errores.numero_exterior = "El número exterior no puede superar 20 caracteres.";
  }

  if (input.numero_interior && input.numero_interior.trim().length > 20) {
    errores.numero_interior = "El número interior no puede superar 20 caracteres.";
  }

  const colonia = (input.colonia || "").trim();
  if (!colonia) {
    errores.colonia = "La colonia es obligatoria.";
  } else if (colonia.length < 2 || colonia.length > 100) {
    errores.colonia = "La colonia debe tener entre 2 y 100 caracteres.";
  }

  const cp = (input.codigo_postal || "").trim();
  if (!cp) {
    errores.codigo_postal = "El código postal es obligatorio.";
  } else if (!/^\d{5}$/.test(cp)) {
    errores.codigo_postal = "El código postal debe constar de 5 dígitos numéricos.";
  }

  const ciudad = (input.ciudad || "").trim();
  if (!ciudad) {
    errores.ciudad = "La ciudad o municipio es obligatoria.";
  } else if (ciudad.length > 100) {
    errores.ciudad = "La ciudad no puede superar 100 caracteres.";
  }

  const estado = (input.estado || "").trim();
  if (!estado) {
    errores.estado = "El estado es obligatorio.";
  } else if (estado.length > 100) {
    errores.estado = "El estado no puede superar 100 caracteres.";
  }

  if (input.referencias && input.referencias.trim().length > 200) {
    errores.referencias = "Las referencias no pueden superar los 200 caracteres.";
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores,
  };
}

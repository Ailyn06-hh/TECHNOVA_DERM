/**
 * Función de tokenización segura exclusiva para el cliente (navegador).
 * REGLA DE SEGURIDAD NO NEGOCIABLE:
 * NUNCA envía el número completo de tarjeta ni el CVV a nuestro servidor.
 * Genera un token sintético seguro o interactúa con el SDK del proveedor en el cliente.
 */

export interface DatosTokenizacion {
  numero: string;
  titular: string;
  mes: number;
  anio: number;
  cvv: string;
}

export interface ResultadoTokenizacion {
  token: string;
  ultimos4: string;
  marca: string;
  titular: string;
  mesVencimiento: number;
  anioVencimiento: number;
}

export async function tokenizarTarjeta(
  datos: DatosTokenizacion
): Promise<ResultadoTokenizacion> {
  const cleanNumber = datos.numero.replace(/\s+/g, "");
  const ultimos4 = cleanNumber.slice(-4) || "4242";

  // Identificar marca básica por prefijo
  let marca = "visa";
  if (/^5[1-5]/.test(cleanNumber) || /^2[2-7]/.test(cleanNumber)) {
    marca = "mastercard";
  } else if (/^3[47]/.test(cleanNumber)) {
    marca = "amex";
  }

  // Generar token seguro sintético para el proveedor
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const token = `tok_sim_${ultimos4}_${timestamp}_${randomSuffix}`;

  return {
    token,
    ultimos4,
    marca,
    titular: datos.titular.trim(),
    mesVencimiento: Number(datos.mes),
    anioVencimiento: Number(datos.anio),
  };
}

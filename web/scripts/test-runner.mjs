import assert from "node:assert";

// 1. Normalización
function normalizarCorreo(correo) {
  if (!correo) return "";
  return correo.trim().toLowerCase();
}

function normalizarCelular(celular) {
  if (!celular) return "";
  let digits = celular.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("52")) {
    digits = digits.slice(2);
  }
  if (digits.length === 13 && digits.startsWith("052")) {
    digits = digits.slice(3);
  }
  return digits;
}

function normalizarTexto(texto) {
  if (!texto) return "";
  return texto.trim().replace(/\s+/g, " ");
}

function normalizarIdentificador(identificador) {
  const original = identificador || "";
  const trimmed = original.trim();
  if (trimmed.includes("@")) {
    const correoNormalizado = normalizarCorreo(trimmed);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return {
      tipo: "correo",
      valor: correoNormalizado,
      original,
      esValido: emailRegex.test(correoNormalizado),
    };
  }
  const celularNormalizado = normalizarCelular(trimmed);
  return {
    tipo: "celular",
    valor: celularNormalizado,
    original,
    esValido: celularNormalizado.length === 10,
  };
}

function medirBytesUtf8(texto) {
  return Buffer.byteLength(texto, "utf-8");
}

function contieneTextoPersonal(contrasena, valor) {
  if (!valor) return false;
  const passLower = contrasena.toLowerCase();
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

const CONTRASENAS_COMUNES = new Set([
  "12345678", "password123", "admin1234", "technova2026", "skincare123", "temporal123"
]);

function validarContrasena(contrasena, contexto = {}) {
  const pass = contrasena || "";
  const tieneMinimoCaracteres = pass.length >= 8;
  const bytes = medirBytesUtf8(pass);
  const cumpleMaximoBytes = pass.length > 0 && bytes <= 72;
  const tieneMayuscula = /[A-ZÁÉÍÓÚÑ]/.test(pass);
  const tieneMinuscula = /[a-záéíóúñ]/.test(pass);
  const tieneNumero = /[0-9]/.test(pass);
  const sinEspaciosExtremos = pass.length > 0 && !pass.startsWith(" ") && !pass.endsWith(" ");

  let incluyeDatosPersonales = false;
  if (pass.length > 0) {
    if (contieneTextoPersonal(pass, contexto.nombre)) incluyeDatosPersonales = true;
    if (contieneTextoPersonal(pass, contexto.apellido)) incluyeDatosPersonales = true;
    if (contexto.correo) {
      const parteCorreo = contexto.correo.split("@")[0];
      if (contieneTextoPersonal(pass, parteCorreo)) incluyeDatosPersonales = true;
    }
  }
  const sinDatosPersonales = pass.length > 0 && !incluyeDatosPersonales;
  const noEsComun = pass.length > 0 && !CONTRASENAS_COMUNES.has(pass.toLowerCase());

  const reglas = [
    { id: "minimo_caracteres", cumplida: tieneMinimoCaracteres },
    { id: "maximo_bytes", cumplida: cumpleMaximoBytes },
    { id: "mayuscula", cumplida: tieneMayuscula },
    { id: "minuscula", cumplida: tieneMinuscula },
    { id: "numero", cumplida: tieneNumero },
    { id: "sin_espacios_extremos", cumplida: sinEspaciosExtremos },
    { id: "sin_datos_personales", cumplida: sinDatosPersonales },
    { id: "no_comun", cumplida: noEsComun },
  ];

  const valida = Boolean(pass) && reglas.every((r) => r.cumplida);
  return { valida, reglas };
}

function validarConfirmacion(contrasena, confirmacion) {
  if (!confirmacion) return { valida: false };
  if (contrasena !== confirmacion) return { valida: false };
  return { valida: true };
}

console.log("=== EJECUTANDO TEST RUNNER COMPLETO ===");

// 1. Normalización
assert.strictEqual(normalizarCorreo("  ana.lopez@correo.com  "), "ana.lopez@correo.com");
assert.strictEqual(normalizarCorreo("ANA.LOPEZ@HOTMAIL.COM"), "ana.lopez@hotmail.com");
assert.strictEqual(normalizarCelular("+52 449 123 4567"), "4491234567");
assert.strictEqual(normalizarCelular("524491234567"), "4491234567");
assert.strictEqual(normalizarTexto("Ana    María"), "Ana María");
assert.strictEqual(normalizarIdentificador("+52 449 123 4567").esValido, true);
assert.strictEqual(normalizarIdentificador("test@mail.com").esValido, true);
assert.strictEqual(normalizarIdentificador("test@").esValido, false);
console.log("✓ Casos de normalización: PASARON");

// 2. 7 vs 8 caracteres
assert.strictEqual(validarContrasena("Abc1234").valida, false);
assert.strictEqual(validarContrasena("Abc12345").valida, true);
console.log("✓ Caso 7 vs 8 caracteres: PASÓ");

// 3. UTF-8 72 bytes con caracteres acentuados
const passAcentos73Bytes = "Áéíóúñ".repeat(6) + "1A";
assert.strictEqual(medirBytesUtf8(passAcentos73Bytes) > 72, true);
assert.strictEqual(validarContrasena(passAcentos73Bytes).valida, false);
const passAcentosValido = "Áéíóúñ123A";
assert.strictEqual(validarContrasena(passAcentosValido).valida, true);
console.log("✓ Caso UTF-8 72 bytes con acentos: PASÓ");

// 4. Espacios extremos
assert.strictEqual(validarContrasena(" Clave1234").valida, false);
assert.strictEqual(validarContrasena("Clave1234 ").valida, false);
assert.strictEqual(validarContrasena("Clave Segura 1234").valida, true);
console.log("✓ Caso espacios extremos vs passphrase: PASÓ");

// 5. Datos personales
const contextoAna = { nombre: "Ana", apellido: "López", correo: "ana.lopez@dominio.com" };
assert.strictEqual(validarContrasena("Ana123456!", contextoAna).valida, false);
assert.strictEqual(validarContrasena("MiClaveLopez2026", contextoAna).valida, false);
assert.strictEqual(validarContrasena("claveana.lopez1", contextoAna).valida, false);
assert.strictEqual(validarContrasena("SkincareSeguro2026", contextoAna).valida, true);
console.log("✓ Caso datos personales (nombre, apellido, correo): PASÓ");

// 6. Contraseñas comunes
assert.strictEqual(validarContrasena("Password123").valida, false);
assert.strictEqual(validarContrasena("Technova2026").valida, false);
console.log("✓ Caso contraseñas comunes: PASÓ");

// 7. Confirmación
assert.strictEqual(validarConfirmacion("Clave1234", "Clave1234").valida, true);
assert.strictEqual(validarConfirmacion("Clave1234", "clave1234").valida, false);
assert.strictEqual(validarConfirmacion("Clave1234", "").valida, false);
console.log("✓ Caso confirmación de contraseña: PASÓ");

console.log("\n🎉 TODAS LAS PRUEBAS DE VALIDACIÓN PASARON EXITOSAMENTE (100%).");

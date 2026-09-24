import assert from "node:assert";

// Implementación de las funciones de validación de Parte 2
const CARACTERES_NOMBRE_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ' -]+$/;
const CONTIENE_LETRAS_REGEX = /[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizarTexto(texto) {
  if (!texto) return "";
  return texto.trim().replace(/\s+/g, " ");
}

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

function validarNombre(nombre) {
  const original = nombre || "";
  const valorLimpio = normalizarTexto(original);
  if (!valorLimpio) return { valida: false, error: "El nombre es obligatorio." };
  if (!CONTIENE_LETRAS_REGEX.test(valorLimpio)) return { valida: false, error: "El nombre no puede consistir únicamente de espacios o símbolos." };
  if (!CARACTERES_NOMBRE_REGEX.test(valorLimpio)) return { valida: false, error: "El nombre solo puede contener letras, acentos, espacios, apóstrofe y guion." };
  if (valorLimpio.length < 2 || valorLimpio.length > 50) return { valida: false, error: "El nombre debe tener entre 2 y 50 caracteres." };
  return { valida: true, valorLimpio };
}

function validarApellido(apellido) {
  const original = apellido || "";
  const valorLimpio = normalizarTexto(original);
  if (!valorLimpio) return { valida: false, error: "El apellido es obligatorio." };
  if (!CONTIENE_LETRAS_REGEX.test(valorLimpio)) return { valida: false, error: "El apellido no puede consistir únicamente de espacios o símbolos." };
  if (!CARACTERES_NOMBRE_REGEX.test(valorLimpio)) return { valida: false, error: "El apellido solo puede contener letras, acentos, espacios, apóstrofe y guion." };
  if (valorLimpio.length < 2 || valorLimpio.length > 50) return { valida: false, error: "El apellido debe tener entre 2 y 50 caracteres." };
  return { valida: true, valorLimpio };
}

function validarCorreo(correo) {
  const original = correo || "";
  const valorLimpio = normalizarCorreo(original);
  if (!valorLimpio) return { valida: false, error: "Ingresa tu correo electrónico." };
  if (valorLimpio.length > 254) return { valida: false, error: "El correo electrónico no puede exceder 254 caracteres." };
  if (!EMAIL_REGEX.test(valorLimpio)) return { valida: false, error: "Ingresa un correo electrónico con formato válido." };
  return { valida: true, valorLimpio };
}

function validarCelular(celular) {
  const original = (celular || "").trim();
  const valorLimpio = normalizarCelular(original);
  if (!original) return { valida: false, error: "Ingresa tu número celular." };
  if (valorLimpio.length !== 10) return { valida: false, error: "El número celular debe tener exactamente 10 dígitos." };
  return { valida: true, valorLimpio };
}

function validarTerminos(acepta) {
  if (acepta !== true) return { valida: false, error: "Debes aceptar el aviso de privacidad y los términos para continuar." };
  return { valida: true };
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

const CONTRASENAS_COMUNES = new Set(["password123", "admin1234", "12345678", "technova2026"]);

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

// Simulador de Rate Limiter
class MockRateLimiter {
  constructor(maxPorHora = 5) {
    this.maxPorHora = maxPorHora;
    this.map = new Map();
  }
  verificar(ip) {
    const ahora = Date.now();
    const timestamps = (this.map.get(ip) || []).filter((t) => t > ahora - 3600000);
    return timestamps.length < this.maxPorHora;
  }
  registrar(ip) {
    const list = this.map.get(ip) || [];
    list.push(Date.now());
    this.map.set(ip, list);
  }
}

console.log("=== INICIANDO PRUEBAS DE LA PARTE 2: REGISTRO ===");

// 1. Nombres con acentos, diéresis, apóstrofo y guion
console.log("\n[1/7] Probando nombres y apellidos válidos...");
assert.strictEqual(validarNombre("María José").valida, true);
assert.strictEqual(validarNombre("O'Connor").valida, true);
assert.strictEqual(validarNombre("Jean-Luc").valida, true);
assert.strictEqual(validarNombre("Ñandú").valida, true);
assert.strictEqual(validarNombre("Güero").valida, true);
assert.strictEqual(validarApellido("López de la Peña").valida, true);
assert.strictEqual(validarApellido("D'Artagnan").valida, true);
console.log("✓ Nombres con caracteres especiales en español pasaron.");

// 2. Nombres inválidos (símbolos solos, números, longitud)
console.log("\n[2/7] Probando nombres y apellidos inválidos...");
assert.strictEqual(validarNombre("---").valida, false);
assert.strictEqual(validarNombre("' - '").valida, false);
assert.strictEqual(validarNombre("Ana123").valida, false);
assert.strictEqual(validarNombre("Carlos@").valida, false);
assert.strictEqual(validarNombre("A").valida, false); // < 2 chars
assert.strictEqual(validarNombre("A".repeat(50)).valida, true); // 50 chars
assert.strictEqual(validarNombre("A".repeat(51)).valida, false); // > 50 chars
console.log("✓ Restricciones de símbolos y longitud de nombres pasaron.");

// 3. Correo duplicado en mayúsculas / normalización
console.log("\n[3/7] Probando correo (normalización y formato)...");
assert.strictEqual(normalizarCorreo("  ANA.LOPEZ@HOTMAIL.COM  "), "ana.lopez@hotmail.com");
assert.strictEqual(validarCorreo("ANA.LOPEZ@HOTMAIL.COM").valorLimpio, "ana.lopez@hotmail.com");
assert.strictEqual(validarCorreo("correo_invalido").valida, false);
assert.strictEqual(validarCorreo("a".repeat(250) + "@test.com").valida, false); // > 254
console.log("✓ Normalización y validación de correo pasaron.");

// 4. Celular con +52 y 10 dígitos
console.log("\n[4/7] Probando celular mexicano con +52...");
assert.strictEqual(validarCelular("+52 449 123 4567").valida, true);
assert.strictEqual(validarCelular("+52 449 123 4567").valorLimpio, "4491234567");
assert.strictEqual(validarCelular("524491234567").valorLimpio, "4491234567");
assert.strictEqual(validarCelular("(449) 123-4567").valorLimpio, "4491234567");
assert.strictEqual(validarCelular("449123456").valida, false); // 9 dígitos
assert.strictEqual(validarCelular("12345678901").valida, false); // 11 dígitos sin 52
console.log("✓ Celular mexicano con +52 y 10 dígitos pasó.");

// 5. Contraseña que contiene el nombre
console.log("\n[5/7] Probando contraseña que contiene el nombre...");
const passConNombre = validarContrasena("AnaSegura2026!", { nombre: "Ana", apellido: "López", correo: "ana@mail.com" });
assert.strictEqual(passConNombre.reglas.find((r) => r.id === "sin_datos_personales")?.cumplida, false);
assert.strictEqual(passConNombre.valida, false);

const passSinNombre = validarContrasena("ClaveSegura2026!", { nombre: "Ana", apellido: "López", correo: "ana@mail.com" });
assert.strictEqual(passSinNombre.reglas.find((r) => r.id === "sin_datos_personales")?.cumplida, true);
assert.strictEqual(passSinNombre.valida, true);
console.log("✓ Rechazo de contraseña con nombre del usuario pasó.");

// 6. Envío sin aceptar términos
console.log("\n[6/7] Probando validación de términos...");
assert.strictEqual(validarTerminos(false).valida, false);
assert.strictEqual(validarTerminos(undefined).valida, false);
assert.strictEqual(validarTerminos(true).valida, true);
console.log("✓ Validación de aviso de privacidad y términos pasó.");

// 7. Rate Limiter: Máximo 5 registros por IP por hora
console.log("\n[7/7] Probando Rate Limiter (máximo 5 por IP / hora)...");
const rl = new MockRateLimiter(5);
const ipTest = "192.168.1.50";
for (let i = 1; i <= 5; i++) {
  assert.strictEqual(rl.verificar(ipTest), true, `Intento ${i} debe estar permitido`);
  rl.registrar(ipTest);
}
// El 6to intento debe ser bloqueado
assert.strictEqual(rl.verificar(ipTest), false, "Intento 6 debe ser bloqueado");
console.log("✓ Rate Limiter bloqueó correctamente al 6to intento en la misma hora.");

console.log("\n🎉 TODAS LAS PRUEBAS DE LA PARTE 2 PASARON EXITOSAMENTE (100%).");

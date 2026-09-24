import assert from "node:assert";
import {
  normalizarCorreo,
  normalizarCelular,
  normalizarTexto,
  normalizarIdentificador,
  validarContrasena,
  validarConfirmacion,
  medirBytesUtf8,
  esContrasenaComun,
  MENSAJES_VALIDACION,
} from "../src/lib/validaciones";

console.log("=== INICIANDO PRUEBAS DE VALIDACIÓN Y NORMALIZACIÓN ===");

// 1. Pruebas de normalizarCorreo
console.log("\n[1/6] Probando normalizarCorreo...");
assert.strictEqual(
  normalizarCorreo("  ana.lopez@correo.com  "),
  "ana.lopez@correo.com"
);
assert.strictEqual(
  normalizarCorreo("ANA.LOPEZ@HOTMAIL.COM"),
  "ana.lopez@hotmail.com"
);
assert.strictEqual(
  normalizarCorreo("  Ana.Lopez@Dominio.COM  "),
  "ana.lopez@dominio.com"
);
assert.strictEqual(normalizarCorreo(""), "");
assert.strictEqual(normalizarCorreo(null as any), "");
console.log("✓ normalizarCorreo pasó todas las pruebas.");

// 2. Pruebas de normalizarCelular
console.log("\n[2/6] Probando normalizarCelular (+52, formato MX)...");
assert.strictEqual(normalizarCelular("449 123 4567"), "4491234567");
assert.strictEqual(normalizarCelular("(449) 123-4567"), "4491234567");
assert.strictEqual(normalizarCelular("+52 449 123 4567"), "4491234567");
assert.strictEqual(normalizarCelular("524491234567"), "4491234567");
assert.strictEqual(normalizarCelular("0524491234567"), "4491234567");
assert.strictEqual(normalizarCelular("449123456"), "449123456"); // 9 dígitos
assert.strictEqual(normalizarCelular("abc-xyz"), "");
console.log("✓ normalizarCelular pasó todas las pruebas.");

// 3. Pruebas de normalizarTexto
console.log("\n[3/6] Probando normalizarTexto (colapso de espacios)...");
assert.strictEqual(normalizarTexto("Ana    María"), "Ana María");
assert.strictEqual(
  normalizarTexto("   López de la Vega   "),
  "López de la Vega"
);
assert.strictEqual(normalizarTexto("Carlos \t  Alberto"), "Carlos Alberto");
console.log("✓ normalizarTexto pasó todas las pruebas.");

// 4. Pruebas de normalizarIdentificador
console.log("\n[4/6] Probando normalizarIdentificador (correo vs celular)...");
const idEmail = normalizarIdentificador(" Ana@Correo.com ");
assert.strictEqual(idEmail.tipo, "correo");
assert.strictEqual(idEmail.valor, "ana@correo.com");
assert.strictEqual(idEmail.esValido, true);

const idEmailInvalid = normalizarIdentificador("ana@");
assert.strictEqual(idEmailInvalid.tipo, "correo");
assert.strictEqual(idEmailInvalid.esValido, false);

const idPhone = normalizarIdentificador("+52 449 987 6543");
assert.strictEqual(idPhone.tipo, "celular");
assert.strictEqual(idPhone.valor, "4499876543");
assert.strictEqual(idPhone.esValido, true);

const idPhoneInvalid = normalizarIdentificador("12345");
assert.strictEqual(idPhoneInvalid.tipo, "celular");
assert.strictEqual(idPhoneInvalid.esValido, false);
console.log("✓ normalizarIdentificador pasó todas las pruebas.");

// 5. Pruebas de validarContrasena y reglas
console.log("\n[5/6] Probando validarContrasena y reglas de seguridad...");

// 5.1 Longitud mínima (7 vs 8)
const pass7 = validarContrasena("Abc1234");
assert.strictEqual(pass7.valida, false);
assert.strictEqual(
  pass7.reglas.find((r) => r.id === "minimo_caracteres")?.cumplida,
  false
);

const pass8 = validarContrasena("Abc12345");
assert.strictEqual(pass8.valida, true);
assert.strictEqual(
  pass8.reglas.find((r) => r.id === "minimo_caracteres")?.cumplida,
  true
);

// 5.2 Límite de 72 bytes UTF-8 (límite bcrypt)
const pass72Ascii = "A".repeat(71) + "1a"; // 73 caracteres
const res72Ascii = validarContrasena(pass72Ascii);
assert.strictEqual(
  res72Ascii.reglas.find((r) => r.id === "maximo_bytes")?.cumplida,
  false
);

// Con acentos: cada acento son 2 bytes en UTF-8
// 'Áéíóúñ' = 6 caracteres = 12 bytes
// 6 * 12 bytes = 72 bytes + '1A' = 74 bytes (> 72)
const passAcentosExcesivo = "Áéíóúñ".repeat(6) + "1A";
assert.strictEqual(medirBytesUtf8(passAcentosExcesivo) > 72, true);
const resAcentos = validarContrasena(passAcentosExcesivo);
assert.strictEqual(
  resAcentos.reglas.find((r) => r.id === "maximo_bytes")?.cumplida,
  false
);

// Con acentos dentro de los 72 bytes
const passAcentosValido = "Áéíóúñ123A"; // 10 caracteres = 16 bytes
const resAcentosValido = validarContrasena(passAcentosValido);
assert.strictEqual(resAcentosValido.valida, true);

// 5.3 Mayúsculas, minúsculas y números
assert.strictEqual(validarContrasena("solominusculas123").valida, false);
assert.strictEqual(validarContrasena("SOLOMAYUSCULAS123").valida, false);
assert.strictEqual(validarContrasena("SinNumerosClave").valida, false);
assert.strictEqual(validarContrasena("Valida1234").valida, true);
assert.strictEqual(validarContrasena("Ñandú2026").valida, true);

// 5.4 Espacios al inicio o final (la contraseña NO se recorta, los espacios cuentan)
const passEspacioInicio = validarContrasena(" Clave1234");
assert.strictEqual(
  passEspacioInicio.reglas.find((r) => r.id === "sin_espacios_extremos")
    ?.cumplida,
  false
);
assert.strictEqual(passEspacioInicio.valida, false);

const passEspacioFinal = validarContrasena("Clave1234 ");
assert.strictEqual(
  passEspacioFinal.reglas.find((r) => r.id === "sin_espacios_extremos")
    ?.cumplida,
  false
);
assert.strictEqual(passEspacioFinal.valida, false);

// Espacios intermedios SÍ son válidos
const passEspacioMedio = validarContrasena("Clave Segura 1234");
assert.strictEqual(
  passEspacioMedio.reglas.find((r) => r.id === "sin_espacios_extremos")
    ?.cumplida,
  true
);
assert.strictEqual(passEspacioMedio.valida, true);

// 5.5 Prohibición de datos personales
const contextoAna = {
  nombre: "Ana",
  apellido: "López",
  correo: "ana.lopez@dominio.com",
};

const passConNombre = validarContrasena("Ana123456!", contextoAna);
assert.strictEqual(
  passConNombre.reglas.find((r) => r.id === "sin_datos_personales")?.cumplida,
  false
);
assert.strictEqual(passConNombre.valida, false);

const passConApellido = validarContrasena("MiClaveLopez2026", contextoAna);
assert.strictEqual(
  passConApellido.reglas.find((r) => r.id === "sin_datos_personales")?.cumplida,
  false
);
assert.strictEqual(passConApellido.valida, false);

const passConCorreo = validarContrasena("claveana.lopez1", contextoAna);
assert.strictEqual(
  passConCorreo.reglas.find((r) => r.id === "sin_datos_personales")?.cumplida,
  false
);
assert.strictEqual(passConCorreo.valida, false);

// 5.6 Bloqueo de contraseñas comunes
assert.strictEqual(esContrasenaComun("Password123"), true);
assert.strictEqual(esContrasenaComun("Admin1234"), true);
assert.strictEqual(esContrasenaComun("Technova2026"), true);
assert.strictEqual(esContrasenaComun("12345678"), true);
assert.strictEqual(
  validarContrasena("Password123").reglas.find((r) => r.id === "no_comun")
    ?.cumplida,
  false
);
assert.strictEqual(validarContrasena("Password123").valida, false);

console.log("✓ validarContrasena pasó todas las reglas y casos de borde.");

// 6. Pruebas de validarConfirmacion
console.log("\n[6/6] Probando validarConfirmacion...");
assert.strictEqual(validarConfirmacion("Clave1234", "").valida, false);
assert.strictEqual(validarConfirmacion("Clave1234", "Clave1235").valida, false);
assert.strictEqual(validarConfirmacion("Clave1234", "clave1234").valida, false);
assert.strictEqual(validarConfirmacion("Clave1234", "Clave1234").valida, true);
console.log("✓ validarConfirmacion pasó todas las pruebas.");

console.log("\n🎉 ¡TODAS LAS PRUEBAS PASARON EXITOSAMENTE (100%)!");

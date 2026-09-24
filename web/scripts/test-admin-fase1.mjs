import crypto from "crypto";
import mysql from "mysql2/promise";

const BASE_URL = "http://localhost:3000";

// Helper TOTP para pruebas
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(base32) {
  const clean = base32.toUpperCase().replace(/=+$/, "").replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_ALPHABET.indexOf(clean[i]);
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function generateTOTP(secret, timeStep = 30, forTime = Date.now()) {
  const counter = Math.floor(forTime / 1000 / timeStep);
  const buf = Buffer.alloc(8);
  buf.writeBigInt64BE(BigInt(counter));
  const key = base32Decode(secret);
  const hmac = crypto.createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (code % 1000000).toString().padStart(6, "0");
}

async function runTests() {
  console.log("=======================================================================");
  console.log("SUITE DE PRUEBAS: FASE 1 ACCESO Y ESTRUCTURA ADMIN CRM (TECHNOVA-DERM)");
  console.log("=======================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✔ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ✖ [FAIL] ${message}`);
      failed++;
    }
  }

  const conn = await mysql.createConnection({
    host: "127.0.0.1",
    user: "root",
    password: "",
    database: "technova_derm",
  });

  try {
    // 0. Limpiar estado de pruebas para admin@technovaderm.mx
    await conn.query(
      "UPDATE administradores SET intentos_fallidos = 0, bloqueado_hasta = NULL, totp_configurado = 0 WHERE correo = 'admin@technovaderm.mx'"
    );

    // 1. Intento con correo inexistente -> Mensaje genérico 401
    const resInexistente = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo: "fantasma@technovaderm.mx", password: "cualquiercosa" }),
    });
    const jsonInexistente = await resInexistente.json();
    assert(resInexistente.status === 401, "Correo inexistente responde con status 401");
    assert(jsonInexistente.error === "Credenciales no válidas", "Mensaje genérico sin filtrar existencia de usuario");

    // 2. Intento con contraseña incorrecta -> Mensaje genérico 401
    const resPassMal = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo: "admin@technovaderm.mx", password: "PasswordIncorrecto!" }),
    });
    const jsonPassMal = await resPassMal.json();
    assert(resPassMal.status === 401, "Contraseña errónea responde con status 401");
    assert(jsonPassMal.error === "Credenciales no válidas", "Mensaje genérico para contraseña incorrecta");

    // 3. Probar bloqueo tras 5 intentos fallidos consecutivos
    console.log("  -> Simulando 3 intentos fallidos adicionales (total 5)...");
    for (let i = 0; i < 3; i++) {
      await fetch(`${BASE_URL}/api/admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: "admin@technovaderm.mx", password: "WrongPassword" }),
      });
    }
    // El 5to intento debe disparar el bloqueo (429)
    const resBloqueo = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo: "admin@technovaderm.mx", password: "WrongPassword" }),
    });
    const jsonBloqueo = await resBloqueo.json();
    assert(resBloqueo.status === 429, "5to intento fallido responde con status 429 (Bloqueo temporal)");
    assert(jsonBloqueo.bloqueado === true, "Respuesta indica cuenta bloqueada");
    assert(jsonBloqueo.minutosRestantes >= 14, "Tiempo de bloqueo de 15 minutos asignado");

    // 4. Intentar con contraseña correcta mientras está bloqueado -> Sigue bloqueado
    const resBloqueadoCorrecto = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo: "admin@technovaderm.mx", password: "AdminPass2026!" }),
    });
    assert(resBloqueadoCorrecto.status === 429, "Credenciales correctas no acceden mientras esté bloqueado");

    // Restablecer bloqueo para continuar con flujo exitoso
    await conn.query(
      "UPDATE administradores SET intentos_fallidos = 0, bloqueado_hasta = NULL, totp_configurado = 0 WHERE correo = 'admin@technovaderm.mx'"
    );

    // 5. Paso 1: Login con contraseña correcta (requiere 2FA)
    const resPaso1 = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo: "admin@technovaderm.mx", password: "AdminPass2026!" }),
    });
    const jsonPaso1 = await resPaso1.json();
    assert(resPaso1.status === 200, "Paso 1 exitoso con credenciales correctas (200 OK)");
    assert(jsonPaso1.requires2FA === true, "Indica que se requiere verificación 2FA");
    assert(jsonPaso1.isSetup === true, "Indica que es primera configuración de 2FA");
    assert(Boolean(jsonPaso1.secret), "Entrega clave secreta Base32");
    assert(Boolean(jsonPaso1.manualKey), "Entrega clave formateada para entrada manual");
    assert(Boolean(jsonPaso1.qrSvg && jsonPaso1.qrSvg.includes("<svg")), "Entrega código QR en SVG nativo sin librerías externas");

    // 6. Paso 2: Código TOTP incorrecto -> Rechazo genérico 401
    const resTotpMal = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        correo: "admin@technovaderm.mx",
        password: "AdminPass2026!",
        totpCode: "000000",
      }),
    });
    const jsonTotpMal = await resTotpMal.json();
    assert(resTotpMal.status === 401, "Código TOTP inválido responde con 401");
    assert(jsonTotpMal.error === "Credenciales no válidas", "Mensaje genérico 'Credenciales no válidas'");

    // 7. Paso 2: Código TOTP correcto -> Acceso concedido y cookie admin_sesion
    const secret = jsonPaso1.secret;
    const validCode = generateTOTP(secret);
    const resTotpOk = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        correo: "admin@technovaderm.mx",
        password: "AdminPass2026!",
        totpCode: validCode,
      }),
    });
    const jsonTotpOk = await resTotpOk.json();
    const setCookie = resTotpOk.headers.get("set-cookie") || "";
    assert(resTotpOk.status === 200, "TOTP válido concede acceso (200 OK)");
    assert(jsonTotpOk.ok === true, "Respuesta OK true");
    assert(jsonTotpOk.admin.rol === "admin", "Rol asignado es 'admin'");
    assert(jsonTotpOk.admin.nombre === "Sofía", "Nombre corresponde a la administradora");
    assert(setCookie.includes("admin_sesion="), "Establece cookie de sesión propia 'admin_sesion'");

    // Extraer cookie para llamadas autenticadas
    const cookieMatch = setCookie.match(/admin_sesion=([^;]+)/);
    const cookieHeader = cookieMatch ? `admin_sesion=${cookieMatch[1]}` : "";

    // 8. Consultar /api/admin/auth/me con la cookie admin_sesion
    const resMe = await fetch(`${BASE_URL}/api/admin/auth/me`, {
      headers: { Cookie: cookieHeader },
    });
    const jsonMe = await resMe.json();
    assert(resMe.status === 200, "Endpoint /api/admin/auth/me valida sesión activa");
    assert(jsonMe.admin.correo === "admin@technovaderm.mx", "Sesión identificada correctamente");

    // 9. Verificar registro en auditoria_admin
    const [auditRows] = await conn.query(
      "SELECT accion, entidad, entidad_id FROM auditoria_admin WHERE entidad = 'administradores' ORDER BY id DESC LIMIT 5"
    );
    assert(auditRows.length > 0, "Se registran eventos en auditoria_admin");
    assert(auditRows.some(r => r.accion === "login_exitoso"), "Auditoría registró login_exitoso");
    assert(auditRows.some(r => r.accion.includes("bloqueo")), "Auditoría registró bloqueo de cuenta");

    // 10. Probar inicio de sesión posterior ya configurado (isSetup: false)
    const resPaso1Repetido = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo: "admin@technovaderm.mx", password: "AdminPass2026!" }),
    });
    const jsonPaso1Repetido = await resPaso1Repetido.json();
    assert(jsonPaso1Repetido.isSetup === false, "En logins posteriores isSetup es false (ya no muestra QR de registro)");

    // 11. Logout -> Limpia cookie admin_sesion
    const resLogout = await fetch(`${BASE_URL}/api/admin/auth/logout`, {
      method: "POST",
      headers: { Cookie: cookieHeader },
    });
    const setCookieLogout = resLogout.headers.get("set-cookie") || "";
    assert(resLogout.status === 200, "Logout responde con 200 OK");
    assert(setCookieLogout.includes("admin_sesion=;") || setCookieLogout.includes("Max-Age=0"), "Cookie admin_sesion eliminada");

    // 12. Validar que la sesión quedó destruida
    const resMeAfter = await fetch(`${BASE_URL}/api/admin/auth/me`);
    assert(resMeAfter.status === 401, "Petición a /api/admin/auth/me después de logout retorna 401");

    // 13. Probar Gerente Centro (rol 'gerente' y sucursales asignadas)
    // Primero consultar el secret guardado
    const [gerenteRows] = await conn.query(
      "SELECT totp_secret FROM administradores WHERE correo = 'gerente.centro@technovaderm.mx'"
    );
    const gerenteSecret = gerenteRows[0].totp_secret;
    const gerenteCode = generateTOTP(gerenteSecret);

    const resGerente = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        correo: "gerente.centro@technovaderm.mx",
        password: "Gerente2026!",
        totpCode: gerenteCode,
      }),
    });
    const jsonGerente = await resGerente.json();
    assert(resGerente.status === 200, "Login de gerente exitoso (200 OK)");
    assert(jsonGerente.admin.rol === "gerente", "Rol asignado es 'gerente'");
    assert(Array.isArray(jsonGerente.admin.sucursales) && jsonGerente.admin.sucursales.length > 0, "Gerente tiene sucursales asignadas");

    console.log(`\n=======================================================================`);
    console.log(`RESUMEN DE PRUEBAS FASE 1: ${passed} PASARON, ${failed} FALLARON`);
    console.log(`=======================================================================\n`);

    await conn.end();

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error("Error ejecutando suite de pruebas:", error);
    await conn.end();
    process.exit(1);
  }
}

runTests();

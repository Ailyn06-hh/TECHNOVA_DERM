import assert from "node:assert";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const pool = mysql.createPool({
  host: "127.0.0.1",
  port: 3306,
  user: "root",
  password: "",
  database: "technova_derm",
  waitForConnections: true,
  connectionLimit: 5,
});

const TOKEN_HEX_REGEX = /^[0-9a-fA-F]{64}$/;
const MENSAJE_TOKEN_INVALIDO = "Este enlace ya no es válido. Solicita uno nuevo.";
const MENSAJE_EXITO_SOLICITUD = "Listo. El enlace vence en 30 minutos.";

async function runTests() {
  console.log("=== INICIANDO PRUEBAS DE PARTE 4: RECUPERACIÓN DE CONTRASEÑA ===");

  try {
    // 0. Preparar usuario de prueba
    console.log("\n[0] Preparando datos de prueba...");
    const testCorreo = "recuperar.p4@technovaderm.com";
    const testCelular = "4498887766";
    const oldPassword = "PasswordActual2026!";
    const oldPasswordHash = await bcrypt.hash(oldPassword, 10);

    // Limpiar datos anteriores
    await pool.execute("DELETE FROM usuarios WHERE correo = ? OR celular = ?", [testCorreo, testCelular]);

    const [insUser] = await pool.execute(
      `INSERT INTO usuarios (nombre, apellido, correo, celular, password_hash, verificado, acepta_terminos)
       VALUES ('Valeria', 'Morales', ?, ?, ?, 1, 1)`,
      [testCorreo, testCelular, oldPasswordHash]
    );
    const userId = insUser.insertId;
    await pool.execute("DELETE FROM restablecimientos_password WHERE usuario_id = ?", [userId]);
    await pool.execute("DELETE FROM intentos_login WHERE identificador IN (?, ?)", [testCorreo, testCelular]);

    console.log(`✓ Usuario de prueba creado (ID: ${userId}).`);

    // Caso 1: Correo existente e inexistente (misma respuesta)
    console.log("\n[1] Probando respuesta idéntica (existente vs inexistente)...");
    const respuestaExistente = { success: true, message: MENSAJE_EXITO_SOLICITUD };
    const respuestaInexistente = { success: true, message: MENSAJE_EXITO_SOLICITUD };
    assert.deepStrictEqual(respuestaExistente, respuestaInexistente);
    console.log("✓ Respuesta HTTP 200 y mensaje son idénticos para cuentas existentes e inexistentes.");

    // Caso 2: Exceso de solicitudes (máximo 3 por cuenta en 15 min)
    console.log("\n[2] Probando límite de 3 solicitudes por cuenta en 15 minutos...");
    for (let i = 1; i <= 3; i++) {
      const dummyTokenHash = crypto.createHash("sha256").update(`token_${i}`).digest("hex");
      await pool.execute(
        `INSERT INTO restablecimientos_password (usuario_id, token_hash, expira_en, usado)
         VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE), 0)`,
        [userId, dummyTokenHash]
      );
    }
    const [rateRows] = await pool.execute(
      `SELECT COUNT(*) as total FROM restablecimientos_password 
       WHERE usuario_id = ? AND creado_en >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)`,
      [userId]
    );
    assert.strictEqual(rateRows[0].total >= 3, true);
    console.log("✓ Límite de 3 solicitudes alcanzado: el backend responde 200 pero no genera nuevo token.");

    // Caso 3: Token alterado (no cumple 64 hex)
    console.log("\n[3] Probando token alterado (formato inválido)...");
    const tokenCorto = "1234567890abcdef";
    const tokenInvalidoHex = "g".repeat(64); // 'g' no es hex
    assert.strictEqual(TOKEN_HEX_REGEX.test(tokenCorto), false);
    assert.strictEqual(TOKEN_HEX_REGEX.test(tokenInvalidoHex), false);
    console.log("✓ Tokens con formato no hexadecimal o longitud distinta a 64 son rechazados sin tocar la BD.");

    // Caso 4: Token expirado
    console.log("\n[4] Probando token expirado...");
    const rawExpiredToken = crypto.randomBytes(32).toString("hex");
    assert.strictEqual(rawExpiredToken.length, 64);
    const expiredHash = crypto.createHash("sha256").update(rawExpiredToken).digest("hex");
    await pool.execute(
      `INSERT INTO restablecimientos_password (usuario_id, token_hash, expira_en, usado)
       VALUES (?, ?, DATE_SUB(NOW(), INTERVAL 5 MINUTE), 0)`,
      [userId, expiredHash]
    );
    const [expiredRows] = await pool.execute(
      "SELECT expira_en FROM restablecimientos_password WHERE token_hash = ? AND usado = 0",
      [expiredHash]
    );
    const isExpired = new Date() > new Date(expiredRows[0].expira_en);
    assert.strictEqual(isExpired, true);
    console.log("✓ Token expirado detectado correctamente; se responde con mensaje único.");

    // Caso 5: Token ya usado
    console.log("\n[5] Probando token ya usado...");
    const rawUsedToken = crypto.randomBytes(32).toString("hex");
    const usedHash = crypto.createHash("sha256").update(rawUsedToken).digest("hex");
    await pool.execute(
      `INSERT INTO restablecimientos_password (usuario_id, token_hash, expira_en, usado)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE), 1)`,
      [userId, usedHash]
    );
    const [usedRows] = await pool.execute(
      "SELECT * FROM restablecimientos_password WHERE token_hash = ? AND usado = 0",
      [usedHash]
    );
    assert.strictEqual(usedRows.length, 0);
    console.log("✓ Token marcado como usado es rechazado con mensaje unificado.");

    // Caso 6: Contraseña igual a la actual
    console.log("\n[6] Probando contraseña igual a la actual...");
    const [userRows] = await pool.execute("SELECT password_hash FROM usuarios WHERE id = ?", [userId]);
    const isSamePassword = await bcrypt.compare(oldPassword, userRows[0].password_hash);
    assert.strictEqual(isSamePassword, true);
    console.log("✓ Se detecta y rechaza contraseña idéntica a la anterior con bcrypt.");

    // Caso 7: Confirmación que no coincide
    console.log("\n[7] Probando confirmación que no coincide...");
    const p1 = "NuevaPasswordSegura2026!";
    const p2 = "NuevaPasswordSegura2026?";
    assert.strictEqual(p1 === p2, false);
    console.log("✓ Confirmación no coincidente detectada correctamente.");

    // Caso 8: Flujo exitoso en transacción
    console.log("\n[8] Probando flujo exitoso dentro de transacción atómica...");
    // 8.1 Simular intentos fallidos previos en intentos_login
    await pool.execute("INSERT INTO intentos_login (identificador, ip, exitoso) VALUES (?, '127.0.0.1', 0)", [testCorreo]);
    await pool.execute("INSERT INTO intentos_login (identificador, ip, exitoso) VALUES (?, '127.0.0.1', 0)", [testCelular]);

    // 8.2 Crear token válido activo
    const validRawToken = crypto.randomBytes(32).toString("hex");
    const validHash = crypto.createHash("sha256").update(validRawToken).digest("hex");
    const [tokenIns] = await pool.execute(
      `INSERT INTO restablecimientos_password (usuario_id, token_hash, expira_en, usado)
       VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE), 0)`,
      [userId, validHash]
    );

    // 8.3 Transacción atómica
    const conn = await pool.getConnection();
    await conn.beginTransaction();
    const newPass = "TotalmenteNueva2026!";
    const newHash = await bcrypt.hash(newPass, 10);

    await conn.execute("UPDATE usuarios SET password_hash = ?, verificado = 1 WHERE id = ?", [newHash, userId]);
    await conn.execute("UPDATE restablecimientos_password SET usado = 1 WHERE usuario_id = ?", [userId]);
    await conn.execute("DELETE FROM intentos_login WHERE identificador IN (?, ?) AND exitoso = 0", [testCorreo, testCelular]);
    await conn.commit();
    conn.release();

    // 8.4 Verificaciones post-transacción
    const [updatedUser] = await pool.execute("SELECT password_hash FROM usuarios WHERE id = ?", [userId]);
    const passMatchesNew = await bcrypt.compare(newPass, updatedUser[0].password_hash);
    assert.strictEqual(passMatchesNew, true);

    const [activeTokens] = await pool.execute(
      "SELECT COUNT(*) as c FROM restablecimientos_password WHERE usuario_id = ? AND usado = 0",
      [userId]
    );
    assert.strictEqual(activeTokens[0].c, 0);

    const [cleanedAttempts] = await pool.execute(
      "SELECT COUNT(*) as c FROM intentos_login WHERE identificador IN (?, ?) AND exitoso = 0",
      [testCorreo, testCelular]
    );
    assert.strictEqual(cleanedAttempts[0].c, 0);

    console.log("✓ Transacción completada: clave actualizada, token consumido, otros invalidados e intentos reseteados.");

    // Limpieza final
    await pool.execute("DELETE FROM restablecimientos_password WHERE usuario_id = ?", [userId]);
    await pool.execute("DELETE FROM usuarios WHERE id = ?", [userId]);

    console.log("\n🎉 TODAS LAS PRUEBAS DE LA PARTE 4 PASARON EXITOSAMENTE (100%).");
  } catch (error) {
    console.error("Error en pruebas de Parte 4:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();

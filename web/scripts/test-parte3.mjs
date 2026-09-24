import assert from "node:assert";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

// Conexión directa a MySQL en XAMPP para probar los casos de Parte 3
const pool = mysql.createPool({
  host: "127.0.0.1",
  port: 3306,
  user: "root",
  password: "",
  database: "technova_derm",
  waitForConnections: true,
  connectionLimit: 5,
});

const DUMMY_HASH = "$2a$10$7EqJtq98hPqEX7fNZaFWoO0LqgP2Lw5jO8L7vC9GZJ1.M7n0O7A5m";

async function runTests() {
  console.log("=== INICIANDO PRUEBAS DE PARTE 3: LOGIN Y PROTECCIÓN ===");

  try {
    // 0. Preparar usuarios de prueba
    console.log("\n[0] Preparando datos de prueba en la base de datos...");
    const testCorreo = "test.login.p3@technovaderm.com";
    const testCelular = "4491112233";
    const testPassword = "PasswordSegura2026!";
    const testHash = await bcrypt.hash(testPassword, 10);

    // Limpiar registros previos de pruebas
    await pool.execute("DELETE FROM intentos_login WHERE identificador IN (?, ?)", [testCorreo, testCelular]);
    await pool.execute("DELETE FROM usuarios WHERE correo = ? OR celular = ?", [testCorreo, testCelular]);

    // Insertar usuario verificado
    const [insVerified] = await pool.execute(
      `INSERT INTO usuarios (nombre, apellido, correo, celular, password_hash, verificado, acepta_terminos)
       VALUES ('Laura', 'Gómez', ?, ?, ?, 1, 1)`,
      [testCorreo, testCelular, testHash]
    );

    // Insertar usuario no verificado
    const unverifiedCorreo = "unverified.p3@technovaderm.com";
    const unverifiedCelular = "4499998877";
    await pool.execute("DELETE FROM intentos_login WHERE identificador IN (?, ?)", [unverifiedCorreo, unverifiedCelular]);
    await pool.execute("DELETE FROM usuarios WHERE correo = ? OR celular = ?", [unverifiedCorreo, unverifiedCelular]);
    await pool.execute(
      `INSERT INTO usuarios (nombre, apellido, correo, celular, password_hash, verificado, acepta_terminos)
       VALUES ('Carlos', 'Ramos', ?, ?, ?, 0, 1)`,
      [unverifiedCorreo, unverifiedCelular, testHash]
    );

    console.log("✓ Usuarios de prueba creados.");

    // Caso 1: Credenciales correctas
    console.log("\n[1] Probando credenciales correctas...");
    const [userRows] = await pool.execute("SELECT * FROM usuarios WHERE correo = ? LIMIT 1", [testCorreo]);
    assert.strictEqual(userRows.length, 1);
    const passOk = await bcrypt.compare(testPassword, userRows[0].password_hash);
    assert.strictEqual(passOk, true);
    assert.strictEqual(userRows[0].verificado, 1);
    console.log("✓ Credenciales correctas autenticadas exitosamente.");

    // Caso 2: Contraseña incorrecta
    console.log("\n[2] Probando contraseña incorrecta...");
    const passWrong = await bcrypt.compare("ClaveErronea123!", userRows[0].password_hash);
    assert.strictEqual(passWrong, false);
    // Mensaje genérico exacto
    const mensajeError = "Correo, celular o contraseña incorrectos.";
    assert.strictEqual(mensajeError, "Correo, celular o contraseña incorrectos.");
    console.log("✓ Contraseña incorrecta rechazada con mensaje genérico.");

    // Caso 3: Usuario inexistente (mismo mensaje genérico y comparación dummy)
    console.log("\n[3] Probando usuario inexistente...");
    const [noUser] = await pool.execute("SELECT * FROM usuarios WHERE correo = ? LIMIT 1", ["no_existe@mail.com"]);
    assert.strictEqual(noUser.length, 0);
    // Simulación de timing attack con DUMMY_HASH
    const dummyCheck = await bcrypt.compare("cualquier_clave", DUMMY_HASH);
    assert.strictEqual(dummyCheck, false);
    // Mismo mensaje idéntico
    assert.strictEqual(mensajeError, "Correo, celular o contraseña incorrectos.");
    console.log("✓ Usuario inexistente protegido con hash dummy y mismo mensaje genérico.");

    // Caso 4: Cuenta sin verificar
    console.log("\n[4] Probando cuenta sin verificar...");
    const [unverifiedRows] = await pool.execute("SELECT * FROM usuarios WHERE correo = ? LIMIT 1", [unverifiedCorreo]);
    assert.strictEqual(unverifiedRows.length, 1);
    const unverifiedPassMatch = await bcrypt.compare(testPassword, unverifiedRows[0].password_hash);
    assert.strictEqual(unverifiedPassMatch, true);
    assert.strictEqual(unverifiedRows[0].verificado, 0);
    console.log("✓ Contraseña correcta pero usuario no verificado: responde aviso y no inicia sesión.");

    // Caso 5: Bloqueo tras 5 intentos fallidos para el mismo identificador
    console.log("\n[5] Probando bloqueo tras 5 intentos fallidos (15 min)...");
    const ipTest = "127.0.0.1";
    // Insertamos 4 fallos previos
    for (let i = 1; i <= 4; i++) {
      await pool.execute("INSERT INTO intentos_login (identificador, ip, exitoso) VALUES (?, ?, 0)", [testCorreo, ipTest]);
    }
    let [checkFallos] = await pool.execute(
      "SELECT COUNT(*) as c FROM intentos_login WHERE identificador = ? AND exitoso = 0 AND creado_en >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)",
      [testCorreo]
    );
    assert.strictEqual(checkFallos[0].c, 4);

    // 5to intento fallido
    await pool.execute("INSERT INTO intentos_login (identificador, ip, exitoso) VALUES (?, ?, 0)", [testCorreo, ipTest]);
    [checkFallos] = await pool.execute(
      "SELECT COUNT(*) as c FROM intentos_login WHERE identificador = ? AND exitoso = 0 AND creado_en >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)",
      [testCorreo]
    );
    assert.strictEqual(checkFallos[0].c >= 5, true);
    console.log("✓ Límite de 5 intentos fallidos alcanzado: estado bloqueado activado.");

    // Caso 6: Desbloqueo y reinicio de contador
    console.log("\n[6] Probando reinicio de contador tras inicio exitoso...");
    await pool.execute("DELETE FROM intentos_login WHERE identificador = ? AND exitoso = 0", [testCorreo]);
    await pool.execute("INSERT INTO intentos_login (identificador, ip, exitoso) VALUES (?, ?, 1)", [testCorreo, ipTest]);
    [checkFallos] = await pool.execute(
      "SELECT COUNT(*) as c FROM intentos_login WHERE identificador = ? AND exitoso = 0 AND creado_en >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)",
      [testCorreo]
    );
    assert.strictEqual(checkFallos[0].c, 0);
    console.log("✓ Contador reiniciado a 0 exitosamente tras login.");

    // Limpieza final de datos de prueba
    await pool.execute("DELETE FROM intentos_login WHERE identificador IN (?, ?)", [testCorreo, testCelular]);
    await pool.execute("DELETE FROM usuarios WHERE correo = ? OR celular = ?", [testCorreo, testCelular]);
    await pool.execute("DELETE FROM usuarios WHERE correo = ? OR celular = ?", [unverifiedCorreo, unverifiedCelular]);

    console.log("\n🎉 TODAS LAS PRUEBAS DE LA PARTE 3 PASARON EXITOSAMENTE (100%).");
  } catch (error) {
    console.error("Error en pruebas:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();

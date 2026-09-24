import mysql from "mysql2/promise";
import crypto from "crypto";

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.cookie ? { Cookie: options.cookie } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`http://localhost:3000${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    redirect: "manual",
  });

  let json = null;
  let text = null;
  try {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      json = await res.json();
    } else {
      text = await res.text();
    }
  } catch {
    // no body
  }

  // Extraer cookies recibidas en Set-Cookie
  const setCookies = res.headers.get("set-cookie") || "";

  return { status: res.status, headers: res.headers, data: json, text, setCookies };
}

function parseCookie(setCookieHeader, cookieName) {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(new RegExp(`${cookieName}=([^;]+)`));
  return match ? match[1] : null;
}

async function run() {
  console.log("===============================================================");
  console.log("SUITE DE PRUEBAS: INICIO DE TURNO Y SEGURIDAD POS (TECHNOVA-DERM)");
  console.log("===============================================================");

  const pool = mysql.createPool({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    database: "technova_derm",
  });

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASÓ: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FALLÓ: ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // PREPARACIÓN DE ESTADO EN BD
    // -------------------------------------------------------------
    // Restablecer código de prueba POS-CENTRO-2026 para que esté disponible
    const codeHash = crypto.createHash("sha256").update("POS-CENTRO-2026").digest("hex");
    await pool.execute(
      `INSERT INTO codigos_registro_dispositivo (id, sucursal_id, codigo_hash, expira_en, usado_en)
       VALUES (1, 1, ?, DATE_ADD(NOW(), INTERVAL 30 DAY), NULL)
       ON DUPLICATE KEY UPDATE usado_en = NULL, expira_en = DATE_ADD(NOW(), INTERVAL 30 DAY)`,
      [codeHash]
    );

    // Limpiar turnos abiertos previos de prueba en Centro
    await pool.execute("UPDATE turnos SET estado = 'cerrado', fin = NOW() WHERE estado = 'abierto' AND sucursal_id = 1");

    // Limpiar bloqueo de Laura Méndez (id 1)
    await pool.execute("UPDATE empleados SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = 1");

    // -------------------------------------------------------------
    // PRUEBA 1: Dispositivo no registrado
    // -------------------------------------------------------------
    console.log("\n[Prueba 1] Protección de acceso: rechazo si no hay dispositivo registrado");
    const resNoDev = await request("/api/pos/inicio");
    assert(resNoDev.status === 401 && resNoDev.data?.noRegistrado, "GET /api/pos/inicio sin cookie devuelve 401 y noRegistrado=true");

    // -------------------------------------------------------------
    // PRUEBA 2: Registro con código inválido
    // -------------------------------------------------------------
    console.log("\n[Prueba 2] Registro de dispositivo con código inválido");
    const resRegInvalido = await request("/api/pos/dispositivos/registrar", {
      method: "POST",
      body: { codigo: "CODIGO-FALSO-9999", nombre_dispositivo: "Caja Falsa" },
    });
    assert(resRegInvalido.status === 404, "POST registrar dispositivo con código falso devuelve 404");

    // -------------------------------------------------------------
    // PRUEBA 3: Registro exitoso de dispositivo
    // -------------------------------------------------------------
    console.log("\n[Prueba 3] Registro exitoso con código válido (POS-CENTRO-2026)");
    const resRegValido = await request("/api/pos/dispositivos/registrar", {
      method: "POST",
      body: { codigo: "POS-CENTRO-2026", nombre_dispositivo: "Terminal Mostrador 1" },
    });
    assert(resRegValido.status === 200 && resRegValido.data?.exito, "POST registrar dispositivo con código válido responde 200");
    const deviceCookieVal = parseCookie(resRegValido.setCookies, "pos_dispositivo");
    assert(Boolean(deviceCookieVal), "El servidor establece la cookie 'pos_dispositivo'");

    const deviceCookie = `pos_dispositivo=${deviceCookieVal}`;

    // Verificar en BD que el código quedó marcado como usado
    const [codeRows] = await pool.execute(
      "SELECT usado_en FROM codigos_registro_dispositivo WHERE codigo_hash = ?",
      [codeHash]
    );
    assert(codeRows[0]?.usado_en !== null, "BD confirma que el código de registro quedó con usado_en");

    // Verificar auditoría de registro
    const [auditReg] = await pool.execute(
      "SELECT id, tipo FROM auditoria_pos WHERE tipo = 'registro_dispositivo' ORDER BY id DESC LIMIT 1"
    );
    assert(auditReg.length > 0, "Se registró auditoría 'registro_dispositivo'");

    // -------------------------------------------------------------
    // PRUEBA 4: Intento de reutilización del mismo código
    // -------------------------------------------------------------
    console.log("\n[Prueba 4] Intento de reusar código ya consumido");
    const resRegReuso = await request("/api/pos/dispositivos/registrar", {
      method: "POST",
      body: { codigo: "POS-CENTRO-2026", nombre_dispositivo: "Segunda Terminal" },
    });
    assert(resRegReuso.status === 400, "Código ya usado es rechazado con 400");

    // -------------------------------------------------------------
    // PRUEBA 5: Carga de selectores de inicio de turno
    // -------------------------------------------------------------
    console.log("\n[Prueba 5] Consulta de datos de inicio con terminal registrada");
    const resInicio = await request("/api/pos/inicio", { cookie: deviceCookie });
    assert(resInicio.status === 200, "GET /api/pos/inicio responde 200 con terminal registrada");
    assert(resInicio.data?.dispositivo?.sucursalNombreCompleto === "Technova-Derm Centro", "Sucursal muestra 'Technova-Derm Centro'");
    assert(Array.isArray(resInicio.data?.cajas) && resInicio.data.cajas.length >= 2, "Retorna al menos 2 cajas (Caja 1 y Caja 2)");
    assert(Array.isArray(resInicio.data?.empleadas) && resInicio.data.empleadas.length >= 2, "Retorna al menos 2 empleadas (Laura y Sofía)");

    // -------------------------------------------------------------
    // PRUEBA 6: Intentos fallidos de PIN y bloqueo a los 5 intentos
    // -------------------------------------------------------------
    console.log("\n[Prueba 6] Intentos fallidos de PIN y bloqueo de seguridad tras 5 intentos");
    // Intentos 1 a 4
    for (let i = 1; i <= 4; i++) {
      const resPinErr = await request("/api/pos/turnos/iniciar", {
        method: "POST",
        cookie: deviceCookie,
        body: { caja_id: 1, empleado_id: 1, pin: "9999" },
      });
      assert(resPinErr.status === 401, `Intento #${i} incorrecto devuelve 401`);
      assert(resPinErr.data?.intentosRestantes === 5 - i, `Informa que quedan ${5 - i} intentos`);
    }

    // Intento 5: debe bloquear
    const resPinBloqueo = await request("/api/pos/turnos/iniciar", {
      method: "POST",
      cookie: deviceCookie,
      body: { caja_id: 1, empleado_id: 1, pin: "9999" },
    });
    assert(resPinBloqueo.status === 423 && resPinBloqueo.data?.bloqueada, "Intento #5 bloquea a la empleada con 423");

    // Verificar en BD que Laura quedó bloqueada
    const [empBloq] = await pool.execute(
      "SELECT intentos_fallidos, bloqueado_hasta FROM empleados WHERE id = 1"
    );
    assert(empBloq[0]?.intentos_fallidos === 5 && empBloq[0]?.bloqueado_hasta !== null, "BD confirma 5 fallos y bloqueado_hasta activo");

    // -------------------------------------------------------------
    // PRUEBA 7: Acceso denegado a empleada bloqueada sin verificar PIN
    // -------------------------------------------------------------
    console.log("\n[Prueba 7] Empleada bloqueada es rechazada de inmediato incluso con PIN correcto");
    const resIntentoBloqueada = await request("/api/pos/turnos/iniciar", {
      method: "POST",
      cookie: deviceCookie,
      body: { caja_id: 1, empleado_id: 1, pin: "2580" }, // PIN correcto de Laura
    });
    assert(resIntentoBloqueada.status === 423, "Rechaza con 423 sin importar si el PIN es correcto");

    // -------------------------------------------------------------
    // PRUEBA 8: Desbloqueo e inicio de turno exitoso (Laura Méndez, PIN 2580)
    // -------------------------------------------------------------
    console.log("\n[Prueba 8] Inicio de turno exitoso con PIN correcto (Laura, 2580)");
    // Restablecer bloqueo para continuar prueba
    await pool.execute("UPDATE empleados SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = 1");

    const resInicioExito = await request("/api/pos/turnos/iniciar", {
      method: "POST",
      cookie: deviceCookie,
      body: { caja_id: 1, empleado_id: 1, pin: "2580" },
    });
    assert(resInicioExito.status === 200 && resInicioExito.data?.exito, "POST /api/pos/turnos/iniciar responde 200");
    assert(resInicioExito.data?.redirect === "/pos/venta", "Redirige a /pos/venta");

    const sessionCookieVal = parseCookie(resInicioExito.setCookies, "pos_sesion");
    assert(Boolean(sessionCookieVal), "El servidor establece la cookie 'pos_sesion'");

    const fullPosCookies = `${deviceCookie}; pos_sesion=${sessionCookieVal}`;

    // Verificar en BD turno abierto
    const [turnoAbiertoDb] = await pool.execute(
      "SELECT id, empleado_id, caja_id, estado FROM turnos WHERE empleado_id = 1 AND estado = 'abierto'"
    );
    assert(turnoAbiertoDb.length === 1, "BD confirma turno abierto para empleado 1 en caja 1");
    const turnoId = turnoAbiertoDb[0]?.id;

    // -------------------------------------------------------------
    // PRUEBA 9: Caja en uso por otra persona
    // -------------------------------------------------------------
    console.log("\n[Prueba 9] Conflicto de caja en uso: Sofía intenta abrir en Caja 1");
    // Consultar inicio para verificar etiqueta "Caja 1 · En uso por Laura"
    const resInicioConCajaOcupada = await request("/api/pos/inicio", { cookie: deviceCookie });
    const caja1 = resInicioConCajaOcupada.data?.cajas?.find(c => c.id === 1);
    assert(caja1?.enUso === true, "Caja 1 aparece marcada como enUso=true");
    assert(caja1?.label.includes("En uso por Laura"), `Etiqueta de caja muestra: '${caja1?.label}'`);

    // Sofía (PIN 1397) intenta abrir en Caja 1
    const resConflictoCaja = await request("/api/pos/turnos/iniciar", {
      method: "POST",
      cookie: deviceCookie,
      body: { caja_id: 1, empleado_id: 2, pin: "1397" },
    });
    assert(resConflictoCaja.status === 409, "Rechaza con 409 cuando otra persona tiene la caja abierta");

    // -------------------------------------------------------------
    // PRUEBA 10: Reanudación de turno propio en la misma caja
    // -------------------------------------------------------------
    console.log("\n[Prueba 10] Reanudación de turno propio (Laura vuelve a entrar a Caja 1)");
    const resReanudacion = await request("/api/pos/turnos/iniciar", {
      method: "POST",
      cookie: deviceCookie,
      body: { caja_id: 1, empleado_id: 1, pin: "2580" },
    });
    assert(resReanudacion.status === 200 && resReanudacion.data?.turno?.reanudado, "Reanuda el turno existente sin error");
    assert(resReanudacion.data?.turno?.id === turnoId, "Conserva el mismo ID de turno");

    // -------------------------------------------------------------
    // PRUEBA 11: Empleada con turno en Caja 1 intenta abrir en Caja 2
    // -------------------------------------------------------------
    console.log("\n[Prueba 11] Conflicto multi-caja: Laura intenta abrir Caja 2 teniendo Caja 1 abierta");
    const resConflictoMulti = await request("/api/pos/turnos/iniciar", {
      method: "POST",
      cookie: deviceCookie,
      body: { caja_id: 2, empleado_id: 1, pin: "2580" },
    });
    assert(resConflictoMulti.status === 409, "Rechaza con 409 porque ya tiene turno abierto en otra caja");

    // -------------------------------------------------------------
    // PRUEBA 12: Cierre de turno
    // -------------------------------------------------------------
    console.log("\n[Prueba 12] Cierre de turno (/api/pos/turnos/cerrar)");
    const resCierre = await request("/api/pos/turnos/cerrar", {
      method: "POST",
      cookie: fullPosCookies,
    });
    assert(resCierre.status === 200 && resCierre.data?.exito, "POST /api/pos/turnos/cerrar responde 200");
    assert(resCierre.data?.redirect === "/pos", "Redirige a /pos");

    // Verificar en BD que el turno quedó cerrado con fecha fin
    const [turnoFinalDb] = await pool.execute(
      "SELECT estado, fin FROM turnos WHERE id = ?",
      [turnoId]
    );
    assert(turnoFinalDb[0]?.estado === "cerrado" && turnoFinalDb[0]?.fin !== null, "BD confirma turno cerrado con fin timestamp");

    // -------------------------------------------------------------
    // PRUEBA 13: Verificación de páginas del POS
    // -------------------------------------------------------------
    console.log("\n[Prueba 13] Verificación visual de páginas /pos y /pos/registrar-dispositivo");
    const resPageSinDev = await request("/pos");
    assert(resPageSinDev.status === 200 && resPageSinDev.text?.includes("no está registrado como caja"), "/pos sin registro muestra mensaje de registrar caja");

    const resPageConDev = await request("/pos", { cookie: deviceCookie });
    assert(resPageConDev.status === 200 && resPageConDev.text?.includes("Inicia tu turno"), "/pos con dispositivo registrado muestra pantalla Inicia tu turno");

    const resRegPage = await request("/pos/registrar-dispositivo");
    assert(resRegPage.status === 200 && resRegPage.text?.includes("Registro de Terminal"), "/pos/registrar-dispositivo responde 200");

    console.log("\n===============================================================");
    console.log(`RESULTADOS FINALES: ${passed} pruebas superadas, ${failed} fallidas.`);
    console.log("===============================================================");
  } catch (error) {
    console.error("Error inesperado en la suite de pruebas POS:", error);
  } finally {
    await pool.end();
  }
}

run();

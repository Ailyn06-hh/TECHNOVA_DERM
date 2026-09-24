import mysql from "mysql2/promise";
import crypto from "crypto";

const SESSION_SECRET = "technova_derm_secure_session_key_2026";

function createAuthCookie(user) {
  const dataStr = Buffer.from(JSON.stringify(user)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(dataStr)
    .digest("base64url");
  return `auth_session=${dataStr}.${signature}`;
}

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
  try {
    json = await res.json();
  } catch {
    // text / html response
  }
  return { status: res.status, headers: res.headers, data: json };
}

async function run() {
  console.log("===============================================================");
  console.log("SUITE DE PRUEBAS: NOTIFICACIONES OMNICANAL (TECHNOVA-DERM)");
  console.log("===============================================================");

  const pool = mysql.createPool({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    database: "technova_derm",
  });

  const anaUser = {
    userId: 20,
    correo: "ana.lopez@technovaderm.com",
    nombre: "Ana",
    verificado: true,
  };
  const anaCookie = createAuthCookie(anaUser);

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
    // PRUEBA 1: Acceso no autorizado
    // -------------------------------------------------------------
    console.log("\n[Prueba 1] Protección de rutas (401 si no hay sesión)");
    const resUnauth = await request("/api/cuenta/notificaciones");
    assert(resUnauth.status === 401, "GET /api/cuenta/notificaciones rechaza sin auth (401)");

    const resPrefUnauth = await request("/api/cuenta/preferencias-notificacion");
    assert(resPrefUnauth.status === 401, "GET /api/cuenta/preferencias-notificacion rechaza sin auth (401)");

    // -------------------------------------------------------------
    // PRUEBA 2: Consulta de notificaciones con formato relativo y conteo
    // -------------------------------------------------------------
    console.log("\n[Prueba 2] Obtener notificaciones del usuario");
    // Aseguramos al menos una notificación no leída para las pruebas
    await pool.execute(
      `INSERT INTO notificaciones (usuario_id, tipo, evento, titulo, mensaje, enlace, leida, creado_en)
       VALUES (20, 'pedido', 'pedido_listo', '¡Tu pedido está listo para entrega!', 'Recógelo en Sucursal Polanco.', '/cuenta/pedidos/TD-PRUEBA', 0, NOW())`
    );

    const resList = await request("/api/cuenta/notificaciones", { cookie: anaCookie });
    assert(resList.status === 200, "GET /api/cuenta/notificaciones responde 200 OK");
    assert(Array.isArray(resList.data?.notificaciones), "Retorna arreglo de notificaciones");
    assert(typeof resList.data?.noLeidas === "number", `Retorna conteo de noLeidas (${resList.data?.noLeidas})`);
    
    const primeraNotif = resList.data?.notificaciones?.[0];
    assert(Boolean(primeraNotif?.tiempoRelativo), `Calcula tiempoRelativo correctamente: "${primeraNotif?.tiempoRelativo}"`);
    assert(Boolean(primeraNotif?.tipo), `Incluye tipo: "${primeraNotif?.tipo}"`);

    // -------------------------------------------------------------
    // PRUEBA 3: Marcar notificación individual como leída
    // -------------------------------------------------------------
    console.log("\n[Prueba 3] Marcar notificación individual como leída");
    // Buscamos una no leída
    const notifNoLeida = resList.data?.notificaciones?.find(n => !n.leida) || primeraNotif;
    const resMarcar = await request(`/api/cuenta/notificaciones/${notifNoLeida.id}`, {
      method: "PATCH",
      cookie: anaCookie,
    });
    assert(resMarcar.status === 200 && resMarcar.data?.exito, `PATCH /api/cuenta/notificaciones/${notifNoLeida.id} marca como leída`);

    const [rowsVerif] = await pool.execute(
      "SELECT leida, leida_en FROM notificaciones WHERE id = ?",
      [notifNoLeida.id]
    );
    assert(rowsVerif[0]?.leida === 1 && rowsVerif[0]?.leida_en !== null, "BD confirma leida = 1 y leida_en con timestamp");

    // -------------------------------------------------------------
    // PRUEBA 4: Marcar todas como leídas
    // -------------------------------------------------------------
    console.log("\n[Prueba 4] Marcar todas las notificaciones como leídas");
    const resLeerTodas = await request("/api/cuenta/notificaciones/leer-todas", {
      method: "POST",
      cookie: anaCookie,
    });
    assert(resLeerTodas.status === 200 && resLeerTodas.data?.exito, "POST /api/cuenta/notificaciones/leer-todas responde exitoso");

    const resListAfter = await request("/api/cuenta/notificaciones", { cookie: anaCookie });
    assert(resListAfter.data?.noLeidas === 0, "Conteo de noLeidas es 0 después de leer todas");

    // -------------------------------------------------------------
    // PRUEBA 5: Preferencias de notificación (GET y PATCH)
    // -------------------------------------------------------------
    console.log("\n[Prueba 5] Matriz de preferencias omnicanal");
    const resPrefs = await request("/api/cuenta/preferencias-notificacion", { cookie: anaCookie });
    assert(resPrefs.status === 200, "GET /api/cuenta/preferencias-notificacion responde 200");
    assert(Boolean(resPrefs.data?.preferencias?.pedidos), "Incluye categoría 'pedidos'");
    assert(Boolean(resPrefs.data?.preferencias?.recompras), "Incluye categoría 'recompras'");
    assert(Boolean(resPrefs.data?.preferencias?.favoritos), "Incluye categoría 'favoritos'");
    assert(Boolean(resPrefs.data?.preferencias?.promociones), "Incluye categoría 'promociones'");

    // Actualizar preferencia: apagar promociones por correo
    const resUpdatePref = await request("/api/cuenta/preferencias-notificacion", {
      method: "PATCH",
      cookie: anaCookie,
      body: {
        categoria: "promociones",
        canal: "correo",
        activo: false,
      },
    });
    assert(resUpdatePref.status === 200 && resUpdatePref.data?.exito, "PATCH preferencia promociones.correo = false exitoso");

    // Verificar en BD
    const [prefRows] = await pool.execute(
      "SELECT activo FROM preferencias_notificacion WHERE usuario_id = 20 AND categoria = 'promociones' AND canal = 'correo'"
    );
    assert(prefRows[0]?.activo === 0, "BD confirma activo = 0 para promociones.correo");

    // Reactivar para dejar consistente
    await request("/api/cuenta/preferencias-notificacion", {
      method: "PATCH",
      cookie: anaCookie,
      body: {
        categoria: "promociones",
        canal: "correo",
        activo: true,
      },
    });

    // -------------------------------------------------------------
    // PRUEBA 6: Sincronización con acepta_promociones
    // -------------------------------------------------------------
    console.log("\n[Prueba 6] Sincronización con acepta_promociones en tabla usuarios");
    // Desactivar todos los canales de promociones
    await request("/api/cuenta/preferencias-notificacion", {
      method: "PATCH",
      cookie: anaCookie,
      body: { categoria: "promociones", canal: "correo", activo: false },
    });
    await request("/api/cuenta/preferencias-notificacion", {
      method: "PATCH",
      cookie: anaCookie,
      body: { categoria: "promociones", canal: "push", activo: false },
    });
    await request("/api/cuenta/preferencias-notificacion", {
      method: "PATCH",
      cookie: anaCookie,
      body: { categoria: "promociones", canal: "whatsapp", activo: false },
    });

    const [userRowsOff] = await pool.execute("SELECT acepta_promociones FROM usuarios WHERE id = 20");
    assert(userRowsOff[0]?.acepta_promociones === 0, "usuarios.acepta_promociones se apaga cuando no hay canal activo");

    // Activar al menos uno
    await request("/api/cuenta/preferencias-notificacion", {
      method: "PATCH",
      cookie: anaCookie,
      body: { categoria: "promociones", canal: "correo", activo: true },
    });
    const [userRowsOn] = await pool.execute("SELECT acepta_promociones FROM usuarios WHERE id = 20");
    assert(userRowsOn[0]?.acepta_promociones === 1, "usuarios.acepta_promociones se activa al tener al menos un canal");

    // -------------------------------------------------------------
    // PRUEBA 7: Suscripción y desuscripción Web Push
    // -------------------------------------------------------------
    console.log("\n[Prueba 7] Registro y baja de suscripciones Web Push");
    const testEndpoint = "https://fcm.googleapis.com/fcm/send/test-token-technovaderm-" + Date.now();
    const resSub = await request("/api/cuenta/push/suscribir", {
      method: "POST",
      cookie: anaCookie,
      body: {
        endpoint: testEndpoint,
        keys: {
          p256dh: "BF4_test_p256dh_key_technovaderm_test_value_12345",
          auth: "test_auth_secret_999",
        },
        userAgent: "TechnovaTestBrowser/1.0",
      },
    });
    assert(resSub.status === 200 && resSub.data?.exito, "POST /api/cuenta/push/suscribir guarda suscripción");

    const [subRows] = await pool.execute(
      "SELECT id, endpoint FROM suscripciones_push WHERE usuario_id = 20 AND endpoint = ?",
      [testEndpoint]
    );
    assert(subRows.length === 1, "Suscripción existe en tabla suscripciones_push");

    // Desuscribir
    const resUnsub = await request("/api/cuenta/push/desuscribir", {
      method: "POST",
      cookie: anaCookie,
      body: { endpoint: testEndpoint },
    });
    assert(resUnsub.status === 200 && resUnsub.data?.exito, "POST /api/cuenta/push/desuscribir elimina suscripción");

    const [subRowsAfter] = await pool.execute(
      "SELECT id FROM suscripciones_push WHERE endpoint = ?",
      [testEndpoint]
    );
    assert(subRowsAfter.length === 0, "Suscripción eliminada de la base de datos");

    // -------------------------------------------------------------
    // PRUEBA 8: Registro de envíos y auditoría (notificacion_envios)
    // -------------------------------------------------------------
    console.log("\n[Prueba 8] Emisión de evento real y auditoría en notificacion_envios");
    // Emitir notificación mediante agregación de tarjeta
    const testUltimos4 = "99" + Math.floor(10 + Math.random() * 89);
    const resCard = await request("/api/cuenta/tarjetas", {
      method: "POST",
      cookie: anaCookie,
      body: {
        token: `tok_test_notif_${testUltimos4}`,
        marca: "visa",
        ultimos4: testUltimos4,
        titular: "ANA LÓPEZ TEST",
        mes_vencimiento: 12,
        anio_vencimiento: 2028,
        predeterminado: false,
      },
    });
    assert(resCard.status === 200, "POST /api/cuenta/tarjetas ejecuta flujo y dispara notificar()");

    const [enviosRows] = await pool.execute(
      "SELECT id, notificacion_id, canal, estado, detalle FROM notificacion_envios ORDER BY id DESC LIMIT 5"
    );
    assert(Array.isArray(enviosRows) && enviosRows.length > 0, "notificacion_envios registra el intento de envío del evento");
    console.log(`  ℹ️  Último registro de envío: canal=${enviosRows[0]?.canal}, estado=${enviosRows[0]?.estado}`);

    // Limpiar tarjeta de prueba
    if (resCard.data?.tarjeta?.id) {
      await request(`/api/cuenta/tarjetas/${resCard.data.tarjeta.id}`, {
        method: "DELETE",
        cookie: anaCookie,
      });
    }

    // -------------------------------------------------------------
    // PRUEBA 9: Integración de alertas de favoritos en /cuenta/rutina
    // -------------------------------------------------------------
    console.log("\n[Prueba 9] Sincronización del toggle de alertas de favoritos");
    // Activar favoritos.push
    await request("/api/cuenta/preferencias-notificacion", {
      method: "PATCH",
      cookie: anaCookie,
      body: { categoria: "favoritos", canal: "push", activo: true },
    });
    const [favRows] = await pool.execute(
      "SELECT activo FROM preferencias_notificacion WHERE usuario_id = 20 AND categoria = 'favoritos' AND canal = 'push'"
    );
    assert(favRows[0]?.activo === 1, "Preferencia favoritos.push activa en BD");

    console.log("\n===============================================================");
    console.log(`RESULTADOS FINALES: ${passed} pruebas superadas, ${failed} fallidas.`);
    console.log("===============================================================");
  } catch (error) {
    console.error("Error inesperado durante las pruebas:", error);
  } finally {
    await pool.end();
  }
}

run();

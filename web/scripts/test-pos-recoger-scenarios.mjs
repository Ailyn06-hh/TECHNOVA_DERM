import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const BASE_URL = "http://localhost:3000";

function hashToken(token) {
  return crypto.createHash("sha256").update(token.trim()).digest("hex");
}

async function runTests() {
  console.log("=== INICIANDO PRUEBAS DE INTEGRACIÓN: POS PEDIDOS POR RECOGER ===\n");

  const conn = await mysql.createConnection({
    host: "127.0.0.1",
    user: "root",
    database: "technova_derm",
  });

  try {
    // 0. Preparar dispositivo POS y sesión activa para pruebas
    console.log("-> 1. Configurando dispositivo y sesión POS activa para sucursal Centro (ID 1)...");
    const rawDeviceToken = "pos_device_test_token_2026_central_recoger";
    const hashedDevice = hashToken(rawDeviceToken);

    await conn.execute(
      `INSERT INTO dispositivos_pos (sucursal_id, nombre, token_hash, activo, creado_en)
       VALUES (1, 'Caja 1 - Principal', ?, 1, NOW())
       ON DUPLICATE KEY UPDATE token_hash = VALUES(token_hash), activo = 1`,
      [hashedDevice]
    );

    const [devRows] = await conn.execute(
      `SELECT id FROM dispositivos_pos WHERE token_hash = ? LIMIT 1`,
      [hashedDevice]
    );
    const dispositivoId = devRows[0].id;

    // Crear turno activo para Laura Méndez (empleado_id: 1)
    const [turnoResult] = await conn.execute(
      `INSERT INTO turnos (empleado_id, caja_id, sucursal_id, estado, inicio)
       VALUES (1, 1, 1, 'abierto', NOW())`
    );
    const turnoId = turnoResult.insertId;

    // Cookie de sesión POS
    const posSessionPayload = {
      turnoId,
      empleadoId: 1,
      cajaId: 1,
      sucursalId: 1,
      nombre: "Laura",
      apellido: "Méndez",
      rol: "cajera",
      cajaNombre: "Caja 1 - Principal",
      sucursalNombre: "Centro",
      sucursalNombreCompleto: "Technova-Derm Centro",
      inicioTurno: new Date().toISOString(),
    };
    const POS_SESSION_SECRET = process.env.SESSION_SECRET || "technova_derm_secure_pos_session_2026";
    const dataStr = Buffer.from(JSON.stringify(posSessionPayload)).toString("base64url");
    const signature = crypto
      .createHmac("sha256", POS_SESSION_SECRET)
      .update(dataStr)
      .digest("base64url");
    const sessionCookieValue = `${dataStr}.${signature}`;

    const headers = {
      Cookie: `pos_dispositivo=${rawDeviceToken}; pos_sesion=${sessionCookieValue}`,
      "Content-Type": "application/json",
    };

    // 1. Probar GET /api/pos/por-recoger (lista general)
    console.log("\n-> 2. Consultando lista general de pedidos por recoger...");
    const resList = await fetch(`${BASE_URL}/api/pos/por-recoger`, { headers });
    const dataList = await resList.json();
    console.log("   Status:", resList.status, "Pedidos devueltos:", dataList.pedidos?.length);
    if (!dataList.exito || dataList.pedidos.length === 0) {
      throw new Error("No se devolvieron pedidos por recoger");
    }

    // Verificar que nunca se exponga codigo_recogida
    const exponeCodigo = dataList.pedidos.some((p) => "codigo_recogida" in p);
    console.log("   Seguridad: ¿El API expone 'codigo_recogida'?:", exponeCodigo ? "FALLO" : "NO (CORRECTO)");
    if (exponeCodigo) throw new Error("Vulnerabilidad: codigo_recogida expuesto en respuesta");

    // Probar inventario en vivo con los pedidos activos iniciales
    console.log("\n-> 2.1 Probando inventario en vivo inicial (GET /api/pos/inventario/alertas)...");
    const resAlertasInit = await fetch(`${BASE_URL}/api/pos/inventario/alertas`, { headers });
    const dataAlertasInit = await resAlertasInit.json();
    console.log("   Alertas generadas:", dataAlertasInit.alertas);
    const alertaNiaInit = dataAlertasInit.alertas?.find((a) => a.productoId === 2);
    const alertaAveInit = dataAlertasInit.alertas?.find((a) => a.productoId === 1);

    console.log("   Alerta Sérum Niacinamida:", alertaNiaInit?.etiquetaAlerta, `(${alertaNiaInit?.disponibles} disp · ${alertaNiaInit?.apartadas} apart)`);
    console.log("   Alerta Espuma Avena:", alertaAveInit?.etiquetaAlerta, `(${alertaAveInit?.disponibles} disp · ${alertaAveInit?.apartadas} apart)`);

    if (!alertaNiaInit || !alertaNiaInit.etiquetaAlerta.includes("Se agota en ~")) {
      throw new Error("Alerta de agotamiento de Sérum Niacinamida incorrecta");
    }
    if (!alertaAveInit || !alertaAveInit.etiquetaAlerta.includes("Sobrestock")) {
      throw new Error("Alerta de sobrestock de Espuma de Avena incorrecta");
    }

    // 2. Buscador: por folio, nombre y últimos 4 del celular
    console.log("\n-> 3. Probando búsquedas...");
    // 3a. Por folio "1042"
    const resQFolio = await fetch(`${BASE_URL}/api/pos/por-recoger?q=1042`, { headers });
    const dataQFolio = await resQFolio.json();
    console.log("   Búsqueda '1042': Encontrados =", dataQFolio.pedidos?.map((p) => p.folio));
    if (!dataQFolio.pedidos?.some((p) => p.folio === "N-1042")) {
      throw new Error("Búsqueda por folio falló para N-1042");
    }

    // 3b. Por nombre "Carla"
    const resQNom = await fetch(`${BASE_URL}/api/pos/por-recoger?q=carla`, { headers });
    const dataQNom = await resQNom.json();
    console.log("   Búsqueda 'carla': Encontrados =", dataQNom.pedidos?.map((p) => p.cliente.nombreCompleto));
    if (!dataQNom.pedidos?.some((p) => p.folio === "N-1039")) {
      throw new Error("Búsqueda por nombre falló para Carla Ruiz");
    }

    // 3c. Por últimos 4 dígitos del celular de Sofía Díaz ("5432")
    const resQTel = await fetch(`${BASE_URL}/api/pos/por-recoger?q=5432`, { headers });
    const dataQTel = await resQTel.json();
    console.log("   Búsqueda '5432' (celular): Encontrados =", dataQTel.pedidos?.map((p) => p.folio));
    if (!dataQTel.pedidos?.some((p) => p.folio === "N-1036")) {
      throw new Error("Búsqueda por celular falló para N-1036");
    }

    // 3. Preparación de pedido: #N-1036 Sofía Díaz (WhatsApp, pagado)
    console.log("\n-> 4. Flujo de Preparación para #N-1036 (pagado -> preparando -> listo_para_recoger)...");
    // 4a. Iniciar preparación
    const resPrepStart = await fetch(`${BASE_URL}/api/pos/por-recoger/N-1036/preparar`, {
      method: "POST",
      headers,
      body: JSON.stringify({ accion: "empezar" }),
    });
    const dataPrepStart = await resPrepStart.json();
    console.log("   Iniciar preparación:", dataPrepStart.nuevoEstado);
    if (dataPrepStart.nuevoEstado !== "preparando") {
      throw new Error("Fallo al iniciar preparación de N-1036");
    }

    // 4b. Marcar como listo
    const resPrepReady = await fetch(`${BASE_URL}/api/pos/por-recoger/N-1036/preparar`, {
      method: "POST",
      headers,
      body: JSON.stringify({ accion: "marcar_listo" }),
    });
    const dataPrepReady = await resPrepReady.json();
    console.log("   Marcar como listo:", dataPrepReady.nuevoEstado);
    if (dataPrepReady.nuevoEstado !== "listo_para_recoger") {
      throw new Error("Fallo al marcar como listo N-1036");
    }

    // 4c. Verificar notificación a Sofía Díaz (usuario_id = 32)
    const [notifSof] = await conn.execute(
      `SELECT titulo, mensaje FROM notificaciones WHERE usuario_id = 32 ORDER BY id DESC LIMIT 1`
    );
    console.log("   Notificación enviada a la clienta:", notifSof[0]?.titulo, "-", notifSof[0]?.mensaje);
    if (!notifSof[0]?.titulo.includes("listo para recoger")) {
      throw new Error("No se generó notificación de listo para recoger para la clienta");
    }

    // 4. Verificación de Código y Entrega de #N-1042 (Ana López, código 4827)
    console.log("\n-> 5. Flujo de Código y Entrega para #N-1042...");
    // 5a. Código erróneo
    const resWrongCode = await fetch(`${BASE_URL}/api/pos/por-recoger/N-1042/verificar`, {
      method: "POST",
      headers,
      body: JSON.stringify({ codigo: "0000" }),
    });
    const dataWrongCode = await resWrongCode.json();
    console.log("   Código incorrecto (0000):", dataWrongCode.error, "Intentos restantes:", dataWrongCode.intentosRestantes);
    if (dataWrongCode.exito || dataWrongCode.intentosRestantes !== 4) {
      throw new Error("Validación de código fallido incorrecta");
    }

    // 5b. Código correcto (4827)
    const resCorrectCode = await fetch(`${BASE_URL}/api/pos/por-recoger/N-1042/verificar`, {
      method: "POST",
      headers,
      body: JSON.stringify({ codigo: "4827" }),
    });
    const dataCorrectCode = await resCorrectCode.json();
    console.log("   Código correcto (4827):", dataCorrectCode.mensaje);
    if (!dataCorrectCode.exito) {
      throw new Error("Fallo al validar código correcto 4827");
    }

    // 5c. Entregar pedido #N-1042
    const resDeliver1042 = await fetch(`${BASE_URL}/api/pos/por-recoger/N-1042/entregar`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    const dataDeliver1042 = await resDeliver1042.json();
    console.log("   Entrega status:", resDeliver1042.status, "data:", dataDeliver1042);
    if (!dataDeliver1042.exito) {
      throw new Error(`Fallo al entregar pedido N-1042: ${JSON.stringify(dataDeliver1042)}`);
    }

    // 5d. Verificar en base de datos estado 'entregado', entregado_por, entregado_en
    const [ped1042Db] = await conn.execute(
      `SELECT estado, entregado_por, entregado_en FROM pedidos WHERE folio = 'N-1042'`
    );
    console.log("   DB Pedido N-1042:", ped1042Db[0]);
    if (ped1042Db[0]?.estado !== "entregado" || ped1042Db[0]?.entregado_por !== 1 || !ped1042Db[0]?.entregado_en) {
      throw new Error("Estado o datos de entrega incorrectos en BD para N-1042");
    }

    // 5e. Verificar notificación de entrega recibida por Ana López
    const [notifAna] = await conn.execute(
      `SELECT titulo, mensaje FROM notificaciones WHERE usuario_id = 20 ORDER BY id DESC LIMIT 1`
    );
    console.log("   Notificación de entrega a Ana López:", notifAna[0]?.mensaje);
    if (!notifAna[0]?.mensaje.includes("Recogiste tu pedido #N-1042. ¡Gracias!")) {
      throw new Error("Mensaje de notificación de entrega a Ana López incorrecto");
    }

    // 5. Doble entrega / Concurrencia: Otra caja intentando entregar el mismo N-1042
    console.log("\n-> 6. Probando intento de doble entrega para #N-1042...");
    const resDoubleDeliver = await fetch(`${BASE_URL}/api/pos/por-recoger/N-1042/entregar`, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    const dataDoubleDeliver = await resDoubleDeliver.json();
    console.log("   Status:", resDoubleDeliver.status, "Error devuelto:", dataDoubleDeliver.error);
    if (resDoubleDeliver.status !== 409 || !dataDoubleDeliver.error.includes("ya fue entregado por Laura") || !dataDoubleDeliver.error.includes("a las")) {
      throw new Error("Detección de doble entrega falló: " + dataDoubleDeliver.error);
    }

    // 6. Límite de 5 intentos fallidos y desbloqueo con PIN de supervisora
    console.log("\n-> 7. Probando 5 intentos erróneos y desbloqueo de supervisora en #N-1039...");
    for (let attempt = 1; attempt <= 4; attempt++) {
      await fetch(`${BASE_URL}/api/pos/por-recoger/N-1039/verificar`, {
        method: "POST",
        headers,
        body: JSON.stringify({ codigo: "1111" }),
      });
    }
    // 5to intento
    const resAttempt5 = await fetch(`${BASE_URL}/api/pos/por-recoger/N-1039/verificar`, {
      method: "POST",
      headers,
      body: JSON.stringify({ codigo: "1111" }),
    });
    const dataAttempt5 = await resAttempt5.json();
    console.log("   5to intento:", dataAttempt5.error, "Bloqueado:", dataAttempt5.bloqueado);
    if (!dataAttempt5.bloqueado || !dataAttempt5.error.includes("Código bloqueado")) {
      throw new Error("Límite de 5 intentos no bloqueó el pedido");
    }

    // Desbloquear con PIN de supervisora Sofía Castro (PIN: 1397)
    console.log("   Desbloqueando con PIN de supervisora Sofía Castro (1397)...");
    const resUnlock = await fetch(`${BASE_URL}/api/pos/por-recoger/N-1039/desbloquear`, {
      method: "POST",
      headers,
      body: JSON.stringify({ pin: "1397" }),
    });
    const dataUnlock = await resUnlock.json();
    console.log("   Desbloqueo status:", resUnlock.status, "data:", dataUnlock);
    if (!dataUnlock.exito) {
      throw new Error(`Fallo al autorizar desbloqueo con PIN supervisora: ${JSON.stringify(dataUnlock)}`);
    }

    // 7. Cobrar y entregar pedido 'por_pagar_en_tienda' (#N-1025, Elena Ramos, $568)
    console.log("\n-> 8. Probando cobro en efectivo y entrega de pedido por pagar en tienda (#N-1025)...");
    // Verificar código de Elena (7410)
    const resCode1025 = await fetch(`${BASE_URL}/api/pos/por-recoger/N-1025/verificar`, {
      method: "POST",
      headers,
      body: JSON.stringify({ codigo: "7410" }),
    });
    const dataCode1025 = await resCode1025.json();
    if (!dataCode1025.exito) throw new Error("Fallo al validar código 7410 para N-1025");

    // Cobrar en efectivo $600 (cambio $32) y entregar
    const resPay1025 = await fetch(`${BASE_URL}/api/pos/por-recoger/N-1025/entregar`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        metodoPago: "efectivo",
        efectivoRecibido: 600.0,
        cambio: 32.0,
      }),
    });
    const dataPay1025 = await resPay1025.json();
    console.log("   Cobro y entrega N-1025:", dataPay1025.mensaje);
    if (!dataPay1025.exito) throw new Error("Fallo al cobrar y entregar pedido N-1025");

    // Verificar movimiento_caja
    const [movs] = await conn.execute(
      `SELECT tipo, monto, pedido_id FROM movimientos_caja WHERE pedido_id = (SELECT id FROM pedidos WHERE folio = 'N-1025')`
    );
    console.log("   Movimiento de caja generado:", movs[0]);
    if (movs[0]?.tipo !== "venta_efectivo" || Number(movs[0]?.monto) !== 568.0) {
      throw new Error("Movimiento de caja no concuerda para cobro de N-1025");
    }

    // 8. Inventario en vivo post-entregas
    console.log("\n-> 9. Probando inventario en vivo tras entregas (GET /api/pos/inventario/alertas)...");
    const resAlertas = await fetch(`${BASE_URL}/api/pos/inventario/alertas`, { headers });
    const dataAlertas = await resAlertas.json();
    console.log("   Alertas post-entrega:", dataAlertas.alertas?.map(a => `${a.nombre}: ${a.etiquetaAlerta}`));
    if (!dataAlertas.exito || !Array.isArray(dataAlertas.alertas)) {
      throw new Error("Consulta de alertas post-entrega falló");
    }

    console.log("\n=======================================================");
    console.log("¡TODAS LAS PRUEBAS DE INTEGRACIÓN PASARON EXITOSAMENTE!");
    console.log("=======================================================");
  } catch (error) {
    console.error("\n❌ ERROR EN PRUEBAS:", error);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

runTests();

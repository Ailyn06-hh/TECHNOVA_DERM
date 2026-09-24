import crypto from "crypto";
import mysql from "mysql2/promise";

const BASE_URL = "http://localhost:3000";
const POS_SESSION_SECRET = process.env.SESSION_SECRET || "technova_derm_secure_pos_session_2026";
const POS_DEVICE_TOKEN = "pos_device_test_token_2026_central";

function buildSessionCookie(sessionData) {
  const dataStr = Buffer.from(JSON.stringify(sessionData)).toString("base64url");
  const signature = crypto.createHmac("sha256", POS_SESSION_SECRET).update(dataStr).digest("base64url");
  return `${dataStr}.${signature}`;
}

async function runTests() {
  console.log("===============================================================");
  console.log("SUITE DE PRUEBAS: CORTE DE CAJA POS (TECHNOVA-DERM)");
  console.log("===============================================================\n");

  const conn = await mysql.createConnection({
    host: "127.0.0.1",
    user: "root",
    password: "",
    database: "technova_derm",
    multipleStatements: true,
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
    // 0. Preparar ambiente con migración y semillas del mockup
    console.log("[Setup] Asegurando turno activo fiel al Mockup...");
    const { execSync } = await import("child_process");
    execSync("node scripts/migrate-pos-corte.mjs", { stdio: "pipe" });

    // Obtener el turno activo para Laura Méndez
    const [turnoRows] = await conn.query(
      "SELECT id, caja_id, sucursal_id, empleado_id, inicio, fondo_inicial FROM turnos WHERE empleado_id = 1 AND caja_id = 1 AND estado = 'abierto' ORDER BY id DESC LIMIT 1"
    );
    assert(turnoRows.length > 0, "Turno abierto encontrado para Laura Méndez");
    const activeTurno = turnoRows[0];
    const turnoId = activeTurno.id;

    const sessionData = {
      turnoId,
      empleadoId: 1,
      cajaId: 1,
      sucursalId: 1,
      nombre: "Laura",
      apellido: "Méndez",
      rol: "cajera",
      cajaNombre: "Caja 1",
      sucursalNombre: "Centro",
      sucursalNombreCompleto: "Technova-Derm Centro",
      inicioTurno: activeTurno.inicio,
      horaEntrada: "10:00",
      horaSalida: "18:00",
    };

    const cookieHeader = `pos_dispositivo=${POS_DEVICE_TOKEN}; pos_sesion=${buildSessionCookie(sessionData)}`;

    // PRUEBA 1: Seguridad y Autenticación
    console.log("\n[Prueba 1] Seguridad y validación de sesión");
    const unauthRes = await fetch(`${BASE_URL}/api/pos/corte`);
    assert(unauthRes.status === 401, "Rechaza petición sin cookies de sesión (401)");

    // PRUEBA 2: Consulta de Corte fiel al Mockup
    console.log("\n[Prueba 2] GET /api/pos/corte - Validación fiel al Mockup");
    const corteRes = await fetch(`${BASE_URL}/api/pos/corte`, {
      headers: { Cookie: cookieHeader },
    });
    assert(corteRes.status === 200, "GET /api/pos/corte responde 200");
    const corteData = await corteRes.json();

    assert(corteData.exito === true, "Respuesta exitosa");
    assert(corteData.marca === "Technova-Derm", "Marca oficial es 'Technova-Derm'");
    assert(corteData.sucursal.nombre === "Technova-Derm Centro", "Sucursal con formato oficial Technova-Derm Centro");
    assert(corteData.caja.nombre === "Caja 1", "Caja 1 correcta");
    assert(corteData.cajera.nombre.includes("Laura"), "Cajera Laura Méndez");

    // Indicadores Mockup
    assert(corteData.indicadores.ventasCount === 23, "Ventas de mostrador: 23");
    assert(corteData.indicadores.ventasTotal === 6020, "Total ventas: $6,020.00");
    assert(corteData.indicadores.ticketPromedio === 261.74, "Ticket promedio: $261.74");
    assert(corteData.indicadores.pedidosEntregados === 5, "Pedidos entregados en tienda: 5");
    assert(corteData.indicadores.devolucionesCount === 0, "Devoluciones count: 0");
    assert(corteData.indicadores.devolucionesTotal === 0, "Devoluciones total: $0.00");

    // Montos Esperados según movimientos_caja
    assert(corteData.esperados.fondoInicial === 1000, "Fondo inicial: $1,000.00");
    assert(corteData.esperados.efectivoVentas === 2140, "Ventas efectivo: $2,140.00");
    assert(corteData.esperados.efectivoEsperado === 3140, "Efectivo esperado total: $3,140.00");
    assert(corteData.esperados.tarjetaEsperado === 3380, "Tarjeta esperada: $3,380.00");
    assert(corteData.esperados.transferenciaEsperado === 500, "Transferencia esperada: $500.00");
    assert(corteData.esperados.totalEsperado === 7020, "Total esperado general: $7,020.00");
    assert(corteData.configuracion.tolerancia === 10, "Tolerancia de arqueo: ±$10.00");
    assert(corteData.advertencias.tieneBorradorPendiente === false, "Sin ventas pendientes en borrador");

    // PRUEBA 3: Restricción de Venta en Borrador Pendiente
    console.log("\n[Prueba 3] Restricción de venta pendiente en borrador");
    // Crear venta borrador con 1 producto en este turno
    const [draftPed] = await conn.query(
      `INSERT INTO pedidos (folio, turno_id, usuario_id, sucursal_id, canal, tipo_entrega, estado, total, creado_en)
       VALUES ('V-TMP-DRAFT', ?, NULL, 1, 'tienda', 'mostrador', 'borrador', 249.00, NOW())`,
      [turnoId]
    );
    const draftPedId = draftPed.insertId;
    await conn.query(
      "INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, 1, 1, 249.00)",
      [draftPedId]
    );

    // Verificar que GET /api/pos/corte detecta el borrador
    const corteConDraftRes = await fetch(`${BASE_URL}/api/pos/corte`, {
      headers: { Cookie: cookieHeader },
    });
    const corteConDraftData = await corteConDraftRes.json();
    assert(corteConDraftData.advertencias.tieneBorradorPendiente === true, "Detecta venta activa en borrador");
    assert(corteConDraftData.advertencias.itemsEnBorrador === 1, "Indica 1 producto en borrador");

    // Intentar cerrar turno con borrador pendiente -> debe rechazar
    const cerrarConDraftRes = await fetch(`${BASE_URL}/api/pos/turnos/cerrar`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
      body: JSON.stringify({
        efectivo_contado: 3140,
        tarjeta_contado: 3380,
        transferencia_contado: 500,
      }),
    });
    assert(cerrarConDraftRes.status === 400, "Rechaza cierre con venta en borrador (400)");
    const cerrarConDraftJson = await cerrarConDraftRes.json();
    assert(cerrarConDraftJson.tieneBorradorPendiente === true, "Indica tieneBorradorPendiente: true");

    // Descartar/cancelar el borrador para continuar
    await conn.query("DELETE FROM pedido_items WHERE pedido_id = ?", [draftPedId]);
    await conn.query("DELETE FROM pedidos WHERE id = ?", [draftPedId]);

    // PRUEBA 4: Control de Tolerancia y Descuadre
    console.log("\n[Prueba 4] Validación de diferencia de arqueo y PIN de supervisora");
    // Intentar cerrar con faltante de $140 sin justificación (notas)
    const cerrarFaltanteSinNotas = await fetch(`${BASE_URL}/api/pos/turnos/cerrar`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
      body: JSON.stringify({
        efectivo_contado: 3000, // Falta $140
        tarjeta_contado: 3380,
        transferencia_contado: 500,
      }),
    });
    assert(cerrarFaltanteSinNotas.status === 400, "Rechaza descuadre sin notas (400)");
    const faltanteSinNotasJson = await cerrarFaltanteSinNotas.json();
    assert(faltanteSinNotasJson.requiereNotas === true, "Indica requiereNotas: true");

    // Intentar con notas pero sin PIN de supervisora
    const cerrarFaltanteSinPin = await fetch(`${BASE_URL}/api/pos/turnos/cerrar`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
      body: JSON.stringify({
        efectivo_contado: 3000,
        tarjeta_contado: 3380,
        transferencia_contado: 500,
        notas: "Error en conteo preliminar de cambio en monedas",
      }),
    });
    assert(cerrarFaltanteSinPin.status === 403, "Rechaza descuadre sin PIN de supervisora (403)");
    const faltanteSinPinJson = await cerrarFaltanteSinPin.json();
    assert(faltanteSinPinJson.requiereSupervisor === true, "Indica requiereSupervisor: true");

    // Intentar con PIN de supervisora incorrecto
    const cerrarPinInvalido = await fetch(`${BASE_URL}/api/pos/turnos/cerrar`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
      body: JSON.stringify({
        efectivo_contado: 3000,
        tarjeta_contado: 3380,
        transferencia_contado: 500,
        notas: "Error en conteo preliminar",
        pin_supervisor: "9999",
      }),
    });
    assert(cerrarPinInvalido.status === 401, "Rechaza PIN de supervisora incorrecto (401)");
    const pinInvalidoJson = await cerrarPinInvalido.json();
    assert(pinInvalidoJson.pinInvalido === true, "Indica pinInvalido: true");

    // PRUEBA 5: Cierre de Turno de Prueba con Supervisora Sofía Castro (PIN 1397)
    console.log("\n[Prueba 5] Autorización de descuadre con PIN de supervisora (Sofía Castro: 1397)");
    // Crear un turno rápido para probar descuadre autorizado
    const [tTest] = await conn.query(
      "INSERT INTO turnos (empleado_id, caja_id, sucursal_id, fondo_inicial, inicio, estado) VALUES (1, 2, 1, 1000.00, NOW(), 'abierto')"
    );
    const testTurnoId = tTest.insertId;
    await conn.query(
      "INSERT INTO movimientos_caja (turno_id, tipo, monto, empleado_id, creado_en) VALUES (?, 'fondo_inicial', 1000.00, 1, NOW())",
      [testTurnoId]
    );

    const testSessionData = { ...sessionData, turnoId: testTurnoId, cajaId: 2, cajaNombre: "Caja 2" };
    const testCookieHeader = `pos_dispositivo=${POS_DEVICE_TOKEN}; pos_sesion=${buildSessionCookie(testSessionData)}`;

    const cierreAutorizadoRes = await fetch(`${BASE_URL}/api/pos/turnos/cerrar`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: testCookieHeader },
      body: JSON.stringify({
        efectivo_contado: 950.00, // Falta $50
        tarjeta_contado: 0,
        transferencia_contado: 0,
        notas: "Faltante en caja verificado y autorizado por supervisora",
        pin_supervisor: "1397", // Sofía Castro
      }),
    });
    assert(cierreAutorizadoRes.status === 200, "Cierre con descuadre autorizado responde 200");
    const cierreAutorizadoJson = await cierreAutorizadoRes.json();
    assert(cierreAutorizadoJson.exito === true, "Cierre exitoso");
    assert(cierreAutorizadoJson.corte.diferenciaTotal === -50, "Diferencia de -$50 registrada");
    assert(Boolean(cierreAutorizadoJson.corte.autorizadoPor && (cierreAutorizadoJson.corte.autorizadoPor.includes("Castro") || cierreAutorizadoJson.corte.autorizadoPor.includes("Sof"))), "Supervisora Sofía Castro registrada en corte");

    // Verificar en BD
    const [corteTestRows] = await conn.query("SELECT * FROM cortes_caja WHERE turno_id = ?", [testTurnoId]);
    assert(corteTestRows.length === 1, "Registro en cortes_caja guardado");
    assert(corteTestRows[0].autorizado_por === 2, "autorizado_por apunta a Sofía Castro (ID: 2)");

    // PRUEBA 6: Cierre Oficial Cuadrado ($0.00) del Turno Principal
    console.log("\n[Prueba 6] Cierre Cuadrado Oficial del Mockup");
    const cierreOficialRes = await fetch(`${BASE_URL}/api/pos/turnos/cerrar`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
      body: JSON.stringify({
        efectivo_contado: 3140.00,
        tarjeta_contado: 3380.00,
        transferencia_contado: 500.00,
        desglose_efectivo: {
          b1000: 1,
          b500: 2,
          b200: 3,
          b100: 4,
          b50: 2,
          b20: 2,
        },
        notas: "Turno concluido exitosamente sin incidencias.",
      }),
    });

    assert(cierreOficialRes.status === 200, "POST /api/pos/turnos/cerrar responde 200");
    const cierreOficialJson = await cierreOficialRes.json();
    assert(cierreOficialJson.exito === true, "Corte oficial registrado con éxito");
    assert(cierreOficialJson.corte.diferenciaTotal === 0, "Diferencia total exacta: $0.00 (Cuadrada)");
    assert(cierreOficialJson.corte.totalEsperado === 7020, "Total esperado: $7,020.00");
    assert(cierreOficialJson.corte.totalContado === 7020, "Total contado: $7,020.00");
    assert(cierreOficialJson.corte.enviadoA === "gerencia.centro@technovaderm.mx", "Notificación enviada a gerencia.centro@technovaderm.mx");

    // Verificar en BD que el turno quedó cerrado
    const [turnoFinalRows] = await conn.query("SELECT estado, fin FROM turnos WHERE id = ?", [turnoId]);
    assert(turnoFinalRows[0].estado === "cerrado", "Turno actualizado a estado 'cerrado' en BD");
    assert(turnoFinalRows[0].fin !== null, "Turno tiene timestamp 'fin' asignado");

    // Verificar registro en cortes_caja
    const [corteFinalRows] = await conn.query("SELECT * FROM cortes_caja WHERE turno_id = ?", [turnoId]);
    assert(corteFinalRows.length === 1, "Registro único creado en cortes_caja");
    assert(Number(corteFinalRows[0].efectivo_contado) === 3140, "Efectivo contado: $3,140.00 en BD");
    assert(Number(corteFinalRows[0].tarjeta_contado) === 3380, "Tarjeta contada: $3,380.00 en BD");
    assert(Number(corteFinalRows[0].transferencia_contado) === 500, "Transferencia contada: $500.00 en BD");
    assert(Number(corteFinalRows[0].diferencia_total) === 0, "Diferencia total $0.00 en BD");

    // PRUEBA 7: Idempotencia de Cierre
    console.log("\n[Prueba 7] Control de Idempotencia de Cierre");
    const cierreRepetidoRes = await fetch(`${BASE_URL}/api/pos/turnos/cerrar`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeader },
      body: JSON.stringify({
        efectivo_contado: 3140,
        tarjeta_contado: 3380,
        transferencia_contado: 500,
      }),
    });
    assert(cierreRepetidoRes.status === 200, "Cierre repetido responde 200");
    const cierreRepetidoJson = await cierreRepetidoRes.json();
    assert(cierreRepetidoJson.yaCerrado === true, "Indica que el turno ya estaba cerrado");

    // PRUEBA 8: Caja Liberada para el Siguiente Turno
    console.log("\n[Prueba 8] Liberación de Caja para Siguiente Turno");
    // Intentar abrir nuevo turno en Caja 1 para Laura Méndez
    const nuevoTurnoRes = await fetch(`${BASE_URL}/api/pos/turnos/iniciar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: `pos_dispositivo=${POS_DEVICE_TOKEN}`,
      },
      body: JSON.stringify({
        caja_id: 1,
        empleado_id: 1,
        pin: "2580", // Laura Méndez
      }),
    });

    assert(nuevoTurnoRes.status === 200, "Caja 1 disponible para iniciar nuevo turno exitosamente");
    const nuevoTurnoJson = await nuevoTurnoRes.json();
    assert(nuevoTurnoJson.exito === true, "Nuevo turno iniciado tras cierre previo");

    // 9. Dejar el turno de demo activo y cuadrado para la demostración del usuario
    console.log("\n[Restauración] Restableciendo turno activo y cuadrado del Mockup...");
    execSync("node scripts/migrate-pos-corte.mjs", { stdio: "pipe" });
    console.log("  ✅ Turno de demostración restaurado y listo para interacción en el navegador.");

    console.log("\n===============================================================");
    console.log(`RESULTADOS: ${passed} pruebas superadas, ${failed} fallidas.`);
    console.log("===============================================================\n");
  } catch (err) {
    console.error("Error en suite de pruebas:", err);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

runTests();

import crypto from "crypto";
import mysql from "mysql2/promise";

const BASE_URL = "http://localhost:3000";
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || process.env.SESSION_SECRET || "technova_derm_admin_secret_key_2026";

function buildAdminSessionCookie(adminData) {
  const dataStr = Buffer.from(JSON.stringify(adminData)).toString("base64url");
  const signature = crypto.createHmac("sha256", ADMIN_SESSION_SECRET).update(dataStr).digest("base64url");
  return `${dataStr}.${signature}`;
}

async function runTests() {
  console.log("=======================================================================");
  console.log("SUITE DE PRUEBAS: FASE 2 INTELIGENCIA OPERATIVA DASHBOARD (TECHNOVA-DERM)");
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
    // 1. Obtener ID del admin desde la BD
    const [adminRows] = await conn.query("SELECT id, correo FROM administradores WHERE rol = 'admin' LIMIT 1");
    const adminUser = adminRows[0];

    const cookieValue = buildAdminSessionCookie({
      id: adminUser.id,
      nombre: "Sofía",
      apellido: "Castro",
      correo: adminUser.correo,
      rol: "admin",
      sucursales: [],
      loginEn: new Date().toISOString(),
    });
    const cookieHeader = `admin_sesion=${cookieValue}`;

    // 2. Consulta sin cookie -> Rechazo 401
    const resSinAuth = await fetch(`${BASE_URL}/api/admin/dashboard`);
    assert(resSinAuth.status === 401, "Acceso a dashboard sin sesión responde 401");

    // 3. Consulta con cookie admin validada -> Status 200 OK
    const resAuth = await fetch(`${BASE_URL}/api/admin/dashboard`, {
      headers: { Cookie: cookieHeader },
    });
    const jsonAuth = await resAuth.json();
    assert(resAuth.status === 200, "Dashboard responde 200 OK con sesión activa");
    assert(jsonAuth.ok === true, "Estructura ok: true");
    assert(Boolean(jsonAuth.kpis), "Contiene objeto KPIs del día");
    assert(typeof jsonAuth.kpis.ventasHoy === "number", "KPI ventasHoy presente");
    assert(typeof jsonAuth.kpis.pedidosHoy === "number", "KPI pedidosHoy presente");
    assert(typeof jsonAuth.kpis.pctCombos === "number", "KPI pctCombos presente");
    assert(Array.isArray(jsonAuth.canales) && jsonAuth.canales.length >= 5, "Ventas por canal incluye los 5 canales omnicanal");
    assert(Array.isArray(jsonAuth.reabastecimiento), "Contiene alertas de reabastecimiento con pronóstico");
    assert(Array.isArray(jsonAuth.lotesCaducar), "Contiene lotes por caducar FEFO");
    assert(Array.isArray(jsonAuth.sobrestock), "Contiene alertas de sobrestock y combos sugeridos");

    // 4. Probar aprobación instantánea de descuento por caducidad
    if (jsonAuth.lotesCaducar.length > 0) {
      const lotePrueba = jsonAuth.lotesCaducar[0];
      const resAprobar = await fetch(`${BASE_URL}/api/admin/dashboard/aprobar-descuento`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookieHeader,
        },
        body: JSON.stringify({
          productoId: lotePrueba.productoId,
          loteId: lotePrueba.loteId,
          precioOferta: lotePrueba.precioOfertaSugerido,
          descuentoPct: lotePrueba.descuentoSugeridoPct,
        }),
      });

      const jsonAprobar = await resAprobar.json();
      assert(resAprobar.status === 200, "Aprobar descuento por caducidad responde 200 OK");
      assert(jsonAprobar.ok === true, "Descuento aplicado correctamente");

      // Verificar actualización directa en BD
      const [prodRows] = await conn.query(
        "SELECT precio_especial FROM productos WHERE id = ?",
        [lotePrueba.productoId]
      );
      assert(
        Number(prodRows[0].precio_especial) === Number(lotePrueba.precioOfertaSugerido),
        "El descuento se aplicó instantáneamente en la tabla productos (Web, App y POS)"
      );

      // Verificar auditoría
      const [auditRows] = await conn.query(
        "SELECT accion FROM auditoria_admin WHERE accion = 'aprobar_descuento_caducidad' ORDER BY id DESC LIMIT 1"
      );
      assert(auditRows.length > 0, "Se registró la aprobación en auditoria_admin");
    }

    console.log(`\n=======================================================================`);
    console.log(`RESUMEN DE PRUEBAS FASE 2: ${passed} PASARON, ${failed} FALLARON`);
    console.log(`=======================================================================\n`);

    await conn.end();
    if (failed > 0) process.exit(1);
    else process.exit(0);
  } catch (err) {
    console.error("Error en suite Fase 2:", err);
    await conn.end();
    process.exit(1);
  }
}

runTests();

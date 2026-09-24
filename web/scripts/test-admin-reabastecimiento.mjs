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
  console.log("SUITE DE PRUEBAS: REABASTECIMIENTO Y PROVEEDORES (TECHNOVA-DERM)");
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

    // 1. Petición sin auth -> 401
    const resNoAuth = await fetch(`${BASE_URL}/api/admin/reabastecimiento`);
    assert(resNoAuth.status === 401, "Consulta sin autenticar devuelve status 401");

    // 2. Petición autenticada -> 200 OK
    const resAuth = await fetch(`${BASE_URL}/api/admin/reabastecimiento`, {
      headers: { Cookie: cookieHeader },
    });
    const jsonAuth = await resAuth.json();
    assert(resAuth.status === 200, "Consulta autenticada devuelve status 200 OK");
    assert(jsonAuth.ok === true, "Estructura ok: true");
    assert(Array.isArray(jsonAuth.sugerencias), "Lista de sugerencias del pronóstico presente");
    assert(Array.isArray(jsonAuth.ordenes), "Lista de órdenes en curso presente");
    assert(Array.isArray(jsonAuth.proveedores) && jsonAuth.proveedores.length >= 3, "Catálogo de proveedores presente");
    assert(Boolean(jsonAuth.siguienteFolio), "Generación de siguiente folio activa");

    // 3. Probar Creación de nueva Orden de Compra
    const [prods] = await conn.query("SELECT id FROM productos LIMIT 1");
    const resCrear = await fetch(`${BASE_URL}/api/admin/reabastecimiento`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        accion: "crear_orden",
        folio: jsonAuth.siguienteFolio,
        proveedor: "Laboratorio Botánico MX",
        sucursalDestinoId: 3,
        costoTotal: 7350.00,
        estado: "En camino",
        fechaDeseada: "2026-09-30",
        items: [{ productoId: prods[0].id, cantidad: 24 }],
      }),
    });
    const jsonCrear = await resCrear.json();
    assert(resCrear.status === 200 && jsonCrear.ok === true, "Crear Orden de Compra responde 200 OK");
    assert(Boolean(jsonCrear.ordenId), "Retorna el ID de la nueva orden");

    // 4. Probar Recepción de la Orden creada
    const resRecibir = await fetch(`${BASE_URL}/api/admin/reabastecimiento`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        accion: "recibir_orden",
        ordenId: jsonCrear.ordenId,
      }),
    });
    const jsonRecibir = await resRecibir.json();
    assert(resRecibir.status === 200 && jsonRecibir.ok === true, "Registrar recepción de orden responde 200 OK");

    // Verificar en BD que el estado cambió a 'recibida'
    const [ocDb] = await conn.query("SELECT estado FROM ordenes_compra WHERE id = ?", [jsonCrear.ordenId]);
    assert(ocDb[0].estado === "recibida", "Estado de la orden de compra actualizado a 'recibida' en BD");

    console.log(`\n=======================================================================`);
    console.log(`RESUMEN DE PRUEBAS REABASTECIMIENTO: ${passed} PASARON, ${failed} FALLARON`);
    console.log(`=======================================================================\n`);

    await conn.end();
    if (failed > 0) process.exit(1);
    else process.exit(0);
  } catch (err) {
    console.error("Error en suite Reabastecimiento:", err);
    await conn.end();
    process.exit(1);
  }
}

runTests();

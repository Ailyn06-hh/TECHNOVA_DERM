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
  console.log("SUITE DE PRUEBAS: PROMOCIONES Y COMBOS (TECHNOVA-DERM)");
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
    const resNoAuth = await fetch(`${BASE_URL}/api/admin/promociones`);
    assert(resNoAuth.status === 401, "Consulta sin autenticar devuelve status 401");

    // 2. Petición autenticada -> 200 OK
    const resAuth = await fetch(`${BASE_URL}/api/admin/promociones`, {
      headers: { Cookie: cookieHeader },
    });
    const jsonAuth = await resAuth.json();
    assert(resAuth.status === 200, "Consulta autenticada devuelve status 200 OK");
    assert(jsonAuth.ok === true, "Estructura ok: true");
    assert(Array.isArray(jsonAuth.reglas) && jsonAuth.reglas.length >= 4, "Reglas automáticas presentes (mínimo 4)");
    assert(Array.isArray(jsonAuth.descuentosPendientes), "Lista de descuentos por aprobar presente");
    assert(Array.isArray(jsonAuth.combos), "Lista de combos activos presente");
    assert(Array.isArray(jsonAuth.productosCatalog) && jsonAuth.productosCatalog.length > 0, "Catálogo de productos disponible");

    // 3. Probar Toggle de Regla Automática
    const reglaTest = jsonAuth.reglas[0];
    const resToggle = await fetch(`${BASE_URL}/api/admin/promociones`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        accion: "toggle_regla",
        clave: reglaTest.clave,
        activa: false,
      }),
    });
    const jsonToggle = await resToggle.json();
    assert(resToggle.status === 200 && jsonToggle.ok === true, "Toggle de regla responde 200 OK");

    // Verificar en BD
    const [reglaDb] = await conn.query("SELECT activa FROM reglas_promocion WHERE clave = ?", [reglaTest.clave]);
    assert(reglaDb[0].activa === 0, "El estado de la regla se actualizó correctamente en la BD");

    // Restaurar regla
    await conn.query("UPDATE reglas_promocion SET activa = 1 WHERE clave = ?", [reglaTest.clave]);

    // 4. Probar Aprobar Descuento Pendiente
    if (jsonAuth.descuentosPendientes.length > 0) {
      const descTest = jsonAuth.descuentosPendientes[0];
      const resAprobar = await fetch(`${BASE_URL}/api/admin/promociones`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookieHeader,
        },
        body: JSON.stringify({
          accion: "aprobar_descuento",
          descuentoId: descTest.id,
        }),
      });
      const jsonAprobar = await resAprobar.json();
      assert(resAprobar.status === 200 && jsonAprobar.ok === true, "Aprobar descuento por lote responde 200 OK");

      // Verificar actualización de estado a 'aprobado'
      const [descDb] = await conn.query("SELECT estado FROM descuentos_pendientes WHERE id = ?", [descTest.id]);
      assert(descDb[0].estado === "aprobado", "Descuento en cola marcado como 'aprobado' en BD");
    }

    // 5. Probar Creación de Nuevo Combo
    const [prods] = await conn.query("SELECT id FROM productos LIMIT 2");
    if (prods.length >= 2) {
      const resCombo = await fetch(`${BASE_URL}/api/admin/promociones`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookieHeader,
        },
        body: JSON.stringify({
          accion: "crear_combo",
          nombre: "Dúo Hidratante Test",
          productos: [prods[0].id, prods[1].id],
          descuentoPorcentaje: 15,
          fechaInicio: "2026-09-24",
          fechaFin: "2026-10-30",
          canales: ["tienda_web", "app", "pos_tienda", "whatsapp"],
        }),
      });

      const jsonCombo = await resCombo.json();
      assert(resCombo.status === 200 && jsonCombo.ok === true, "Crear nuevo combo responde 200 OK");
      assert(Boolean(jsonCombo.comboId), "Retorna el ID del combo creado");

      // Verificar inserción en combos y combo_productos
      const [comboDb] = await conn.query("SELECT * FROM combos WHERE id = ?", [jsonCombo.comboId]);
      assert(comboDb.length > 0, "Combo guardado correctamente en la tabla combos");
    }

    console.log(`\n=======================================================================`);
    console.log(`RESUMEN DE PRUEBAS PROMOCIONES Y COMBOS: ${passed} PASARON, ${failed} FALLARON`);
    console.log(`=======================================================================\n`);

    await conn.end();
    if (failed > 0) process.exit(1);
    else process.exit(0);
  } catch (err) {
    console.error("Error en suite Promociones:", err);
    await conn.end();
    process.exit(1);
  }
}

runTests();

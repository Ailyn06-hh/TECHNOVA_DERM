import crypto from "crypto";

const BASE_URL = "http://localhost:3000";
const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || process.env.SESSION_SECRET || "technova_derm_admin_secret_key_2026";

function buildAdminSessionCookie(adminData) {
  const dataStr = Buffer.from(JSON.stringify(adminData)).toString("base64url");
  const signature = crypto.createHmac("sha256", ADMIN_SESSION_SECRET).update(dataStr).digest("base64url");
  return `${dataStr}.${signature}`;
}

async function runTests() {
  console.log("=======================================================================");
  console.log("SUITE DE PRUEBAS: REPORTES Y ANALÍTICA (TECHNOVA-DERM)");
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

  try {
    const cookieValue = buildAdminSessionCookie({
      id: 1,
      nombre: "Sofía",
      apellido: "Castro",
      correo: "admin@technovaderm.mx",
      rol: "admin",
      sucursales: [],
      loginEn: new Date().toISOString(),
    });
    const cookieHeader = `admin_sesion=${cookieValue}`;

    // 1. Consulta sin auth -> 401
    const resNoAuth = await fetch(`${BASE_URL}/api/admin/reportes`);
    assert(resNoAuth.status === 401, "Consulta sin autenticar responde status 401");

    // 2. Consulta autenticada -> 200 OK
    const resAuth = await fetch(`${BASE_URL}/api/admin/reportes`, {
      headers: { Cookie: cookieHeader },
    });
    const jsonAuth = await resAuth.json();
    assert(resAuth.status === 200, "Consulta autenticada responde status 200 OK");
    assert(jsonAuth.ok === true, "Estructura ok: true");
    assert(Boolean(jsonAuth.kpis && typeof jsonAuth.kpis.ventas === "number"), "KPIs de ventas y pedidos presentes");
    assert(Array.isArray(jsonAuth.graficaSemanas) && jsonAuth.graficaSemanas.length === 4, "Datos de gráfica por semanas presentes (4 semanas)");
    assert(Array.isArray(jsonAuth.masVendidos) && jsonAuth.masVendidos.length >= 3, "Top de productos más vendidos presente");
    assert(Boolean(jsonAuth.efectividadCombos), "Métricas de efectividad de combos presentes");
    assert(Boolean(jsonAuth.recordatoriosRecompra), "Métricas de recordatorios de recompra presentes");

    // 3. Probar Exportar a Excel (CSV)
    const resExport = await fetch(`${BASE_URL}/api/admin/reportes?exportar=true`, {
      headers: { Cookie: cookieHeader },
    });
    const contentType = resExport.headers.get("content-type") || "";
    const csvText = await resExport.text();

    assert(resExport.status === 200, "Exportar a Excel responde status 200 OK");
    assert(contentType.includes("text/csv"), "Cabecera Content-Type es text/csv");
    assert(csvText.includes("REPORTE DE VENTAS Y OPERACIÓN"), "Contiene encabezado del reporte en CSV");
    assert(csvText.includes("INDICADORES CLAVE"), "Contiene sección de KPIs en el CSV");

    console.log(`\n=======================================================================`);
    console.log(`RESUMEN DE PRUEBAS REPORTES: ${passed} PASARON, ${failed} FALLARON`);
    console.log(`=======================================================================\n`);

    if (failed > 0) process.exit(1);
    else process.exit(0);
  } catch (err) {
    console.error("Error en suite Reportes:", err);
    process.exit(1);
  }
}

runTests();

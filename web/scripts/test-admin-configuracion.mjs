import crypto from "crypto";
import mysql from "mysql2/promise";

const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "technova_derm_admin_secret_key_2026";
const ADMIN_SESSION_COOKIE = "admin_sesion";

function signAdminSession(data) {
  const dataStr = Buffer.from(JSON.stringify(data)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", ADMIN_SESSION_SECRET)
    .update(dataStr)
    .digest("base64url");
  return `${dataStr}.${signature}`;
}

async function runTests() {
  console.log("=== INICIANDO PRUEBAS AUTOMATIZADAS: MÓDULO CONFIGURACIÓN (/admin/configuracion) ===");

  const pool = mysql.createPool({
    host: "127.0.0.1",
    user: "root",
    database: "technova_derm",
  });

  try {
    // 1. Obtener admin Dueña
    const [rows] = await pool.query("SELECT * FROM administradores WHERE correo = 'admin@technovaderm.mx' LIMIT 1");
    if (rows.length === 0) {
      throw new Error("No se encontró el administrador admin@technovaderm.mx");
    }
    const admin = rows[0];

    const token = signAdminSession({
      id: admin.id,
      nombre: admin.nombre,
      apellido: admin.apellido,
      correo: admin.correo,
      rol: admin.rol,
      sucursales: [],
      loginEn: new Date().toISOString(),
    });

    const headers = {
      Cookie: `${ADMIN_SESSION_COOKIE}=${token}`,
      "Content-Type": "application/json",
    };

    const baseUrl = "http://localhost:3000";

    // Test 1: GET /api/admin/configuracion
    console.log("\n[Test 1] GET /api/admin/configuracion");
    const res1 = await fetch(`${baseUrl}/api/admin/configuracion`, { headers });
    const data1 = await res1.json();
    console.assert(res1.status === 200, "Respuesta status 200");
    console.assert(data1.ok === true, "data1.ok debe ser true");
    console.assert(typeof data1.configuracion === "object", "configuracion debe ser un objeto");
    console.assert(Array.isArray(data1.sucursales), "sucursales debe ser un arreglo");
    console.log(`✓ Retornó ${Object.keys(data1.configuracion).length} parámetros y ${data1.sucursales.length} tiendas`);

    // Test 2: POST guardar_configuracion
    console.log("\n[Test 2] POST /api/admin/configuracion (guardar_configuracion)");
    const newRfc = `TDE${Date.now().toString().slice(-8)}`;
    const res2 = await fetch(`${baseUrl}/api/admin/configuracion`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        accion: "guardar_configuracion",
        valores: {
          rfc_negocio: newRfc,
          serie_facturas: "TD",
          permitir_descargar_facturas: "1",
        },
      }),
    });
    const data2 = await res2.json();
    console.assert(data2.ok === true, "data2.ok debe ser true");
    console.log(`✓ Configuración fiscal actualizada con RFC: ${newRfc}`);

    // Verificar en BD
    const [cfgDb] = await pool.query("SELECT valor FROM configuracion_general WHERE clave = 'rfc_negocio'");
    console.assert(cfgDb[0].valor === newRfc, "RFC en BD debe coincidir");
    console.log("✓ Verificación en BD de configuración correcta");

    // Test 3: POST toggle_canal
    console.log("\n[Test 3] POST /api/admin/configuracion (toggle_canal)");
    const res3 = await fetch(`${baseUrl}/api/admin/configuracion`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        accion: "toggle_canal",
        canalClave: "marketplace_conectado",
        canalEstado: true,
      }),
    });
    const data3 = await res3.json();
    console.assert(data3.ok === true, "data3.ok debe ser true");
    console.log("✓ Estado de Marketplace cambiado a conectado");

    // Test 4: POST agregar_tienda
    console.log("\n[Test 4] POST /api/admin/configuracion (agregar_tienda)");
    const nombreTienda = `Technova-Derm Sur ${Date.now().toString().slice(-4)}`;
    const res4 = await fetch(`${baseUrl}/api/admin/configuracion`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        accion: "agregar_tienda",
        sucursal: {
          nombre: nombreTienda,
          direccion: "Av. Insurgentes Sur 1500, CDMX",
          ciudad: "Ciudad de México",
          horario_texto: "Lun a dom 10:00 a 21:00",
        },
      }),
    });
    const data4 = await res4.json();
    console.assert(data4.ok === true, "data4.ok debe ser true");
    console.log(`✓ Nueva tienda agregada: ${nombreTienda}`);

    // Validar Auditoría
    const [auditRows] = await pool.query(
      "SELECT * FROM auditoria_admin WHERE accion IN ('actualizar_configuracion_operacion', 'toggle_canal_conectado', 'crear_sucursal_tienda') ORDER BY id DESC LIMIT 3"
    );
    console.assert(auditRows.length >= 3, "Deben registrarse eventos en auditoria_admin");
    console.log("✓ Auditoría de administración de configuración verificada correctamente");

    console.log("\n=================================================");
    console.log("¡PRUEBAS DE CONFIGURACIÓN PASARON CON ÉXITO!");
    console.log("=================================================\n");
  } catch (err) {
    console.error("❌ ERROR EN LAS PRUEBAS:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();

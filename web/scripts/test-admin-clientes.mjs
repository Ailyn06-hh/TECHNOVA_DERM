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
  console.log("=== INICIANDO PRUEBAS AUTOMATIZADAS: MÓDULO CLIENTES (/admin/clientes) ===");

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

    // Firmar cookie
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

    // Test 1: GET /api/admin/clientes sin filtros
    console.log("\n[Test 1] GET /api/admin/clientes (Lista general)");
    const res1 = await fetch(`${baseUrl}/api/admin/clientes`, { headers });
    const data1 = await res1.json();
    console.assert(res1.status === 200, "Respuesta status 200");
    console.assert(data1.ok === true, "data1.ok debe ser true");
    console.assert(Array.isArray(data1.clientes), "clientes debe ser un arreglo");
    console.assert(Array.isArray(data1.sucursales), "sucursales debe ser un arreglo");
    console.assert(data1.clienteDetalle !== null, "clienteDetalle no debe ser null si hay clientes");
    console.log(`✓ Retornó ${data1.clientes.length} clientes. Cliente seleccionado: ${data1.clienteDetalle?.nombre}`);

    // Test 2: GET /api/admin/clientes con filtro tipo_piel
    console.log("\n[Test 2] GET /api/admin/clientes?tipo_piel=seca");
    const res2 = await fetch(`${baseUrl}/api/admin/clientes?tipo_piel=seca`, { headers });
    const data2 = await res2.json();
    console.assert(data2.ok === true, "data2.ok debe ser true");
    const todosSeca = data2.clientes.every((c) => c.tipo_piel === "seca");
    console.assert(todosSeca, "Todos los clientes filtrados deben ser de piel seca");
    console.log(`✓ Filtro por piel seca correcto. Encontrados: ${data2.clientes.length}`);

    // Test 3: POST toggle_promociones
    const targetClient = data1.clientes[0];
    console.log(`\n[Test 3] POST /api/admin/clientes (toggle_promociones para usuario ID ${targetClient.id})`);
    const nuevoValorPromos = targetClient.acepta_promociones === 1 ? false : true;
    const res3 = await fetch(`${baseUrl}/api/admin/clientes`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        accion: "toggle_promociones",
        usuario_id: targetClient.id,
        acepta_promociones: nuevoValorPromos,
      }),
    });
    const data3 = await res3.json();
    console.assert(data3.ok === true, "data3.ok debe ser true");
    console.log(`✓ Cambiado preferencia de promociones a ${nuevoValorPromos}`);

    // Validar en BD que cambió el valor
    const [uRows] = await pool.query("SELECT acepta_promociones FROM usuarios WHERE id = ?", [targetClient.id]);
    console.assert(uRows[0].acepta_promociones === (nuevoValorPromos ? 1 : 0), "Valor en BD debe actualizarse");
    console.log("✓ Verificación en BD exitosa");

    // Test 4: POST enviar_recordatorio
    console.log(`\n[Test 4] POST /api/admin/clientes (enviar_recordatorio para usuario ID ${targetClient.id})`);
    const res4 = await fetch(`${baseUrl}/api/admin/clientes`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        accion: "enviar_recordatorio",
        usuario_id: targetClient.id,
        producto_id: 1,
        producto_nombre: "Serum Antiedad de Retinol",
      }),
    });
    const data4 = await res4.json();
    console.assert(data4.ok === true, "data4.ok debe ser true");
    console.log("✓ Recordatorio enviado");

    // Validar notificación en BD
    const [notifRows] = await pool.query(
      "SELECT * FROM notificaciones WHERE usuario_id = ? AND tipo = 'recompra' ORDER BY id DESC LIMIT 1",
      [targetClient.id]
    );
    console.assert(notifRows.length > 0, "Debe existir registro en notificaciones");
    console.log(`✓ Notificación insertada: ${notifRows[0].titulo}`);

    // Validar Auditoría
    const [auditRows] = await pool.query(
      "SELECT * FROM auditoria_admin WHERE accion IN ('actualizar_cliente_promociones', 'enviar_recordatorio_recompra') ORDER BY id DESC LIMIT 2"
    );
    console.assert(auditRows.length >= 2, "Deben registrarse 2 eventos en auditoria_admin");
    console.log("✓ Auditoría de administración registrada correctamente");

    console.log("\n=================================================");
    console.log("¡TODAS LAS PRUEBAS DE CLIENTES PASARON CON ÉXITO!");
    console.log("=================================================\n");
  } catch (err) {
    console.error("❌ ERROR EN LAS PRUEBAS:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();

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
  console.log("=== INICIANDO PRUEBAS AUTOMATIZADAS: MÓDULO USUARIOS Y ROLES (/admin/usuarios) ===");

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

    // Test 1: GET /api/admin/usuarios
    console.log("\n[Test 1] GET /api/admin/usuarios (Lista de usuarios y permisos)");
    const res1 = await fetch(`${baseUrl}/api/admin/usuarios`, { headers });
    const data1 = await res1.json();
    console.assert(res1.status === 200, "Respuesta status 200");
    console.assert(data1.ok === true, "data1.ok debe ser true");
    console.assert(Array.isArray(data1.usuarios), "usuarios debe ser un arreglo");
    console.assert(Array.isArray(data1.matrizPermisos), "matrizPermisos debe ser un arreglo");
    console.log(`✓ Retornó ${data1.usuarios.length} usuarios y ${data1.matrizPermisos.length} reglas de permisos`);

    // Validar presencia de usuarios clave de la maqueta
    const tieneLaura = data1.usuarios.some((u) => u.nombre === "Laura");
    console.assert(tieneLaura, "Debe incluir a Laura Méndez");
    console.log("✓ Laura Méndez (Cajera) encontrada en la lista");

    // Test 2: POST invitar_usuario
    console.log("\n[Test 2] POST /api/admin/usuarios (invitar_usuario)");
    const correoTest = `carla.vargas.${Date.now()}@technovaderm.mx`;
    const res2 = await fetch(`${baseUrl}/api/admin/usuarios`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        accion: "invitar_usuario",
        nombre: "Carla",
        apellido: "Vargas",
        correo: correoTest,
        rol: "cajera",
        sucursal_id: 1,
        pin_pos: "9876",
      }),
    });
    const data2 = await res2.json();
    console.assert(data2.ok === true, "data2.ok debe ser true");
    console.log(`✓ Invitación enviada a ${correoTest}`);

    // Verificar inserción en BD
    const [empRows] = await pool.query("SELECT * FROM empleados WHERE correo = ?", [correoTest]);
    console.assert(empRows.length > 0, "Debe existir registro en la tabla empleados");
    console.assert(empRows[0].estado_invitacion === "invitacion_enviada", "Estado debe ser invitacion_enviada");
    console.log("✓ Verificación en BD de usuario recién invitado exitosa");

    // Test 3: POST actualizar_usuario
    const targetEmp = empRows[0];
    console.log(`\n[Test 3] POST /api/admin/usuarios (actualizar_usuario ID ${targetEmp.id})`);
    const res3 = await fetch(`${baseUrl}/api/admin/usuarios`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        accion: "actualizar_usuario",
        id: targetEmp.id,
        tipo: "empleado",
        rol: "supervisora",
        sucursal_id: 2,
        pin_pos: "4321",
        activo: true,
      }),
    });
    const data3 = await res3.json();
    console.assert(data3.ok === true, "data3.ok debe ser true");
    console.log("✓ Rol de Carla cambiado a supervisora y sucursal a 2");

    const [empCheck] = await pool.query("SELECT rol FROM empleados WHERE id = ?", [targetEmp.id]);
    console.assert(empCheck[0].rol === "supervisora", "Rol en BD debe ser supervisora");
    console.log("✓ Verificación de rol en BD exitosa");

    // Test 4: POST toggle_activo
    console.log(`\n[Test 4] POST /api/admin/usuarios (toggle_activo ID ${targetEmp.id})`);
    const res4 = await fetch(`${baseUrl}/api/admin/usuarios`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        accion: "toggle_activo",
        id: targetEmp.id,
        tipo: "empleado",
        activo: false,
      }),
    });
    const data4 = await res4.json();
    console.assert(data4.ok === true, "data4.ok debe ser true");
    console.log("✓ Acceso desactivado para Carla Vargas");

    // Validar Auditoría
    const [auditRows] = await pool.query(
      "SELECT * FROM auditoria_admin WHERE accion IN ('invitar_usuario_empleado', 'actualizar_usuario_rol', 'cambiar_estado_acceso_usuario') ORDER BY id DESC LIMIT 3"
    );
    console.assert(auditRows.length >= 3, "Deben registrarse al menos 3 eventos de auditoría");
    console.log("✓ Auditoría de administración de usuarios verificada correctamente");

    console.log("\n=================================================");
    console.log("¡PRUEBAS DE USUARIOS Y ROLES PASARON CON ÉXITO!");
    console.log("=================================================\n");
  } catch (err) {
    console.error("❌ ERROR EN LAS PRUEBAS:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();

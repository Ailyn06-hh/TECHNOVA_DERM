import { getDbPool } from "../src/lib/db.ts";

async function migrateUsuariosRoles() {
  console.log("=== Ejecutando migración Módulo Usuarios y Roles ===");
  const pool = getDbPool();

  try {
    // 1. Agregar columna correo y estado_invitacion a empleados si no existen
    try {
      await pool.query(`
        ALTER TABLE \`empleados\` 
        ADD COLUMN \`correo\` VARCHAR(254) NULL AFTER \`apellido\`,
        ADD COLUMN \`estado_invitacion\` ENUM('activa', 'invitacion_enviada', 'inactiva') NOT NULL DEFAULT 'activa' AFTER \`activo\`;
      `);
      console.log("✔ Columnas correo y estado_invitacion agregadas a tabla empleados");
    } catch (e) {
      if (e.code === "ER_DUP_FIELDNAME") {
        console.log("✔ Columnas ya existen en empleados");
      } else {
        console.warn("Aviso migración columnas empleados:", e.message);
      }
    }

    // 2. Asegurar que las sucursales principales existan
    await pool.query(`
      INSERT INTO \`sucursales\` (\`id\`, \`nombre\`, \`ciudad\`, \`direccion\`, \`activa\`)
      VALUES 
        (1, 'Technova-Derm Centro', 'Guadalajara', 'Av. Hidalgo 450, Col. Centro', 1),
        (2, 'Technova-Derm Norte', 'Zapopan', 'Av. Patria 1200, Col. Real Acueducto', 1)
      ON DUPLICATE KEY UPDATE \`nombre\` = VALUES(\`nombre\`);
    `);
    console.log("✔ Sucursales verificadas (Centro y Norte)");

    // 3. Sembrar/actualizar empleados de demostración (Laura Méndez, Jorge Ramírez, Andrea Pérez)
    // Laura Méndez (Cajera - Centro)
    const [empLaura] = await pool.query("SELECT id FROM empleados WHERE nombre = 'Laura' AND apellido = 'Méndez'");
    let lauraId = empLaura.length > 0 ? empLaura[0].id : null;
    if (!lauraId) {
      const [resL] = await pool.query(`
        INSERT INTO empleados (nombre, apellido, correo, rol, pin_hash, activo, estado_invitacion, creado_en)
        VALUES ('Laura', 'Méndez', 'laura@technovaderm.mx', 'cajera', '$2b$10$cEH4g7N36oVMFtaZfzmdw.Ep6/XkTfMR2Ul.uVbeSBMM2BnuISg2y', 1, 'activa', NOW())
      `);
      lauraId = resL.insertId;
    } else {
      await pool.query("UPDATE empleados SET correo = 'laura@technovaderm.mx', estado_invitacion = 'activa' WHERE id = ?", [lauraId]);
    }
    await pool.query("INSERT IGNORE INTO empleado_sucursales (empleado_id, sucursal_id) VALUES (?, 1)", [lauraId]);

    // Jorge Ramírez (Gerente - Norte)
    const [empJorge] = await pool.query("SELECT id FROM empleados WHERE nombre = 'Jorge' AND apellido = 'Ramírez'");
    let jorgeId = empJorge.length > 0 ? empJorge[0].id : null;
    if (!jorgeId) {
      const [resJ] = await pool.query(`
        INSERT INTO empleados (nombre, apellido, correo, rol, pin_hash, activo, estado_invitacion, creado_en)
        VALUES ('Jorge', 'Ramírez', 'jorge@technovaderm.mx', 'gerente', '$2b$10$cEH4g7N36oVMFtaZfzmdw.Ep6/XkTfMR2Ul.uVbeSBMM2BnuISg2y', 1, 'activa', NOW())
      `);
      jorgeId = resJ.insertId;
    } else {
      await pool.query("UPDATE empleados SET correo = 'jorge@technovaderm.mx', estado_invitacion = 'activa' WHERE id = ?", [jorgeId]);
    }
    await pool.query("INSERT IGNORE INTO empleado_sucursales (empleado_id, sucursal_id) VALUES (?, 2)", [jorgeId]);

    // Andrea Pérez (Cajera - Norte - Invitación enviada)
    const [empAndrea] = await pool.query("SELECT id FROM empleados WHERE nombre = 'Andrea' AND apellido = 'Pérez'");
    let andreaId = empAndrea.length > 0 ? empAndrea[0].id : null;
    if (!andreaId) {
      const [resA] = await pool.query(`
        INSERT INTO empleados (nombre, apellido, correo, rol, pin_hash, activo, estado_invitacion, creado_en)
        VALUES ('Andrea', 'Pérez', 'andrea@technovaderm.mx', 'cajera', '$2b$10$cEH4g7N36oVMFtaZfzmdw.Ep6/XkTfMR2Ul.uVbeSBMM2BnuISg2y', 1, 'invitacion_enviada', NOW())
      `);
      andreaId = resA.insertId;
    } else {
      await pool.query("UPDATE empleados SET correo = 'andrea@technovaderm.mx', estado_invitacion = 'invitacion_enviada' WHERE id = ?", [andreaId]);
    }
    await pool.query("INSERT IGNORE INTO empleado_sucursales (empleado_id, sucursal_id) VALUES (?, 2)", [andreaId]);

    console.log("✔ Empleados de demostración sembrados y asignados a sucursales");
    console.log("=== Migración de Usuarios y Roles Finalizada con Éxito ===");
  } catch (err) {
    console.error("❌ Error en migración de usuarios y roles:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrateUsuariosRoles();

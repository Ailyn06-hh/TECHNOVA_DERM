import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'technova_derm',
    multipleStatements: true,
  });

  try {
    const sqlPath = path.resolve('../database/rutinas.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Split statements or execute queries
    // In MariaDB/MySQL we can execute DDL and procedures
    const statements = [
      `CREATE TABLE IF NOT EXISTS \`plantillas_rutina\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`clave\` VARCHAR(50) NOT NULL UNIQUE,
        \`nombre\` VARCHAR(100) NOT NULL,
        \`descripcion\` VARCHAR(255) NOT NULL,
        \`descuento_porcentaje\` DECIMAL(5,2) NOT NULL DEFAULT 10.00,
        \`orden\` INT NOT NULL DEFAULT 1,
        \`activa\` TINYINT(1) NOT NULL DEFAULT 1,
        \`creado_en\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_plantillas_clave\` (\`clave\`),
        INDEX \`idx_plantillas_activa\` (\`activa\`),
        INDEX \`idx_plantillas_orden\` (\`orden\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `CREATE TABLE IF NOT EXISTS \`plantilla_pasos\` (
        \`plantilla_id\` INT NOT NULL,
        \`orden\` INT NOT NULL,
        \`tipo_rutina\` ENUM('limpiador', 'tonico', 'serum', 'hidratante', 'protector', 'tratamiento') NOT NULL,
        \`etiqueta\` VARCHAR(100) NOT NULL,
        PRIMARY KEY (\`plantilla_id\`, \`orden\`),
        INDEX \`idx_ppasos_tipo_rutina\` (\`tipo_rutina\`),
        CONSTRAINT \`fk_ppasos_plantilla\` 
          FOREIGN KEY (\`plantilla_id\`) REFERENCES \`plantillas_rutina\` (\`id\`)\r
          ON DELETE CASCADE 
          ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

      `INSERT INTO \`plantillas_rutina\` (\`id\`, \`clave\`, \`nombre\`, \`descripcion\`, \`descuento_porcentaje\`, \`orden\`, \`activa\`)
      VALUES
        (1, 'manana', 'Rutina de mañana', 'Limpia, trata y protege en 3 pasos', 10.00, 1, 1),
        (2, 'noche', 'Rutina de noche', 'Limpia, equilibra e hidrata antes de dormir', 10.00, 2, 1)
      ON DUPLICATE KEY UPDATE
        \`nombre\` = VALUES(\`nombre\`),
        \`descripcion\` = VALUES(\`descripcion\`),
        \`descuento_porcentaje\` = VALUES(\`descuento_porcentaje\`),
        \`orden\` = VALUES(\`orden\`),
        \`activa\` = VALUES(\`activa\`);`,

      `INSERT INTO \`plantilla_pasos\` (\`plantilla_id\`, \`orden\`, \`tipo_rutina\`, \`etiqueta\`)
      VALUES
        (1, 1, 'limpiador', 'Limpiador'),
        (1, 2, 'serum', 'Sérum'),
        (1, 3, 'protector', 'Protector solar'),
        (2, 1, 'limpiador', 'Limpiador'),
        (2, 2, 'tonico', 'Tónico'),
        (2, 3, 'hidratante', 'Hidratante')
      ON DUPLICATE KEY UPDATE
        \`tipo_rutina\` = VALUES(\`tipo_rutina\`),
        \`etiqueta\` = VALUES(\`etiqueta\`);`,
    ];

    for (const stmt of statements) {
      await pool.query(stmt);
    }

    // Check carrito_items columns and add if missing
    const [cols] = await pool.query('DESCRIBE carrito_items');
    const existingCols = new Set(cols.map((c) => c.Field));

    if (!existingCols.has('grupo_id')) {
      await pool.query('ALTER TABLE `carrito_items` ADD COLUMN `grupo_id` VARCHAR(36) NULL AFTER `precio_unitario_al_agregar`');
      await pool.query('ALTER TABLE `carrito_items` ADD INDEX `idx_ci_grupo_id` (`grupo_id`)');
      console.log('Added grupo_id to carrito_items');
    }

    if (!existingCols.has('grupo_tipo')) {
      await pool.query("ALTER TABLE `carrito_items` ADD COLUMN `grupo_tipo` ENUM('rutina', 'combo') NULL AFTER `grupo_id`");
      await pool.query('ALTER TABLE `carrito_items` ADD INDEX `idx_ci_grupo_tipo` (`grupo_tipo`)');
      console.log('Added grupo_tipo to carrito_items');
    }

    if (!existingCols.has('grupo_clave')) {
      await pool.query('ALTER TABLE `carrito_items` ADD COLUMN `grupo_clave` VARCHAR(50) NULL AFTER `grupo_tipo`');
      console.log('Added grupo_clave to carrito_items');
    }

    if (!existingCols.has('descuento_porcentaje')) {
      await pool.query('ALTER TABLE `carrito_items` ADD COLUMN `descuento_porcentaje` DECIMAL(5,2) NULL AFTER `grupo_clave`');
      console.log('Added descuento_porcentaje to carrito_items');
    }

    console.log('Migration completed successfully!');

    const [finalCols] = await pool.query('DESCRIBE carrito_items');
    console.log('Final columns in carrito_items:', finalCols.map((c) => c.Field));

    const [plantillas] = await pool.query('SELECT * FROM plantillas_rutina');
    console.log('Plantillas:', plantillas);

    const [pasos] = await pool.query('SELECT * FROM plantilla_pasos');
    console.log('Pasos:', pasos);
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

runMigration();

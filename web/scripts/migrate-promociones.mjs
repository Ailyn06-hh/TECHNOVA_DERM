import { getDbPool } from "../src/lib/db.ts";

async function migratePromociones() {
  console.log("=== Ejecutando migración Promociones y Combos ===");
  const pool = getDbPool();

  try {
    // 1. Tabla reglas_promocion
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`reglas_promocion\` (
        \`clave\` VARCHAR(50) PRIMARY KEY,
        \`nombre\` VARCHAR(100) NOT NULL,
        \`descripcion\` TEXT NOT NULL,
        \`tope_texto\` VARCHAR(100) NULL,
        \`activa\` TINYINT(1) NOT NULL DEFAULT 1,
        \`configuracion\` JSON NULL,
        \`actualizado_en\` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Sembrar las 4 reglas automáticas
    await pool.query(`
      INSERT INTO \`reglas_promocion\` (\`clave\`, \`nombre\`, \`descripcion\`, \`tope_texto\`, \`activa\`)
      VALUES
        ('descuento_caducidad', 'Descuento por caducidad', 'Si un lote caduca en menos de 60 días, sugerir un descuento de 15% a 20%.', 'Tope: 25% - requiere tu aprobación', 1),
        ('combos_sobrestock', 'Combos por sobrestock', 'Si un producto tiene más de 40 piezas sin moverse en 30 días, sugerir incluirlo en un combo.', 'Descuento de combo: 10% a 15%', 1),
        ('ultimas_piezas', 'Últimas piezas', 'Mostrar la etiqueta «Últimas piezas» cuando queden 4 o menos en todos los canales.', NULL, 1),
        ('recordatorio_recompra', 'Recordatorio de recompra', 'Avisar a la clienta 7 días antes de que se le termine un producto, según la duración estimada.', 'Solo clientas que aceptaron promociones', 1)
      ON DUPLICATE KEY UPDATE \`nombre\` = VALUES(\`nombre\`), \`descripcion\` = VALUES(\`descripcion\`), \`tope_texto\` = VALUES(\`tope_texto\`);
    `);

    // 3. Tabla descuentos_pendientes
    await pool.query(`
      CREATE TABLE IF NOT EXISTS \`descuentos_pendientes\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`producto_id\` INT NOT NULL,
        \`lote_id\` INT NULL,
        \`nombre_lote\` VARCHAR(150) NOT NULL,
        \`piezas\` INT NOT NULL DEFAULT 0,
        \`dias_restantes\` INT NOT NULL DEFAULT 0,
        \`descuento_porcentaje\` INT NOT NULL,
        \`estado\` ENUM('pendiente', 'aprobado', 'rechazado') NOT NULL DEFAULT 'pendiente',
        \`creado_en\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`fk_descuento_producto\` FOREIGN KEY (\`producto_id\`) REFERENCES \`productos\` (\`id\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Asegurar columna canales en combos
    try {
      await pool.query("ALTER TABLE `combos` ADD COLUMN `canales` JSON NULL AFTER `activo`;");
    } catch {
      // Ignorar si ya existe
    }

    // 5. Sembrar ítems por aprobar
    const [descuentosCount] = await pool.query("SELECT COUNT(*) as count FROM descuentos_pendientes");
    if (descuentosCount[0].count === 0) {
      const [prods] = await pool.query("SELECT id, nombre FROM productos LIMIT 2");
      if (prods.length > 0) {
        await pool.query(
          `INSERT INTO descuentos_pendientes (producto_id, lote_id, nombre_lote, piezas, dias_restantes, descuento_porcentaje, estado)
           VALUES (?, 1, ?, 18, 45, 20, 'pendiente')`,
          [prods[0].id, `${prods[0].nombre} · lote L-0325`]
        );
      }
      if (prods.length > 1) {
        await pool.query(
          `INSERT INTO descuentos_pendientes (producto_id, lote_id, nombre_lote, piezas, dias_restantes, descuento_porcentaje, estado)
           VALUES (?, 2, ?, 9, 60, 15, 'pendiente')`,
          [prods[1].id, `${prods[1].nombre} · lote L-0211`]
        );
      }
    }

    console.log("✔ Tablas de promociones y combos verificadas con éxito");
    process.exit(0);
  } catch (err) {
    console.error("Error en migración promociones:", err);
    process.exit(1);
  }
}

migratePromociones();

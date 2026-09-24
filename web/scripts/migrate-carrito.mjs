import mysql from 'mysql2/promise';

async function migrateCarrito() {
  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'technova_derm',
  });

  try {
    const [cols] = await pool.query('DESCRIBE carrito_items');
    const existingCols = new Set(cols.map((c) => c.Field));

    if (!existingCols.has('canal_origen')) {
      await pool.query("ALTER TABLE `carrito_items` ADD COLUMN `canal_origen` ENUM('web', 'app', 'tienda') NOT NULL DEFAULT 'web' AFTER `descuento_porcentaje`");
      await pool.query('ALTER TABLE `carrito_items` ADD INDEX `idx_ci_canal_origen` (`canal_origen`)');
      console.log('Added canal_origen to carrito_items');
    }

    if (!existingCols.has('actualizado_en')) {
      await pool.query('ALTER TABLE `carrito_items` ADD COLUMN `actualizado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `canal_origen`');
      console.log('Added actualizado_en to carrito_items');
    }

    const [indexes] = await pool.query('SHOW INDEX FROM carrito_items WHERE Key_name = "idx_ci_carrito_id"');
    if (indexes.length === 0) {
      await pool.query('ALTER TABLE `carrito_items` ADD INDEX `idx_ci_carrito_id` (`carrito_id`)');
      console.log('Added idx_ci_carrito_id');
    }

    console.log('Carrito migration completed successfully!');
    const [finalCols] = await pool.query('DESCRIBE carrito_items');
    console.log('Current columns in carrito_items:', finalCols.map((c) => c.Field));
  } catch (err) {
    console.error('Error running carrito migration:', err);
  } finally {
    await pool.end();
  }
}

migrateCarrito();

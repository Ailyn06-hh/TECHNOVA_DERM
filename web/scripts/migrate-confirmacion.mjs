import mysql from 'mysql2/promise';

async function migrate() {
  console.log('--- Aplicando migración confirmacion.sql ---');
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'technova_derm',
    multipleStatements: true
  });

  try {
    // 1. Columnas en pedidos
    const [cols] = await conn.query('DESCRIBE pedidos');
    const existingColNames = cols.map((c) => c.Field);

    if (!existingColNames.includes('codigo_recogida')) {
      console.log('Agregando columna codigo_recogida a pedidos...');
      await conn.query('ALTER TABLE pedidos ADD COLUMN codigo_recogida CHAR(4) NULL AFTER sucursal_id');
    }

    if (!existingColNames.includes('intentos_codigo_recogida')) {
      console.log('Agregando columna intentos_codigo_recogida a pedidos...');
      await conn.query('ALTER TABLE pedidos ADD COLUMN intentos_codigo_recogida INT NOT NULL DEFAULT 0 AFTER codigo_recogida');
    }

    if (!existingColNames.includes('confirmacion_enviada')) {
      console.log('Agregando columna confirmacion_enviada a pedidos...');
      await conn.query('ALTER TABLE pedidos ADD COLUMN confirmacion_enviada TINYINT(1) NOT NULL DEFAULT 0 AFTER metodo_pago');
    }

    // 2. Tabla pedido_eventos
    console.log('Creando tabla pedido_eventos si no existe...');
    await conn.query(`
      CREATE TABLE IF NOT EXISTS pedido_eventos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pedido_id INT NOT NULL,
        estado VARCHAR(50) NOT NULL,
        nota TEXT NULL,
        creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_pedido_creado (pedido_id, creado_en),
        FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('✓ Migración de confirmación aplicada exitosamente.');
  } catch (err) {
    console.error('Error durante la migración:', err);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

migrate();

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  const sqlPath = path.resolve(__dirname, '../../database/cuenta.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const pool = mysql.createPool({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    database: 'technova_derm',
    multipleStatements: true,
  });

  console.log('Aplicando database/cuenta.sql...');
  await pool.query(sql);
  console.log('✓ database/cuenta.sql aplicado exitosamente.');

  // Comprobar que Ana López existe
  const [users] = await pool.execute('SELECT id, nombre, apellido, correo FROM usuarios WHERE id = 20');
  console.log('Usuario Ana López:', users);

  // Comprobar pedidos de Ana
  const [pedidos] = await pool.execute('SELECT folio, canal, total, estado, codigo_recogida FROM pedidos WHERE usuario_id = 20 ORDER BY id DESC');
  console.log('Pedidos de Ana:', pedidos);

  // Comprobar rutina guardada
  const [rutinas] = await pool.execute('SELECT * FROM rutinas_guardadas WHERE usuario_id = 20');
  console.log('Rutina guardada:', rutinas);

  // Comprobar Tónico de Rosa
  const [tonico] = await pool.execute('SELECT id, nombre, precio, precio_especial, duracion_dias FROM productos WHERE id = 8');
  console.log('Tónico de Rosa:', tonico);

  await pool.end();
}

run().catch((err) => {
  console.error('Error aplicando migración:', err);
  process.exit(1);
});

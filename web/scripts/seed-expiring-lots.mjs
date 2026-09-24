import { getDbPool } from "../src/lib/db.ts";

async function seedExpiringLots() {
  console.log("=== Sembrando lotes por caducar para FEFO y Creador de Combos ===");
  const pool = getDbPool();

  try {
    // 1. Obtener algunos productos
    const [prods] = await pool.query("SELECT id, nombre FROM productos LIMIT 5");
    if (prods.length === 0) return;

    const p1 = prods[0]; // Gel Hidratante o Espuma
    const p2 = prods[1] || prods[0];

    // Fecha en 18 días
    const fecha18dias = new Date();
    fecha18dias.setDate(fecha18dias.getDate() + 18);
    const fechaStr18 = fecha18dias.toISOString().split("T")[0];

    // Fecha en 35 días
    const fecha35dias = new Date();
    fecha35dias.setDate(fecha35dias.getDate() + 35);
    const fechaStr35 = fecha35dias.toISOString().split("T")[0];

    // Insertar lote por caducar en 18 días para producto 1
    await pool.query(
      `INSERT INTO inventario_lotes (producto_id, sucursal_id, codigo_lote, caduca_en, existencias, recibido_en)
       VALUES (?, 1, 'L-0899-EXP', ?, 24, NOW())
       ON DUPLICATE KEY UPDATE caduca_en = VALUES(caduca_en), existencias = 24`,
      [p1.id, fechaStr18]
    );

    // Insertar lote por caducar en 35 días para producto 2
    await pool.query(
      `INSERT INTO inventario_lotes (producto_id, sucursal_id, codigo_lote, caduca_en, existencias, recibido_en)
       VALUES (?, 1, 'L-0902-DEX', ?, 15, NOW())
       ON DUPLICATE KEY UPDATE caduca_en = VALUES(caduca_en), existencias = 15`,
      [p2.id, fechaStr35]
    );

    // Insertar descuento pendiente en la cola FEFO
    await pool.query(
      `INSERT INTO descuentos_pendientes (producto_id, lote_id, nombre_lote, piezas, dias_restantes, descuento_porcentaje, estado, creado_en)
       VALUES (?, 999, ?, 24, 18, 25, 'pendiente', NOW())
       ON DUPLICATE KEY UPDATE dias_restantes = 18`,
      [p1.id, `Lote L-0899-EXP (${p1.nombre})`]
    );

    console.log("✔ Lotes por caducar y propuesta FEFO sembrados correctamente");
  } catch (err) {
    console.error("❌ Error al sembrar lotes por caducar:", err);
  } finally {
    await pool.end();
  }
}

seedExpiringLots();

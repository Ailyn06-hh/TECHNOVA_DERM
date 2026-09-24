// Helper para soporte CommonJS y scripts externos
let getDbPoolLazy = null;
try {
  getDbPoolLazy = require("./db").getDbPool;
} catch {}

async function descontarInventario(conn, productoId, sucursalId, cantidad) {
  if (cantidad <= 0) return;

  const [invRows] = await conn.execute(
    "SELECT existencias FROM inventario WHERE producto_id = ? AND sucursal_id = ? FOR UPDATE",
    [productoId, sucursalId]
  );

  const existenciasActuales = invRows && invRows.length > 0 ? Number(invRows[0].existencias) : 0;
  if (existenciasActuales < cantidad) {
    throw new Error(
      `Stock insuficiente para el producto ID ${productoId} en sucursal ${sucursalId}. Disponible: ${existenciasActuales}, requerido: ${cantidad}`
    );
  }

  await conn.execute(
    "UPDATE inventario SET existencias = existencias - ? WHERE producto_id = ? AND sucursal_id = ?",
    [cantidad, productoId, sucursalId]
  );

  const [lotes] = await conn.execute(
    `SELECT id, existencias, caduca_en 
     FROM inventario_lotes 
     WHERE producto_id = ? AND sucursal_id = ? AND existencias > 0
     ORDER BY caduca_en ASC, id ASC
     FOR UPDATE`,
    [productoId, sucursalId]
  );

  let restante = cantidad;
  for (const lote of lotes || []) {
    if (restante <= 0) break;
    const existenciasLote = Number(lote.existencias) || 0;
    const aDescontar = Math.min(existenciasLote, restante);

    await conn.execute(
      "UPDATE inventario_lotes SET existencias = existencias - ? WHERE id = ?",
      [aDescontar, lote.id]
    );

    restante -= aDescontar;
  }

  if (restante > 0) {
    if (lotes && lotes.length > 0) {
      const ultimoLote = lotes[lotes.length - 1];
      await conn.execute(
        "UPDATE inventario_lotes SET existencias = existencias - ? WHERE id = ?",
        [restante, ultimoLote.id]
      );
    }
  }
}

async function regresarInventario(conn, productoId, sucursalId, cantidad) {
  if (cantidad <= 0) return;

  await conn.execute(
    `INSERT INTO inventario (producto_id, sucursal_id, existencias)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE existencias = existencias + ?`,
    [productoId, sucursalId, cantidad, cantidad]
  );

  const [lotes] = await conn.execute(
    `SELECT id 
     FROM inventario_lotes 
     WHERE producto_id = ? AND sucursal_id = ?
     ORDER BY caduca_en DESC, id DESC 
     LIMIT 1 
     FOR UPDATE`,
    [productoId, sucursalId]
  );

  if (lotes && lotes.length > 0) {
    await conn.execute(
      "UPDATE inventario_lotes SET existencias = existencias + ? WHERE id = ?",
      [cantidad, lotes[0].id]
    );
  } else {
    await conn.execute(
      `INSERT INTO inventario_lotes (producto_id, sucursal_id, codigo_lote, caduca_en, existencias, recibido_en)
       VALUES (?, ?, 'L-RET', DATE_ADD(CURDATE(), INTERVAL 365 DAY), ?, NOW())`,
      [productoId, sucursalId, cantidad]
    );
  }
}

async function verificarConsistencia(connOrPool) {
  const executor = connOrPool || (getDbPoolLazy ? getDbPoolLazy() : null);
  if (!executor) throw new Error("No database connection or pool provided");

  const [discrepancias] = await executor.execute(`
    SELECT 
      i.producto_id, 
      i.sucursal_id, 
      i.existencias AS inv_existencias,
      COALESCE(SUM(il.existencias), 0) AS lotes_existencias
    FROM inventario i
    LEFT JOIN inventario_lotes il ON il.producto_id = i.producto_id AND il.sucursal_id = i.sucursal_id
    GROUP BY i.producto_id, i.sucursal_id
    HAVING inv_existencias != lotes_existencias
  `);

  return (discrepancias || []).map((row) => ({
    producto_id: Number(row.producto_id),
    sucursal_id: Number(row.sucursal_id),
    inventario: Number(row.inv_existencias),
    lotes: Number(row.lotes_existencias),
  }));
}

module.exports = {
  descontarInventario,
  regresarInventario,
  verificarConsistencia,
  default: {
    descontarInventario,
    regresarInventario,
    verificarConsistencia,
  },
};

import { Pool, PoolConnection } from "mysql2/promise";
import { getDbPool } from "./db";

export interface DiscrepanciaInventario {
  producto_id: number;
  sucursal_id: number;
  inventario: number;
  lotes: number;
}

/**
 * Descuenta existencias de inventario respetando el principio FEFO (First Expired, First Out).
 * Descuenta tanto de la tabla general `inventario` como de los lotes activos en `inventario_lotes`.
 * 
 * Debe ejecutarse dentro de una transacción activa con la conexión provista.
 */
export async function descontarInventario(
  conn: PoolConnection | any,
  productoId: number,
  sucursalId: number,
  cantidad: number
): Promise<void> {
  if (cantidad <= 0) return;

  // 1. Bloquear y verificar existencias generales en la sucursal
  const [invRows]: any = await conn.execute(
    "SELECT existencias FROM inventario WHERE producto_id = ? AND sucursal_id = ? FOR UPDATE",
    [productoId, sucursalId]
  );

  const existenciasActuales = invRows && invRows.length > 0 ? Number(invRows[0].existencias) : 0;
  if (existenciasActuales < cantidad) {
    throw new Error(
      `Stock insuficiente para el producto ID ${productoId} en sucursal ${sucursalId}. Disponible: ${existenciasActuales}, requerido: ${cantidad}`
    );
  }

  // 2. Descontar en la tabla general de inventario
  await conn.execute(
    "UPDATE inventario SET existencias = existencias - ? WHERE producto_id = ? AND sucursal_id = ?",
    [cantidad, productoId, sucursalId]
  );

  // 3. Buscar lotes disponibles ordenados por fecha de caducidad ascendente (FEFO)
  const [lotes]: any = await conn.execute(
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

  // Si aún queda restante (caso donde no existían lotes suficientes en la BD), descontar del último lote o registrar aviso
  if (restante > 0) {
    if (lotes && lotes.length > 0) {
      const ultimoLote = lotes[lotes.length - 1];
      await conn.execute(
        "UPDATE inventario_lotes SET existencias = existencias - ? WHERE id = ?",
        [restante, ultimoLote.id]
      );
    } else {
      // Crear un lote de contingencia con existencias ajustadas
      await conn.execute(
        `INSERT INTO inventario_lotes (producto_id, sucursal_id, codigo_lote, caduca_en, existencias, recibido_en)
         VALUES (?, ?, 'L-AUTO', DATE_ADD(CURDATE(), INTERVAL 365 DAY), 0, NOW())`,
        [productoId, sucursalId]
      );
    }
  }
}

/**
 * Regresa existencias al inventario (por devoluciones, cancelaciones de reservas o pagos fallidos).
 * Actualiza la tabla general de inventario y repone el lote más reciente o crea uno nuevo.
 */
export async function regresarInventario(
  conn: PoolConnection | any,
  productoId: number,
  sucursalId: number,
  cantidad: number
): Promise<void> {
  if (cantidad <= 0) return;

  // 1. Aumentar en inventario general
  await conn.execute(
    `INSERT INTO inventario (producto_id, sucursal_id, existencias)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE existencias = existencias + ?`,
    [productoId, sucursalId, cantidad, cantidad]
  );

  // 2. Reponer en el lote más reciente o crear uno si no hay
  const [lotes]: any = await conn.execute(
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

/**
 * Valida la consistencia estricta entre la tabla `inventario` y los lotes `inventario_lotes`.
 * Retorna las discrepancias encontradas; un arreglo vacío indica consistencia total.
 */
export async function verificarConsistencia(
  connOrPool?: PoolConnection | Pool | any
): Promise<DiscrepanciaInventario[]> {
  const executor = connOrPool || getDbPool();

  const [discrepancias]: any = await executor.execute(`
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

  return (discrepancias || []).map((row: any) => ({
    producto_id: Number(row.producto_id),
    sucursal_id: Number(row.sucursal_id),
    inventario: Number(row.inv_existencias),
    lotes: Number(row.lotes_existencias),
  }));
}

export default {
  descontarInventario,
  regresarInventario,
  verificarConsistencia,
};

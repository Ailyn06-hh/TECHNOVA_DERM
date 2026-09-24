import { getDbPool } from "@/lib/db";

/**
 * Libera las reservas de inventario de pedidos que hayan superado su tiempo límite.
 * Pasa a estado 'expirado' los pedidos en 'pendiente_pago' o 'por_pagar_en_tienda'
 * cuya fecha 'reserva_expira_en' sea anterior a NOW().
 *
 * TODO: Configurar ejecución periódica cada 5 minutos mediante un cron job o tarea en segundo plano.
 */
export async function liberarReservasVencidas(): Promise<{ pedidosExpirados: number }> {
  const pool = getDbPool();
  let conn: any = null;

  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // 1. Seleccionar pedidos con reserva expirada
    const [expiredRows]: any = await conn.execute(
      `SELECT id, sucursal_id 
       FROM pedidos 
       WHERE estado IN ('pendiente_pago', 'por_pagar_en_tienda') 
         AND reserva_expira_en IS NOT NULL 
         AND reserva_expira_en < NOW()
       FOR UPDATE`
    );

    if (!expiredRows || expiredRows.length === 0) {
      await conn.commit();
      return { pedidosExpirados: 0 };
    }

    const orderIds: number[] = expiredRows.map((r: any) => Number(r.id));
    const placeholders = orderIds.map(() => "?").join(",");

    // 2. Obtener los items de dichos pedidos para devolver el stock al inventario
    const [itemsToReturn]: any = await conn.execute(
      `SELECT pi.pedido_id, pi.producto_id, pi.cantidad, p.sucursal_id 
       FROM pedido_items pi
       JOIN pedidos p ON p.id = pi.pedido_id
       WHERE pi.pedido_id IN (${placeholders})`,
      [...orderIds]
    );

    for (const item of itemsToReturn || []) {
      if (item.sucursal_id) {
        await conn.execute(
          `UPDATE inventario 
           SET existencias = existencias + ? 
           WHERE producto_id = ? AND sucursal_id = ? 
           LIMIT 1`,
          [item.cantidad, item.producto_id, item.sucursal_id]
        );
      } else {
        // Si no tenía sucursal asignada (ej. envío central), reponer en la sucursal 1 (Centro)
        await conn.execute(
          `UPDATE inventario 
           SET existencias = existencias + ? 
           WHERE producto_id = ? 
           ORDER BY existencias ASC 
           LIMIT 1`,
          [item.cantidad, item.producto_id]
        );
      }
    }

    // 3. Actualizar estado de los pedidos a 'expirado' y registrar evento
    for (const orderId of orderIds) {
      await conn.execute(
        `UPDATE pedidos 
         SET estado = 'expirado', reserva_expira_en = NULL 
         WHERE id = ?`,
        [orderId]
      );
      await conn.execute(
        `INSERT INTO pedido_eventos (pedido_id, estado, nota, creado_en)
         VALUES (?, 'expirado', 'Reserva de inventario vencida automáticamente', NOW())`,
        [orderId]
      );
    }

    await conn.commit();
    return { pedidosExpirados: orderIds.length };
  } catch (err) {
    if (conn) await conn.rollback();
    console.error("[liberarReservasVencidas Error]:", err);
    return { pedidosExpirados: 0 };
  } finally {
    if (conn) conn.release();
  }
}

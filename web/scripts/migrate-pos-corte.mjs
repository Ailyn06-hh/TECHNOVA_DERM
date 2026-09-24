import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";

async function runMigration() {
  console.log("=== EJECUTANDO MIGRACIÓN POS CORTE DE CAJA ===");
  const conn = await mysql.createConnection({
    host: "127.0.0.1",
    user: "root",
    password: "",
    database: "technova_derm",
    multipleStatements: true,
  });

  try {
    const sqlPath = path.resolve("..", "database", "pos_corte.sql");
    const sql = fs.readFileSync(sqlPath, "utf-8");

    console.log("Ejecutando SQL en MySQL...");
    await conn.query(sql);
    console.log("-> pos_corte.sql ejecutado con éxito.");

    // Verificar columnas añadidas
    const [cajasCols] = await conn.query("DESCRIBE cajas");
    console.log("cajas.fondo_fijo existe:", cajasCols.some(c => c.Field === "fondo_fijo"));

    const [turnosCols] = await conn.query("DESCRIBE turnos");
    console.log("turnos.fondo_inicial existe:", turnosCols.some(c => c.Field === "fondo_inicial"));

    const [sucursalesCols] = await conn.query("DESCRIBE sucursales");
    console.log("sucursales.correo_gerencia existe:", sucursalesCols.some(c => c.Field === "correo_gerencia"));

    const [pedidosCols] = await conn.query("DESCRIBE pedidos");
    console.log("pedidos.referencia_transferencia existe:", pedidosCols.some(c => c.Field === "referencia_transferencia"));

    // Verificar tabla cortes_caja
    const [corteTables] = await conn.query("SHOW TABLES LIKE 'cortes_caja'");
    console.log("cortes_caja creada:", corteTables.length > 0);

    // Preparar el Turno Activo para Laura Méndez en Caja 1 Centro (Mockup Reproducibility)
    console.log("\n--- Configurando Turno de demostración fiel al Mockup ---");

    // 1. Cerrar turnos huérfanos o duplicados para Laura Méndez excepto el más reciente
    const [openTurnos] = await conn.query(
      "SELECT id FROM turnos WHERE empleado_id = 1 AND caja_id = 1 AND estado = 'abierto' ORDER BY id DESC"
    );

    let activeTurnoId = null;
    if (openTurnos.length > 0) {
      activeTurnoId = openTurnos[0].id;
      if (openTurnos.length > 1) {
        const toClose = openTurnos.slice(1).map(t => t.id);
        await conn.query(
          `UPDATE turnos SET estado = 'cerrado', fin = NOW() WHERE id IN (${toClose.join(",")})`
        );
        console.log(`Turnos anteriores cerrados: ${toClose.join(", ")}`);
      }
    } else {
      const [insertT] = await conn.query(
        "INSERT INTO turnos (empleado_id, caja_id, sucursal_id, fondo_inicial, inicio, estado) VALUES (1, 1, 1, 1000.00, NOW(), 'abierto')"
      );
      activeTurnoId = insertT.insertId;
      console.log(`Nuevo turno #${activeTurnoId} creado.`);
    }

    // Asegurar fondo_inicial = 1000.00
    await conn.query("UPDATE turnos SET fondo_inicial = 1000.00 WHERE id = ?", [activeTurnoId]);

    // Limpiar movimientos previos de este turno para tener exactamente los del mockup
    await conn.query("DELETE FROM movimientos_caja WHERE turno_id = ?", [activeTurnoId]);

    // 1. Fondo inicial: $1,000.00
    await conn.query(
      "INSERT INTO movimientos_caja (turno_id, tipo, monto, empleado_id, creado_en) VALUES (?, 'fondo_inicial', 1000.00, 1, NOW())",
      [activeTurnoId]
    );

    // 2. 23 Ventas de mostrador que sumen exactamente $6,020.00:
    // Efectivo: $2,140.00 (8 ventas)
    // Tarjeta:   $3,380.00 (13 ventas)
    // Transf:    $500.00   (2 ventas)
    // Total = 23 ventas | Total = $6,020.00 | Ticket Promedio = $261.74

    const cashAmounts = [300, 250, 400, 190, 350, 200, 150, 300]; // sum = 2140
    const cardAmounts = [260, 240, 280, 310, 220, 250, 290, 270, 230, 260, 250, 300, 220]; // sum = 3380
    const transferAmounts = [250, 250]; // sum = 500

    // Limpiar pedidos y movimientos anteriores de este turno
    await conn.query("DELETE FROM pedidos WHERE turno_id = ? AND canal = 'tienda'", [activeTurnoId]);
    await conn.query("DELETE FROM pedidos WHERE folio LIKE 'V-DEMO%' OR folio LIKE 'V35-%' OR folio LIKE 'NP35-%'");

    let saleIndex = 1;
    // Insertar Efectivo
    for (const amt of cashAmounts) {
      const folio = `V35-${String(saleIndex).padStart(3, "0")}`;
      const [pRes] = await conn.query(
        `INSERT INTO pedidos (folio, turno_id, usuario_id, sucursal_id, canal, tipo_entrega, estado, total, metodo_pago, efectivo_recibido, cambio, entregado_en, entregado_por, creado_en)
         VALUES (?, ?, NULL, 1, 'tienda', 'mostrador', 'entregado', ?, 'efectivo', ?, 0, NOW(), 1, NOW())`,
        [folio, activeTurnoId, amt, amt]
      );
      await conn.query(
        "INSERT INTO movimientos_caja (turno_id, tipo, monto, pedido_id, empleado_id, creado_en) VALUES (?, 'venta_efectivo', ?, ?, 1, NOW())",
        [activeTurnoId, amt, pRes.insertId]
      );
      saleIndex++;
    }

    // Insertar Tarjeta
    for (const amt of cardAmounts) {
      const folio = `V35-${String(saleIndex).padStart(3, "0")}`;
      const [pRes] = await conn.query(
        `INSERT INTO pedidos (folio, turno_id, usuario_id, sucursal_id, canal, tipo_entrega, estado, total, metodo_pago, entregado_en, entregado_por, creado_en)
         VALUES (?, ?, NULL, 1, 'tienda', 'mostrador', 'entregado', ?, 'tarjeta_terminal', NOW(), 1, NOW())`,
        [folio, activeTurnoId, amt]
      );
      await conn.query(
        "INSERT INTO movimientos_caja (turno_id, tipo, monto, pedido_id, empleado_id, creado_en) VALUES (?, 'venta_tarjeta', ?, ?, 1, NOW())",
        [activeTurnoId, amt, pRes.insertId]
      );
      saleIndex++;
    }

    // Insertar Transferencia
    for (const amt of transferAmounts) {
      const folio = `V35-${String(saleIndex).padStart(3, "0")}`;
      const [pRes] = await conn.query(
        `INSERT INTO pedidos (folio, turno_id, usuario_id, sucursal_id, canal, tipo_entrega, estado, total, metodo_pago, referencia_transferencia, entregado_en, entregado_por, creado_en)
         VALUES (?, ?, NULL, 1, 'tienda', 'mostrador', 'entregado', ?, 'transferencia', 'TR-BBVA-984214', NOW(), 1, NOW())`,
        [folio, activeTurnoId, amt]
      );
      await conn.query(
        "INSERT INTO movimientos_caja (turno_id, tipo, monto, pedido_id, empleado_id, creado_en) VALUES (?, 'venta_transferencia', ?, ?, 1, NOW())",
        [activeTurnoId, amt, pRes.insertId]
      );
      saleIndex++;
    }

    // Asegurar exactamente 5 pedidos entregados por recoger en tienda
    await conn.query("UPDATE pedidos SET entregado_por = NULL WHERE tipo_entrega = 'recoger' AND entregado_por = 1");
    for (let i = 1; i <= 5; i++) {
      const folio = `NP35-${i}`;
      await conn.query(
        `INSERT INTO pedidos (folio, usuario_id, sucursal_id, canal, tipo_entrega, estado, total, metodo_pago, entregado_en, entregado_por, creado_en)
         VALUES (?, 2, 1, 'web', 'recoger', 'entregado', 450.00, 'tarjeta', NOW(), 1, NOW())
         ON DUPLICATE KEY UPDATE entregado_en = NOW(), entregado_por = 1, estado = 'entregado'`,
        [folio]
      );
    }

    // Balance esperado de movimientos_caja
    const [balanceRows] = await conn.query(
      `SELECT tipo, SUM(monto) as total_tipo, COUNT(*) as cantidad
       FROM movimientos_caja
       WHERE turno_id = ?
       GROUP BY tipo`,
      [activeTurnoId]
    );

    console.log("\nBalance movimientos_caja turno #" + activeTurnoId + ":", balanceRows);

    const [pedidosStats] = await conn.query(
      `SELECT 
         COUNT(*) as num_ventas,
         SUM(total) as suma_ventas,
         AVG(total) as ticket_promedio
       FROM pedidos
       WHERE turno_id = ? AND estado = 'entregado' AND canal = 'tienda'`,
      [activeTurnoId]
    );
    console.log("Estadísticas ventas mostrador:", pedidosStats[0]);

    const [entregadosStats] = await conn.query(
      `SELECT COUNT(*) as entregados_recoger
       FROM pedidos
       WHERE entregado_por = 1 AND tipo_entrega = 'recoger' AND DATE(entregado_en) = CURDATE()`,
    );
    console.log("Pedidos entregados por recoger:", entregadosStats[0]);

    console.log("\n✅ Migración y configuración del turno de demo completadas con éxito.");
  } catch (err) {
    console.error("Error en migración:", err);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

runMigration();

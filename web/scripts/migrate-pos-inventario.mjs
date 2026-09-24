import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";

async function runMigration() {
  console.log("=== EJECUTANDO MIGRACIÓN POS INVENTARIO ===");
  const conn = await mysql.createConnection({
    host: "127.0.0.1",
    user: "root",
    database: "technova_derm",
    multipleStatements: true,
  });

  try {
    const sqlPath = path.resolve("..", "database", "pos_inventario.sql");
    const sql = fs.readFileSync(sqlPath, "utf-8");

    console.log("Ejecutando SQL en MySQL...");
    await conn.query(sql);
    console.log("-> pos_inventario.sql ejecutado con éxito.");

    // Verificar sucursales
    const [sucursales] = await conn.query("SELECT id, nombre, tipo, activa FROM sucursales ORDER BY id");
    console.log("Sucursales:", sucursales);

    // Verificar lotes creados
    const [lotesCount] = await conn.query("SELECT COUNT(*) as total, SUM(existencias) as total_existencias FROM inventario_lotes");
    console.log("Total lotes:", lotesCount[0]);

    // Verificar consistencia entre inventario e inventario_lotes
    const [discrepancias] = await conn.query(`
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

    if (discrepancias.length === 0) {
      console.log("-> CONSISTENCIA PERFECTA: Todas las existencias de inventario coinciden con la suma de lotes.");
    } else {
      console.warn("Discrepancias encontradas:", discrepancias);
    }

    // Verificar orden de compra OC-118
    const [oc] = await conn.query(`
      SELECT oc.folio, oc.proveedor, oc.estado, oc.llegada_estimada, oci.producto_id, oci.cantidad
      FROM ordenes_compra oc
      JOIN orden_compra_items oci ON oci.orden_id = oc.id
      WHERE oc.folio = 'OC-118'
    `);
    console.log("Orden de compra OC-118:", oc);

  } catch (err) {
    console.error("Error en migración:", err.message, err.sqlMessage || err);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

runMigration();

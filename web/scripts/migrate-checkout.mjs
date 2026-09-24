import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";

const dbConfig = {
  host: "127.0.0.1",
  port: 3306,
  user: "root",
  password: "",
  database: "technova_derm",
  multipleStatements: true,
};

async function migrate() {
  console.log("=== EJECUTANDO MIGRACIÓN DE CHECKOUT ===");
  const connection = await mysql.createConnection(dbConfig);
  try {
    const sqlPath = path.resolve("../database/checkout.sql");
    const sql = fs.readFileSync(sqlPath, "utf-8");

    console.log("Aplicando database/checkout.sql...");
    await connection.query(sql);
    console.log("✓ database/checkout.sql aplicado exitosamente.");

    // Verificar tablas y columnas
    const [dirRows] = await connection.execute("SELECT COUNT(*) as count FROM direcciones;");
    const [mpRows] = await connection.execute("SELECT COUNT(*) as count FROM metodos_pago;");
    const [sucRows] = await connection.execute("SELECT id, nombre, direccion_corta FROM sucursales;");
    const [pedCols] = await connection.execute("SHOW COLUMNS FROM pedidos LIKE 'folio';");

    console.log(`- Direcciones registradas: ${dirRows[0].count}`);
    console.log(`- Métodos de pago registrados: ${mpRows[0].count}`);
    console.log(`- Sucursales con direccion_corta:`, sucRows);
    console.log(`- Columna folio en pedidos:`, pedCols.length > 0 ? "OK" : "FALTA");

    console.log("\n✓ MIGRACIÓN DE CHECKOUT COMPLETADA CON ÉXITO.");
  } catch (err) {
    console.error("Error en la migración:", err);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();

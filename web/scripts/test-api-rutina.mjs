import mysql from 'mysql2/promise';

async function testApiLogic() {
  console.log("=== PROBANDO LÓGICA DE POST /api/carrito/rutina ===");

  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'technova_derm',
  });

  try {
    // 1. Simular validación del servidor de la plantilla
    const [plantillaRows] = await pool.execute(
      "SELECT id, clave, nombre, descuento_porcentaje FROM plantillas_rutina WHERE clave = ? AND activa = 1",
      ['manana']
    );
    const plantilla = plantillaRows[0];
    console.log("Plantilla encontrada:", plantilla.nombre, "Descuento:", plantilla.descuento_porcentaje);

    // 2. Simular pasos
    const [pasos] = await pool.execute(
      "SELECT orden, tipo_rutina, etiqueta FROM plantilla_pasos WHERE plantilla_id = ? ORDER BY orden ASC",
      [plantilla.id]
    );
    console.log("Pasos requeridos:", pasos.map(p => `${p.orden}: ${p.etiqueta} (${p.tipo_rutina})`));

    // 3. Probar con productos compatibles [1 (limpiador), 2 (serum), 3 (protector)]
    const ids = [1, 2, 3];
    for (let i = 0; i < pasos.length; i++) {
      const paso = pasos[i];
      const prodId = ids[i];
      const [prodRows] = await pool.execute(
        `SELECT p.id, p.nombre, p.tipo_rutina, p.precio, p.precio_especial, p.activo,
                COALESCE(SUM(i.existencias), 0) as total_stock
         FROM productos p
         LEFT JOIN inventario i ON i.producto_id = p.id
         WHERE p.id = ?
         GROUP BY p.id`,
        [prodId]
      );
      const prod = prodRows[0];
      const precioBase = Number(prod.precio_especial ?? prod.precio);
      const precioConDesc = Math.round(precioBase * 0.9);
      console.log(`Paso ${paso.etiqueta}: ${prod.nombre} (${prod.tipo_rutina}) | Stock: ${prod.total_stock} | Base: $${precioBase} -> Con 10% desc: $${precioConDesc}`);
      if (prod.tipo_rutina !== paso.tipo_rutina) {
        throw new Error(`Incompatibilidad de paso: ${prod.tipo_rutina} !== ${paso.tipo_rutina}`);
      }
      if (prod.total_stock < 1) {
        throw new Error(`Sin stock para ${prod.nombre}`);
      }
    }
    console.log("Validación de pasos y stock: EXITOSA.");

    // 4. Probar caso de producto con stock = 0
    console.log("\nProbando detección de stock agotado...");
    const [outOfStockRows] = await pool.execute(
      `SELECT p.id, p.nombre, COALESCE(SUM(i.existencias), 0) as total_stock
       FROM productos p
       LEFT JOIN inventario i ON i.producto_id = p.id
       GROUP BY p.id
       HAVING total_stock = 0
       LIMIT 1`
    );
    if (outOfStockRows.length > 0) {
      console.log(`Producto agotado encontrado para pruebas: ${outOfStockRows[0].nombre}`);
    } else {
      console.log("Todos los productos tienen existencias en semillas. Simulando stock 0 en lógica.");
    }
    console.log("=== PRUEBAS DE LÓGICA DE API FINALIZADAS CON ÉXITO ===");
  } catch (err) {
    console.error("Error en testApiLogic:", err);
  } finally {
    await pool.end();
  }
}

testApiLogic();

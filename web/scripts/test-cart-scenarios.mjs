import mysql from "mysql2/promise";

const dbConfig = {
  host: "127.0.0.1",
  port: 3306,
  user: "root",
  password: "",
  database: "technova_derm",
};

async function runTests() {
  console.log("=== INICIANDO PRUEBAS DEL MOTOR DEL CARRITO (calcularCarrito) ===\n");
  const connection = await mysql.createConnection(dbConfig);

  try {
    // 0. Preparar carrito de prueba
    const testToken = "test_cart_token_" + Date.now();
    const [cartRes] = await connection.execute(
      "INSERT INTO carritos (token_invitado, actualizado_en) VALUES (?, NOW())",
      [testToken]
    );
    const cartId = cartRes.insertId;
    console.log(`Carrito de prueba creado con ID: ${cartId}`);

    // Obtener los 3 productos de los pasos de la rutina "manana" (1: limpiador, 2: serum, 3: protector)
    const [prods] = await connection.execute(
      `SELECT p.id, p.nombre, p.tipo_rutina, p.precio, p.precio_especial, COALESCE(SUM(i.existencias), 0) as stock
       FROM productos p
       JOIN inventario i ON i.producto_id = p.id
       WHERE p.id IN (1, 2, 3)
       GROUP BY p.id
       ORDER BY FIELD(p.id, 1, 2, 3)`
    );

    if (prods.length < 3) {
      throw new Error("No se encontraron los productos 1, 2 y 3 para la rutina.");
    }

    const p1 = prods[0];
    const p2 = prods[1];
    const p3 = prods[2];
    console.log(`Productos seleccionados:
      - 1: ${p1.nombre} [${p1.tipo_rutina}] ($${p1.precio_especial ?? p1.precio})
      - 2: ${p2.nombre} [${p2.tipo_rutina}] ($${p2.precio_especial ?? p2.precio})
      - 3: ${p3.nombre} [${p3.tipo_rutina}] ($${p3.precio_especial ?? p3.precio})`);

    // Importar dinámicamente calcularCarrito
    const { calcularCarrito } = await import("../src/lib/carrito.ts");

    // =========================================================================
    // PRUEBA 1: Rutina completa de 3 pasos con 10% de descuento
    // =========================================================================
    console.log("\n--- PRUEBA 1: Rutina completa de 3 productos con 10% de descuento ---");
    const grupoId = "rutina_test_" + Date.now();
    const grupoTipo = "rutina";
    const grupoClave = "manana";
    const descPct = 10;

    const [i1] = await connection.execute(
      `INSERT INTO carrito_items 
       (carrito_id, producto_id, cantidad, precio_unitario_al_agregar, grupo_id, grupo_tipo, grupo_clave, descuento_porcentaje, canal_origen)
       VALUES (?, ?, 1, ?, ?, ?, ?, ?, 'web')`,
      [cartId, p1.id, p1.precio_especial ?? p1.precio, grupoId, grupoTipo, grupoClave, descPct]
    );
    const [i2] = await connection.execute(
      `INSERT INTO carrito_items 
       (carrito_id, producto_id, cantidad, precio_unitario_al_agregar, grupo_id, grupo_tipo, grupo_clave, descuento_porcentaje, canal_origen)
       VALUES (?, ?, 1, ?, ?, ?, ?, ?, 'web')`,
      [cartId, p2.id, p2.precio_especial ?? p2.precio, grupoId, grupoTipo, grupoClave, descPct]
    );
    const [i3] = await connection.execute(
      `INSERT INTO carrito_items 
       (carrito_id, producto_id, cantidad, precio_unitario_al_agregar, grupo_id, grupo_tipo, grupo_clave, descuento_porcentaje, canal_origen)
       VALUES (?, ?, 1, ?, ?, ?, ?, ?, 'web')`,
      [cartId, p3.id, p3.precio_especial ?? p3.precio, grupoId, grupoTipo, grupoClave, descPct]
    );

    let resCalculo = await calcularCarrito(cartId);
    console.log(`Total items: ${resCalculo.totalItems} (Esperado: 3)`);
    console.log(`Grupos: ${resCalculo.grupos.length} (Esperado: 1)`);
    console.log(`Descuento aplicado: ${resCalculo.grupos[0]?.descuentoAplicado} (Esperado: true)`);
    console.log(`Total Descuentos: $${resCalculo.totalDescuentos} (Esperado > 0)`);
    console.log(`Total a pagar: $${resCalculo.total}`);

    if (
      resCalculo.totalItems === 3 &&
      resCalculo.grupos[0]?.descuentoAplicado === true &&
      resCalculo.totalDescuentos > 0
    ) {
      console.log("✓ PRUEBA 1 PASÓ EXITOSAMENTE.");
    } else {
      throw new Error("FALLÓ PRUEBA 1");
    }

    // =========================================================================
    // PRUEBA 2: Quitar un paso (soft delete) -> Pierde descuento y sugiere recuperación
    // =========================================================================
    console.log("\n--- PRUEBA 2: Quitar un paso (soft delete) y verificar pérdida de descuento ---");
    const item3Id = i3.insertId;
    await connection.execute(
      "UPDATE carrito_items SET eliminado_en = NOW() WHERE id = ?",
      [item3Id]
    );

    resCalculo = await calcularCarrito(cartId);
    console.log(`Total items activos: ${resCalculo.totalItems} (Esperado: 2)`);
    console.log(`Descuento aplicado: ${resCalculo.grupos[0]?.descuentoAplicado} (Esperado: false)`);
    console.log(`Mensaje faltante: "${resCalculo.grupos[0]?.mensajeFaltante}"`);
    console.log(`Producto faltante sugerido: ${resCalculo.grupos[0]?.productoFaltante?.nombre}`);

    if (
      resCalculo.totalItems === 2 &&
      resCalculo.grupos[0]?.descuentoAplicado === false &&
      resCalculo.grupos[0]?.productoFaltante?.id === p3.id
    ) {
      console.log("✓ PRUEBA 2 (Pérdida de descuento y sugerencia de re-adición) PASÓ.");
    } else {
      throw new Error("FALLÓ PRUEBA 2");
    }

    // =========================================================================
    // PRUEBA 3: Deshacer eliminación (Restaurar) -> Recupera el descuento
    // =========================================================================
    console.log("\n--- PRUEBA 3: Deshacer eliminación (Restaurar item) ---");
    await connection.execute(
      "UPDATE carrito_items SET eliminado_en = NULL WHERE id = ?",
      [item3Id]
    );

    resCalculo = await calcularCarrito(cartId);
    console.log(`Total items activos: ${resCalculo.totalItems} (Esperado: 3)`);
    console.log(`Descuento aplicado: ${resCalculo.grupos[0]?.descuentoAplicado} (Esperado: true)`);
    if (resCalculo.totalItems === 3 && resCalculo.grupos[0]?.descuentoAplicado === true) {
      console.log("✓ PRUEBA 3 (Restaurar y recuperar descuento) PASÓ.");
    } else {
      throw new Error("FALLÓ PRUEBA 3");
    }

    // =========================================================================
    // PRUEBA 4: Subir cantidad de 1 producto -> Descuento solo a juegos completos
    // =========================================================================
    console.log("\n--- PRUEBA 4: Subir cantidad de producto 1 a 2 (Descuento solo a juego completo = 1) ---");
    const item1Id = i1.insertId;
    await connection.execute("UPDATE carrito_items SET cantidad = 2 WHERE id = ?", [item1Id]);

    resCalculo = await calcularCarrito(cartId);
    console.log(`Total items: ${resCalculo.totalItems} (Esperado: 4)`);
    console.log(`Juegos completos con descuento: ${resCalculo.grupos[0]?.juegosCompletos} (Esperado: 1)`);
    const precio1Juego =
      Number(p1.precio_especial ?? p1.precio) +
      Number(p2.precio_especial ?? p2.precio) +
      Number(p3.precio_especial ?? p3.precio);
    const descEsperado = Math.round(precio1Juego * 0.1);
    console.log(`Monto descuento calculado: $${resCalculo.totalDescuentos} (Esperado: $${descEsperado})`);

    if (
      resCalculo.grupos[0]?.juegosCompletos === 1 &&
      resCalculo.totalDescuentos === descEsperado
    ) {
      console.log("✓ PRUEBA 4 (Descuento solo para juegos completos) PASÓ.");
    } else {
      throw new Error("FALLÓ PRUEBA 4");
    }

    // =========================================================================
    // PRUEBA 5: Detección de cambio de precio
    // =========================================================================
    console.log("\n--- PRUEBA 5: Detección de cambio de precio ---");
    // Modificar precio_unitario_al_agregar del item 2 para simular precio anterior diferente
    const precioAntiguo = Number(p2.precio_especial ?? p2.precio) + 50;
    await connection.execute(
      "UPDATE carrito_items SET precio_unitario_al_agregar = ? WHERE id = ?",
      [precioAntiguo, i2.insertId]
    );

    resCalculo = await calcularCarrito(cartId);
    const itemModificado = resCalculo.items.find((i) => i.id === i2.insertId);
    console.log(`Cambio detectado:`, itemModificado?.cambioPrecio);
    if (
      itemModificado?.cambioPrecio &&
      itemModificado.cambioPrecio.antes === precioAntiguo &&
      itemModificado.cambioPrecio.ahora === Math.round(itemModificado.precio_vigente * 0.9)
    ) {
      console.log("✓ PRUEBA 5 (Detección de cambio de precio) PASÓ.");
    } else {
      throw new Error("FALLÓ PRUEBA 5");
    }

    // =========================================================================
    // PRUEBA 6: Stock insuficiente y agotado bloquean checkout
    // =========================================================================
    console.log("\n--- PRUEBA 6: Stock insuficiente / agotado y exclusión de total ---");
    // Forzar cantidad superior al stock
    await connection.execute("UPDATE carrito_items SET cantidad = 9999 WHERE id = ?", [item1Id]);
    resCalculo = await calcularCarrito(cartId);
    console.log(`hayInsuficientes: ${resCalculo.hayInsuficientes} (Esperado: true)`);
    if (resCalculo.hayInsuficientes) {
      console.log("✓ PRUEBA 6 (Insuficientes detectados correctamente) PASÓ.");
    } else {
      throw new Error("FALLÓ PRUEBA 6");
    }

    // Limpieza del carrito de prueba
    await connection.execute("DELETE FROM carrito_items WHERE carrito_id = ?", [cartId]);
    await connection.execute("DELETE FROM carritos WHERE id = ?", [cartId]);
    console.log("\n✓ Limpieza completada. TODAS LAS PRUEBAS PASARON SATISFACTORIAMENTE.\n");
  } catch (err) {
    console.error("ERROR EN PRUEBAS:", err);
    process.exit(1);
  } finally {
    try {
      const { getDbPool } = await import("../src/lib/db.ts");
      await getDbPool().end();
    } catch {}
    await connection.end();
  }
}

runTests();

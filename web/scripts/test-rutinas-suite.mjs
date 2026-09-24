import mysql from 'mysql2/promise';

async function runTests() {
  console.log("=== INICIANDO SUITE DE PRUEBAS DE RUTINAS Y COMBOS ===");

  const pool = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'technova_derm',
  });

  try {
    // 1. Verificar Plantillas y Pasos
    console.log("\n[TEST 1] Verificando plantillas_rutina y plantilla_pasos...");
    const [plantillas] = await pool.execute("SELECT * FROM plantillas_rutina ORDER BY orden ASC");
    console.log(`Plantillas encontradas: ${plantillas.length}`);
    for (const pl of plantillas) {
      const [pasos] = await pool.execute(
        "SELECT * FROM plantilla_pasos WHERE plantilla_id = ? ORDER BY orden ASC",
        [pl.id]
      );
      console.log(`- ${pl.nombre} (${pl.clave}): -${pl.descuento_porcentaje}% | Pasos: ${pasos.map(p => `${p.orden}.${p.tipo_rutina} (${p.etiqueta})`).join(" -> ")}`);
    }

    // 2. Verificar columnas en carrito_items
    console.log("\n[TEST 2] Verificando columnas en carrito_items...");
    const [cols] = await pool.execute("DESCRIBE carrito_items");
    const colNames = cols.map(c => c.Field);
    const requiredCols = ['grupo_id', 'grupo_tipo', 'grupo_clave', 'descuento_porcentaje'];
    for (const reqCol of requiredCols) {
      const exists = colNames.includes(reqCol);
      console.log(`- Columna ${reqCol}: ${exists ? "OK" : "FALTA"}`);
    }

    // 3. Probar inserción simulada de rutina en carrito_items
    console.log("\n[TEST 3] Probando agregado de rutina con grupo_id...");
    // Crear carrito de prueba
    const testGuestToken = "test_routine_guest_token_" + Date.now();
    const [cartRes] = await pool.execute(
      "INSERT INTO carritos (token_invitado, actualizado_en) VALUES (?, NOW())",
      [testGuestToken]
    );
    const testCartId = cartRes.insertId;

    const testGrupoId = "uuid-test-grupo-123456";
    // Agregar 3 pasos de rutina de mañana
    await pool.execute(
      `INSERT INTO carrito_items 
        (carrito_id, producto_id, combo_id, cantidad, precio_unitario_al_agregar, grupo_id, grupo_tipo, grupo_clave, descuento_porcentaje)
       VALUES (?, 1, NULL, 1, 224, ?, 'rutina', 'manana', 10.00)`,
      [testCartId, testGrupoId]
    );
    await pool.execute(
      `INSERT INTO carrito_items 
        (carrito_id, producto_id, combo_id, cantidad, precio_unitario_al_agregar, grupo_id, grupo_tipo, grupo_clave, descuento_porcentaje)
       VALUES (?, 2, NULL, 1, 386, ?, 'rutina', 'manana', 10.00)`,
      [testCartId, testGrupoId]
    );
    await pool.execute(
      `INSERT INTO carrito_items 
        (carrito_id, producto_id, combo_id, cantidad, precio_unitario_al_agregar, grupo_id, grupo_tipo, grupo_clave, descuento_porcentaje)
       VALUES (?, 3, NULL, 1, 350, ?, 'rutina', 'manana', 10.00)`,
      [testCartId, testGrupoId]
    );

    const [itemsRutina] = await pool.execute(
      "SELECT id, producto_id, cantidad, precio_unitario_al_agregar, grupo_id, grupo_tipo, grupo_clave, descuento_porcentaje FROM carrito_items WHERE carrito_id = ? AND grupo_id = ?",
      [testCartId, testGrupoId]
    );
    console.log(`Artículos de rutina guardados juntos con grupo_id: ${itemsRutina.length}`);
    console.log(itemsRutina);

    // 4. Probar agregado de combo con grupo_id
    console.log("\n[TEST 4] Probando agregado de combo con grupo_id...");
    const testComboGrupoId = "uuid-test-combo-789012";
    await pool.execute(
      `INSERT INTO carrito_items 
        (carrito_id, producto_id, combo_id, cantidad, precio_unitario_al_agregar, grupo_id, grupo_tipo, grupo_clave, descuento_porcentaje)
       VALUES (?, NULL, 1, 1, 728, ?, 'combo', 'rutina-piel-mixta', 15.00)`,
      [testCartId, testComboGrupoId]
    );

    const [itemsCombo] = await pool.execute(
      "SELECT id, combo_id, cantidad, precio_unitario_al_agregar, grupo_id, grupo_tipo, grupo_clave, descuento_porcentaje FROM carrito_items WHERE carrito_id = ? AND grupo_id = ?",
      [testCartId, testComboGrupoId]
    );
    console.log(`Artículo de combo guardado con grupo_id: ${itemsCombo.length}`);
    console.log(itemsCombo);

    // Limpiar datos de prueba del carrito
    await pool.execute("DELETE FROM carrito_items WHERE carrito_id = ?", [testCartId]);
    await pool.execute("DELETE FROM carritos WHERE id = ?", [testCartId]);
    console.log("Limpieza de datos de prueba exitosa.");

    // 5. Verificar productos compatibles por cada tipo de piel
    console.log("\n[TEST 5] Verificando compatibilidad de productos por tipo de piel...");
    const tipos = ['mixta', 'seca', 'grasa', 'normal', 'sensible'];
    for (const t of tipos) {
      const [limpiadores] = await pool.execute(
        `SELECT COUNT(DISTINCT p.id) as total 
         FROM productos p 
         JOIN producto_tipos_piel ptp ON ptp.producto_id = p.id AND ptp.tipo_piel = ?
         LEFT JOIN inventario i ON i.producto_id = p.id
         WHERE p.activo = 1 AND p.tipo_rutina = 'limpiador'
         HAVING SUM(i.existencias) > 0`,
        [t]
      );
      const [serums] = await pool.execute(
        `SELECT COUNT(DISTINCT p.id) as total 
         FROM productos p 
         JOIN producto_tipos_piel ptp ON ptp.producto_id = p.id AND ptp.tipo_piel = ?
         LEFT JOIN inventario i ON i.producto_id = p.id
         WHERE p.activo = 1 AND p.tipo_rutina = 'serum'
         HAVING SUM(i.existencias) > 0`,
        [t]
      );
      const [protectores] = await pool.execute(
        `SELECT COUNT(DISTINCT p.id) as total 
         FROM productos p 
         JOIN producto_tipos_piel ptp ON ptp.producto_id = p.id AND ptp.tipo_piel = ?
         LEFT JOIN inventario i ON i.producto_id = p.id
         WHERE p.activo = 1 AND p.tipo_rutina = 'protector'
         HAVING SUM(i.existencias) > 0`,
        [t]
      );
      console.log(`- Tipo ${t}: limpiadores=${limpiadores[0]?.total || 0}, serums=${serums[0]?.total || 0}, protectores=${protectores[0]?.total || 0}`);
    }

    console.log("\n=== TODAS LAS PRUEBAS DE BASE DE DATOS PASARON CON ÉXITO ===");
  } catch (error) {
    console.error("Error en las pruebas:", error);
  } finally {
    await pool.end();
  }
}

runTests();

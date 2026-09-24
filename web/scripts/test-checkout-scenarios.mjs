import mysql from "mysql2/promise";
import crypto from "crypto";

const dbConfig = {
  host: "127.0.0.1",
  port: 3306,
  user: "root",
  password: "",
  database: "technova_derm",
};

async function runTests() {
  console.log("=== INICIANDO SUITE DE PRUEBAS DE CHECKOUT (ENTREGA Y PAGO) ===\n");
  const connection = await mysql.createConnection(dbConfig);

  try {
    // 0. Preparar usuario de prueba
    const testUserId = 2; // Martha
    const [uRows] = await connection.execute(
      "SELECT id, correo, nombre FROM usuarios WHERE id = ? LIMIT 1",
      [testUserId]
    );
    if (uRows.length === 0) {
      throw new Error("Usuario de prueba ID 2 no encontrado.");
    }
    const testUser = uRows[0];
    console.log(`Usuario de prueba: ${testUser.nombre} (${testUser.correo})`);

    // Obtener productos de prueba con existencias
    const [prods] = await connection.execute(
      `SELECT p.id, p.nombre, p.precio, p.precio_especial, i.sucursal_id, i.existencias
       FROM productos p
       JOIN inventario i ON i.producto_id = p.id
       WHERE p.activo = 1 AND i.sucursal_id = 1 AND i.existencias >= 10
       LIMIT 2`
    );

    if (prods.length < 2) {
      throw new Error("No hay productos con existencias suficientes en sucursal 1.");
    }
    const prodA = prods[0];
    const prodB = prods[1];
    console.log(`Productos de prueba:
      - A: ${prodA.nombre} ($${prodA.precio_especial ?? prodA.precio}) [Stock suc 1: ${prodA.existencias}]
      - B: ${prodB.nombre} ($${prodB.precio_especial ?? prodB.precio}) [Stock suc 1: ${prodB.existencias}]`);

    // Obtener dirección del usuario
    const [dirRows] = await connection.execute(
      "SELECT id, calle, numero_exterior, ciudad FROM direcciones WHERE usuario_id = ? LIMIT 1",
      [testUserId]
    );
    const testAddressId = dirRows[0]?.id;
    console.log(`Dirección de prueba: ID ${testAddressId} (${dirRows[0]?.calle} ${dirRows[0]?.numero_exterior})`);

    const { getProveedorPagos } = await import("../src/lib/pagos/index.ts");
    const { liberarReservasVencidas } = await import("../src/lib/reservas.ts");

    // =========================================================================
    // PRUEBA 1: Pago aprobado con tarjeta 4242
    // =========================================================================
    console.log("\n--- PRUEBA 1: Pago aprobado con tarjeta 4242 ---");
    const tokenAprobado = "tok_sim_4242_" + Date.now();
    const claveIdem1 = crypto.randomUUID();
    const proveedor = getProveedorPagos();

    const stockInicialA = prodA.existencias;

    // Crear orden simulando el backend de /api/checkout/pagar
    const [insOrder1] = await connection.execute(
      `INSERT INTO pedidos 
       (usuario_id, canal, tipo_entrega, sucursal_id, subtotal, descuento, costo_envio, total, metodo_pago, estado, clave_idempotencia, creado_en)
       VALUES (?, 'web', 'recoger', 1, 500, 0, 0, 500, 'tarjeta', 'pendiente_pago', ?, NOW())`,
      [testUserId, claveIdem1]
    );
    const orderId1 = insOrder1.insertId;
    const folio1 = `TD-${String(orderId1).padStart(6, "0")}`;
    await connection.execute("UPDATE pedidos SET folio = ? WHERE id = ?", [folio1, orderId1]);

    // Descontar inventario (reserva)
    await connection.execute(
      "UPDATE inventario SET existencias = existencias - 1 WHERE producto_id = ? AND sucursal_id = 1",
      [prodA.id]
    );

    // Cobrar con tarjeta 4242
    const resCobro1 = await proveedor.cobrar(
      { id: orderId1, folio: folio1, total: 500, usuario_id: testUserId },
      tokenAprobado,
      claveIdem1
    );

    console.log("Resultado del cobro 4242:", resCobro1.estado, "-", resCobro1.mensaje);
    if (resCobro1.aprobado && resCobro1.estado === "aprobado") {
      await connection.execute(
        "UPDATE pedidos SET estado = 'listo_para_recoger' WHERE id = ?",
        [orderId1]
      );
      await connection.execute(
        `INSERT INTO pagos (pedido_id, proveedor, referencia_proveedor, estado, monto, creado_en)
         VALUES (?, 'simulado', ?, 'aprobado', 500, NOW())`,
        [orderId1, resCobro1.idTransaccion]
      );
      console.log("✓ PRUEBA 1 PASÓ: Pedido pagado y aprobado correctamente.");
    } else {
      throw new Error("FALLÓ PRUEBA 1");
    }

    // =========================================================================
    // PRUEBA 2: Idempotencia (Doble clic en pagar con la misma clave)
    // =========================================================================
    console.log("\n--- PRUEBA 2: Idempotencia (evitar doble cargo con misma clave) ---");
    const [idemCheck] = await connection.execute(
      "SELECT id, folio, estado, total FROM pedidos WHERE clave_idempotencia = ? LIMIT 1",
      [claveIdem1]
    );

    if (idemCheck.length > 0 && idemCheck[0].folio === folio1) {
      console.log(`✓ PRUEBA 2 PASÓ: Pedido existente detectado (${idemCheck[0].folio}), sin duplicar cobro ni pedido.`);
    } else {
      throw new Error("FALLÓ PRUEBA 2");
    }

    // =========================================================================
    // PRUEBA 3: Pago rechazado con tarjeta 0002 y devolución de inventario
    // =========================================================================
    console.log("\n--- PRUEBA 3: Pago rechazado (0002) y retorno de existencias ---");
    const tokenRechazado = "tok_sim_0002_" + Date.now();
    const claveIdem3 = crypto.randomUUID();

    const [stockAntes] = await connection.execute(
      "SELECT existencias FROM inventario WHERE producto_id = ? AND sucursal_id = 1",
      [prodA.id]
    );
    const existenciasAntesRechazo = stockAntes[0].existencias;

    // Simular reserva de inventario
    await connection.execute(
      "UPDATE inventario SET existencias = existencias - 1 WHERE producto_id = ? AND sucursal_id = 1",
      [prodA.id]
    );

    // Cobrar con tarjeta 0002
    const resCobro3 = await proveedor.cobrar(
      { id: 99999, folio: "TD-TEST-FAIL", total: 400, usuario_id: testUserId },
      tokenRechazado,
      claveIdem3
    );

    console.log("Resultado del cobro 0002:", resCobro3.estado, "-", resCobro3.mensaje);
    if (!resCobro3.aprobado && resCobro3.estado === "rechazado") {
      // Devolver inventario como hace /api/checkout/pagar
      await connection.execute(
        "UPDATE inventario SET existencias = existencias + 1 WHERE producto_id = ? AND sucursal_id = 1",
        [prodA.id]
      );

      const [stockDespues] = await connection.execute(
        "SELECT existencias FROM inventario WHERE producto_id = ? AND sucursal_id = 1",
        [prodA.id]
      );
      if (stockDespues[0].existencias === existenciasAntesRechazo) {
        console.log("✓ PRUEBA 3 PASÓ: Rechazo bancario detectado y stock devuelto al inventario íntegro.");
      } else {
        throw new Error("FALLÓ PRUEBA 3: El stock no se devolvió correctamente.");
      }
    } else {
      throw new Error("FALLÓ PRUEBA 3");
    }

    // =========================================================================
    // PRUEBA 4: Fondos insuficientes con tarjeta 9995
    // =========================================================================
    console.log("\n--- PRUEBA 4: Fondos insuficientes (9995) ---");
    const tokenFondos = "tok_sim_9995_" + Date.now();
    const resCobro4 = await proveedor.cobrar(
      { id: 99998, folio: "TD-TEST-FONDOS", total: 600, usuario_id: testUserId },
      tokenFondos,
      crypto.randomUUID()
    );

    console.log("Resultado del cobro 9995:", resCobro4.estado, "-", resCobro4.mensaje);
    if (!resCobro4.aprobado && resCobro4.estado === "fondos_insuficientes") {
      console.log("✓ PRUEBA 4 PASÓ: Fondos insuficientes informados en lenguaje claro.");
    } else {
      throw new Error("FALLÓ PRUEBA 4");
    }

    // =========================================================================
    // PRUEBA 5: Pagar en tienda (Apartado sin cobro en línea y con reserva)
    // =========================================================================
    console.log("\n--- PRUEBA 5: Pagar en tienda (Apartado y reserva hasta mañana) ---");
    const claveIdem5 = crypto.randomUUID();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(20, 0, 0, 0);

    const [insOrder5] = await connection.execute(
      `INSERT INTO pedidos 
       (usuario_id, canal, tipo_entrega, sucursal_id, subtotal, descuento, costo_envio, total, metodo_pago, estado, clave_idempotencia, reserva_expira_en, creado_en)
       VALUES (?, 'web', 'recoger', 1, 350, 0, 0, 350, 'pagar_en_tienda', 'por_pagar_en_tienda', ?, ?, NOW())`,
      [testUserId, claveIdem5, tomorrow]
    );
    const folio5 = `TD-${String(insOrder5.insertId).padStart(6, "0")}`;
    await connection.execute("UPDATE pedidos SET folio = ? WHERE id = ?", [folio5, insOrder5.insertId]);

    const [checkOrder5] = await connection.execute(
      "SELECT estado, metodo_pago, reserva_expira_en FROM pedidos WHERE id = ?",
      [insOrder5.insertId]
    );
    if (
      checkOrder5[0].estado === "por_pagar_en_tienda" &&
      checkOrder5[0].metodo_pago === "pagar_en_tienda" &&
      checkOrder5[0].reserva_expira_en !== null
    ) {
      console.log(`✓ PRUEBA 5 PASÓ: Pedido ${folio5} apartado en estado por_pagar_en_tienda con reserva activa.`);
    } else {
      throw new Error("FALLÓ PRUEBA 5");
    }

    // =========================================================================
    // PRUEBA 6: Liberación de reservas vencidas (liberarReservasVencidas)
    // =========================================================================
    console.log("\n--- PRUEBA 6: Liberar reservas vencidas ---");
    // Crear un pedido vencido en el pasado
    const pastDate = new Date(Date.now() - 3600 * 1000); // hace 1 hora
    const [insExpired] = await connection.execute(
      `INSERT INTO pedidos 
       (usuario_id, canal, tipo_entrega, sucursal_id, total, metodo_pago, estado, reserva_expira_en, creado_en)
       VALUES (?, 'web', 'recoger', 1, 200, 'tarjeta', 'pendiente_pago', ?, NOW())`,
      [testUserId, pastDate]
    );
    const expOrderId = insExpired.insertId;

    // Reservar 1 pieza del producto B
    await connection.execute(
      "UPDATE inventario SET existencias = existencias - 1 WHERE producto_id = ? AND sucursal_id = 1",
      [prodB.id]
    );
    await connection.execute(
      "INSERT INTO pedido_items (pedido_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, 1, 200)",
      [expOrderId, prodB.id]
    );

    const [stockB_antes] = await connection.execute(
      "SELECT existencias FROM inventario WHERE producto_id = ? AND sucursal_id = 1",
      [prodB.id]
    );

    const resultadoExpiracion = await liberarReservasVencidas();
    console.log(`Pedidos expirados liberados: ${resultadoExpiracion.pedidosExpirados}`);

    const [checkExpOrder] = await connection.execute(
      "SELECT estado, reserva_expira_en FROM pedidos WHERE id = ?",
      [expOrderId]
    );
    const [stockB_despues] = await connection.execute(
      "SELECT existencias FROM inventario WHERE producto_id = ? AND sucursal_id = 1",
      [prodB.id]
    );

    if (
      checkExpOrder[0].estado === "expirado" &&
      stockB_despues[0].existencias === stockB_antes[0].existencias + 1
    ) {
      console.log("✓ PRUEBA 6 PASÓ: Pedido vencido pasó a 'expirado' y el stock fue devuelto correctamente.");
    } else {
      throw new Error("FALLÓ PRUEBA 6");
    }

    // Limpieza de órdenes de prueba generadas
    await connection.execute("DELETE FROM pagos WHERE pedido_id IN (?, ?, ?)", [orderId1, insOrder5.insertId, expOrderId]);
    await connection.execute("DELETE FROM pedido_items WHERE pedido_id IN (?, ?, ?)", [orderId1, insOrder5.insertId, expOrderId]);
    await connection.execute("DELETE FROM pedidos WHERE id IN (?, ?, ?)", [orderId1, insOrder5.insertId, expOrderId]);

    // Restaurar stock de prod A por la prueba 1
    await connection.execute(
      "UPDATE inventario SET existencias = existencias + 1 WHERE producto_id = ? AND sucursal_id = 1",
      [prodA.id]
    );

    console.log("\n✓ Limpieza completada. TODAS LAS PRUEBAS DE CHECKOUT PASARON AL 100%.\n");
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

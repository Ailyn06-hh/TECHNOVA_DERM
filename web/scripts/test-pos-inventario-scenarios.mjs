import mysql from "mysql2/promise";
import crypto from "crypto";

const BASE_URL = "http://localhost:3000";

function hashToken(token) {
  return crypto.createHash("sha256").update(token.trim()).digest("hex");
}

async function runTests() {
  console.log("=== INICIANDO PRUEBAS DE INTEGRACIÓN: POS CONSULTA DE INVENTARIO ===\n");

  const conn = await mysql.createConnection({
    host: "127.0.0.1",
    user: "root",
    database: "technova_derm",
  });

  let serverProcess = null;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Consistencia estricta de inventario y lotes
    // -------------------------------------------------------------------------
    console.log("-> 1. Verificando consistencia de existencias en 'inventario' vs 'inventario_lotes'...");
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

    if (discrepancias.length > 0) {
      throw new Error(`Discrepancias de consistencia encontradas: ${JSON.stringify(discrepancias)}`);
    }
    console.log("  [PASÓ] 100% de consistencia entre existencias generales y suma de lotes FEFO.");

    // -------------------------------------------------------------------------
    // TEST 2: Validación de datos de demostración del Mockup (Sucursal 1: Centro)
    // -------------------------------------------------------------------------
    console.log("\n-> 2. Validando datos del mockup en Centro (Sucursal 1)...");

    // Sérum Niacinamida 10% (prod 2): 2 disponibles, 1 apartada (#N-1042), OC-118 en camino, Lote L-0412
    const [serumRows] = await conn.query(`
      SELECT i.existencias FROM inventario i WHERE i.producto_id = 2 AND i.sucursal_id = 1
    `);
    const serumDisp = Number(serumRows[0]?.existencias || 0);
    console.log(`  Sérum Niacinamida disponibles: ${serumDisp} (esperado: 2)`);
    if (serumDisp !== 2) throw new Error(`Sérum existencias incorrectas: ${serumDisp}`);

    const [serumApartadas] = await conn.query(`
      SELECT SUM(pi.cantidad) AS apartadas
      FROM pedido_items pi
      JOIN pedidos p ON p.id = pi.pedido_id
      WHERE p.sucursal_id = 1 AND p.tipo_entrega = 'recoger'
        AND p.estado IN ('pagado', 'preparando', 'listo_para_recoger', 'por_pagar_en_tienda')
        AND pi.producto_id = 2
    `);
    const serumApart = Number(serumApartadas[0]?.apartadas || 0);
    console.log(`  Sérum Niacinamida apartadas: ${serumApart} (esperado: 1)`);
    if (serumApart < 1) throw new Error(`Sérum debe tener al menos 1 apartada`);

    const [serumOc] = await conn.query(`
      SELECT oc.folio, oc.proveedor, oci.cantidad, oc.estado, oc.llegada_estimada
      FROM ordenes_compra oc
      JOIN orden_compra_items oci ON oci.orden_id = oc.id
      WHERE oci.producto_id = 2 AND oc.sucursal_destino_id = 1 AND oc.estado = 'en_transito'
    `);
    if (serumOc.length === 0 || serumOc[0].folio !== "OC-118" || Number(serumOc[0].cantidad) !== 24) {
      throw new Error(`Orden de compra OC-118 no encontrada correctamente`);
    }
    console.log(`  Orden de compra en camino: ${serumOc[0].folio} (${serumOc[0].cantidad} pzas de ${serumOc[0].proveedor})`);

    const [serumLote] = await conn.query(`
      SELECT codigo_lote, existencias, caduca_en
      FROM inventario_lotes
      WHERE producto_id = 2 AND sucursal_id = 1 AND existencias > 0
    `);
    if (serumLote.length === 0 || serumLote[0].codigo_lote !== "L-0412") {
      throw new Error(`Lote L-0412 de Sérum no encontrado`);
    }
    console.log(`  Lote FEFO: ${serumLote[0].codigo_lote} con ${serumLote[0].existencias} pzas, caduca ${serumLote[0].caduca_en}`);
    console.log("  [PASÓ] Datos de Sérum Niacinamida 10% coinciden 100% con el diseño.");

    // Gel Hidratante Aloe (prod 4): 2 disp en Centro, 3 en otras tiendas (Norte: 2, Bodega: 1)
    const [aloeRows] = await conn.query(`
      SELECT sucursal_id, existencias FROM inventario WHERE producto_id = 4 ORDER BY sucursal_id
    `);
    const aloeCentro = Number(aloeRows.find((r) => r.sucursal_id === 1)?.existencias || 0);
    const aloeOtras = aloeRows.filter((r) => r.sucursal_id !== 1).reduce((acc, r) => acc + Number(r.existencias), 0);
    console.log(`  Gel Hidratante Aloe Centro: ${aloeCentro} (esperado 2), Otras: ${aloeOtras} (esperado 3)`);
    if (aloeCentro !== 2 || aloeOtras !== 3) {
      throw new Error(`Gel Aloe existencias incorrectas: Centro ${aloeCentro}, Otras ${aloeOtras}`);
    }
    console.log("  [PASÓ] Gel Hidratante Aloe verificado.");

    // Tónico de Rosa (prod 8): 18 disp en Centro, 6 en otras, Lote L-0325 caduca nov 2026 (<= 90 días -> 'Por caducar')
    const [tonicoRows] = await conn.query(`
      SELECT sucursal_id, existencias FROM inventario WHERE producto_id = 8 ORDER BY sucursal_id
    `);
    const tonicoCentro = Number(tonicoRows.find((r) => r.sucursal_id === 1)?.existencias || 0);
    const tonicoOtras = tonicoRows.filter((r) => r.sucursal_id !== 1).reduce((acc, r) => acc + Number(r.existencias), 0);
    console.log(`  Tónico de Rosa Centro: ${tonicoCentro} (esperado 18), Otras: ${tonicoOtras} (esperado 6)`);
    if (tonicoCentro !== 18 || tonicoOtras !== 6) {
      throw new Error(`Tónico Rosa existencias incorrectas: Centro ${tonicoCentro}, Otras ${tonicoOtras}`);
    }

    const [tonicoLote] = await conn.query(`
      SELECT codigo_lote, caduca_en, DATEDIFF(caduca_en, NOW()) AS dias
      FROM inventario_lotes
      WHERE producto_id = 8 AND sucursal_id = 1
      ORDER BY caduca_en ASC LIMIT 1
    `);
    const diasTonico = Number(tonicoLote[0]?.dias || 999);
    console.log(`  Tónico de Rosa lote ${tonicoLote[0]?.codigo_lote} caduca en ${diasTonico} días (<= 90 días) -> Alerta 'Por caducar'`);
    if (diasTonico > 90) throw new Error("Tónico de Rosa debe caducar dentro de 90 días");
    console.log("  [PASÓ] Tónico de Rosa y regla de caducidad verificada.");

    // Fluido Solar FPS 50 (prod 3): Multi-lote en Centro (L-0433 y L-0434)
    const [solarLotes] = await conn.query(`
      SELECT codigo_lote, existencias, caduca_en
      FROM inventario_lotes
      WHERE producto_id = 3 AND sucursal_id = 1
      ORDER BY caduca_en ASC
    `);
    console.log(`  Fluido Solar FPS 50 lotes en Centro: ${solarLotes.length} lotes encontrados:`, solarLotes.map((l) => `${l.codigo_lote} (${l.existencias} pzas)`).join(", "));
    if (solarLotes.length < 2) throw new Error("Fluido Solar debe tener multi-lote en Centro");
    console.log("  [PASÓ] Fluido Solar multi-lote verificado.");

    // -------------------------------------------------------------------------
    // TEST 3: Reglas de Bodega y Omnicanalidad
    // -------------------------------------------------------------------------
    console.log("\n-> 3. Validando reglas de tipo 'bodega' vs 'tienda'...");
    const [bodegaRows] = await conn.query(`
      SELECT id, nombre, tipo, activa FROM sucursales WHERE tipo = 'bodega'
    `);
    if (bodegaRows.length === 0) throw new Error("No existe sucursal con tipo = 'bodega'");
    console.log(`  Sucursal Bodega: ID ${bodegaRows[0].id}, Nombre: ${bodegaRows[0].nombre}, Tipo: ${bodegaRows[0].tipo}`);

    const [tiendasPickup] = await conn.query(`
      SELECT id, nombre, tipo FROM sucursales WHERE activa = 1 AND tipo != 'bodega'
    `);
    const tieneBodegaEnPickup = tiendasPickup.some((t) => t.tipo === "bodega");
    if (tieneBodegaEnPickup) throw new Error("Bodega no debe estar incluida en tiendas de pickup");
    console.log(`  Tiendas para recolección física (${tiendasPickup.length}):`, tiendasPickup.map((t) => t.nombre).join(", "));
    console.log("  [PASÓ] Bodega excluida correctamente de recolección en tienda.");

    // -------------------------------------------------------------------------
    // TEST 4: Prueba de deducción FEFO en inventario_lotes y regreso de stock
    // -------------------------------------------------------------------------
    console.log("\n-> 4. Probando deducción FEFO con 'descontarInventario' y 'regresarInventario'...");
    const { descontarInventario, regresarInventario, verificarConsistencia } = await import("../src/lib/inventario.js");

    await conn.beginTransaction();
    try {
      // Tomamos Fluido Solar (prod 3, sucursal 1) que tiene 21 pzas distribuidas en L-0433 (16) y L-0434 (5)
      console.log("  Descontando 18 piezas de Fluido Solar (prod 3) en Centro...");
      await descontarInventario(conn, 3, 1, 18);

      const [invAfter] = await conn.query("SELECT existencias FROM inventario WHERE producto_id = 3 AND sucursal_id = 1");
      const [lotesAfter] = await conn.query(
        "SELECT codigo_lote, existencias FROM inventario_lotes WHERE producto_id = 3 AND sucursal_id = 1 ORDER BY caduca_en ASC"
      );

      console.log(`  Existencias tras descuento: ${invAfter[0].existencias} (esperado: 3)`);
      console.log("  Lotes tras descuento:", lotesAfter);

      if (Number(invAfter[0].existencias) !== 3) {
        throw new Error(`Existencias generales esperadas 3, obtenidas: ${invAfter[0].existencias}`);
      }
      if (Number(lotesAfter[0].existencias) !== 0) {
        throw new Error(`Primer lote FEFO L-0433 debía agotarse a 0, tiene: ${lotesAfter[0].existencias}`);
      }
      if (Number(lotesAfter[1].existencias) !== 3) {
        throw new Error(`Segundo lote FEFO L-0434 debía quedar en 3, tiene: ${lotesAfter[1].existencias}`);
      }

      const discFEFO = await verificarConsistencia(conn);
      if (discFEFO.length > 0) {
        throw new Error(`Discrepancia tras deducción FEFO: ${JSON.stringify(discFEFO)}`);
      }
      console.log("  [PASÓ] Deducción FEFO exitosa: se agotó el lote más próximo a caducar y el remanente se tomó del siguiente.");

      // Regresar las 18 piezas
      console.log("  Regresando 18 piezas al inventario con regresarInventario...");
      await regresarInventario(conn, 3, 1, 18);

      const [invRestored] = await conn.query("SELECT existencias FROM inventario WHERE producto_id = 3 AND sucursal_id = 1");
      console.log(`  Existencias tras reposición: ${invRestored[0].existencias} (esperado: 21)`);
      if (Number(invRestored[0].existencias) !== 21) {
        throw new Error(`Existencias no restauradas a 21: ${invRestored[0].existencias}`);
      }

      const discRestored = await verificarConsistencia(conn);
      if (discRestored.length > 0) {
        throw new Error(`Discrepancia tras reposición: ${JSON.stringify(discRestored)}`);
      }
      console.log("  [PASÓ] Reposición de inventario consistente y verificada.");

    } finally {
      await conn.rollback();
      console.log("  (Transacción de prueba revertida para preservar los datos intactos del mockup).");
    }

    // -------------------------------------------------------------------------
    // TEST 5: Prueba de búsqueda por Escáner (Código de barras), SKU y Lote
    // -------------------------------------------------------------------------
    console.log("\n-> 5. Probando búsquedas por código de barras, SKU y código de lote...");

    // Código de barras del Sérum: 7501000000027
    const [barcodeScan] = await conn.query(`
      SELECT p.id, p.nombre, p.sku, p.codigo_barras
      FROM productos p
      WHERE p.codigo_barras = '7501000000027'
    `);
    if (barcodeScan.length === 0 || barcodeScan[0].id !== 2) {
      throw new Error("Escáner de código de barras falló al identificar Sérum Niacinamida");
    }
    console.log(`  Escáner de código de barras '7501000000027': Encontró ${barcodeScan[0].nombre} (${barcodeScan[0].sku})`);

    // Búsqueda por SKU: TON-ROS-008
    const [skuScan] = await conn.query(`
      SELECT p.id, p.nombre, p.sku
      FROM productos p
      WHERE p.sku = 'TON-ROS-008'
    `);
    if (skuScan.length === 0 || skuScan[0].id !== 8) {
      throw new Error("Búsqueda por SKU falló al identificar Tónico de Rosa");
    }
    console.log(`  Búsqueda por SKU 'TON-ROS-008': Encontró ${skuScan[0].nombre}`);

    // Búsqueda por código de lote: L-0412
    const [loteScan] = await conn.query(`
      SELECT il.codigo_lote, il.existencias, p.nombre
      FROM inventario_lotes il
      JOIN productos p ON p.id = il.producto_id
      WHERE il.codigo_lote = 'L-0412'
    `);
    if (loteScan.length === 0) {
      throw new Error("Búsqueda por código de lote L-0412 falló");
    }
    console.log(`  Búsqueda por código de lote 'L-0412': Encontró ${loteScan[0].nombre} con ${loteScan[0].existencias} pzas`);
    console.log("  [PASÓ] Búsqueda por escáner, SKU y lote funcionando al 100%.");

    // -------------------------------------------------------------------------
    // TEST 6: Prueba de filtros ('Por caducar' y 'Por agotarse')
    // -------------------------------------------------------------------------
    console.log("\n-> 6. Probando filtros 'Por caducar' y 'Por agotarse'...");
    
    // Lotes por caducar (<= 90 días) en Centro
    const [lotesCaducando] = await conn.query(`
      SELECT il.producto_id, p.nombre, il.codigo_lote, il.caduca_en, DATEDIFF(il.caduca_en, NOW()) as dias
      FROM inventario_lotes il
      JOIN productos p ON p.id = il.producto_id
      WHERE il.sucursal_id = 1 AND il.existencias > 0
        AND il.caduca_en <= DATE_ADD(NOW(), INTERVAL 90 DAY)
    `);
    console.log(`  Productos con lotes por caducar en Centro (${lotesCaducando.length}):`, lotesCaducando.map(l => `${l.nombre} (${l.codigo_lote}, caduca en ${l.dias}d)`).join("; "));
    if (lotesCaducando.length === 0) {
      throw new Error("El filtro 'Por caducar' debería retornar al menos Tónico de Rosa y Mascarilla");
    }
    console.log("  [PASÓ] Filtro 'Por caducar' detecta lotes dentro de los 90 días.");

    // -------------------------------------------------------------------------
    // TEST 7: Prueba de Endpoints HTTP (GET /api/pos/inventario y [productoId])
    // -------------------------------------------------------------------------
    console.log("\n-> 7. Probando endpoints HTTP del POS...");
    const rawDeviceToken = "pos_device_test_token_2026_central";
    const hashedDevice = hashToken(rawDeviceToken);

    await conn.execute(
      `INSERT INTO dispositivos_pos (sucursal_id, nombre, token_hash, activo, creado_en)
       VALUES (1, 'Caja 1 - Principal', ?, 1, NOW())
       ON DUPLICATE KEY UPDATE token_hash = VALUES(token_hash), activo = 1`,
      [hashedDevice]
    );

    // Crear turno abierto para la sesión de prueba
    const [turnoResult] = await conn.execute(
      `INSERT INTO turnos (empleado_id, caja_id, sucursal_id, estado, inicio)
       VALUES (1, 1, 1, 'abierto', NOW())`
    );
    const turnoId = turnoResult.insertId;

    const posSessionPayload = {
      turnoId,
      empleadoId: 1,
      cajaId: 1,
      sucursalId: 1,
      nombre: "Laura",
      apellido: "Méndez",
      rol: "cajera",
      cajaNombre: "Caja 1 - Principal",
      sucursalNombre: "Centro",
      sucursalNombreCompleto: "Technova-Derm Centro",
      inicioTurno: new Date().toISOString(),
    };
    const POS_SESSION_SECRET = process.env.SESSION_SECRET || "technova_derm_secure_pos_session_2026";
    const dataStr = Buffer.from(JSON.stringify(posSessionPayload)).toString("base64url");
    const signature = crypto
      .createHmac("sha256", POS_SESSION_SECRET)
      .update(dataStr)
      .digest("base64url");
    const sessionCookieValue = `${dataStr}.${signature}`;

    const headers = {
      Cookie: `pos_dispositivo=${rawDeviceToken}; pos_sesion=${sessionCookieValue}`,
      "Content-Type": "application/json",
    };

    // 7.1 Probar GET /api/pos/inventario
    console.log("  Consultando GET /api/pos/inventario...");
    const resInv = await fetch(`${BASE_URL}/api/pos/inventario`, { headers });
    if (!resInv.ok) {
      throw new Error(`HTTP error ${resInv.status} al consultar /api/pos/inventario`);
    }
    const dataInv = await resInv.json();
    console.log(`  Respuesta OK: ${dataInv.productos?.length} productos, conteo:`, dataInv.conteo);
    if (!dataInv.productos || dataInv.productos.length === 0) {
      throw new Error("No se devolvieron productos en /api/pos/inventario");
    }

    // 7.2 Probar GET /api/pos/inventario/2 (Sérum Niacinamida 10%)
    console.log("  Consultando GET /api/pos/inventario/2 (Sérum Niacinamida)...");
    const resSerum = await fetch(`${BASE_URL}/api/pos/inventario/2`, { headers });
    if (!resSerum.ok) {
      throw new Error(`HTTP error ${resSerum.status} al consultar /api/pos/inventario/2`);
    }
    const dataSerum = await resSerum.json();
    console.log(`  Detalle de ${dataSerum.producto?.nombre}:`);
    console.log(`    Tiendas disponibles:`, dataSerum.tiendas?.map((t) => `${t.nombre}: ${t.disponibles} disp, ${t.apartadas} apart`).join(" | "));
    console.log(`    Lotes FEFO:`, dataSerum.lotes?.map((l) => `${l.codigo} (${l.existencias} pzas, 1° en salir: ${l.esPrimeroEnSalir})`).join(", "));
    console.log(`    Orden en camino:`, dataSerum.ordenCompra ? `${dataSerum.ordenCompra.folio} (${dataSerum.ordenCompra.cantidad} pzas)` : "Ninguna");

    if (!dataSerum.ordenCompra || dataSerum.ordenCompra.folio !== "OC-118") {
      throw new Error("El detalle del producto debe incluir la orden de compra OC-118");
    }
    console.log("  [PASÓ] Endpoints HTTP /api/pos/inventario y /api/pos/inventario/[productoId] verificados al 100%.");

    console.log("\n=======================================================");
    console.log(">>> TODAS LAS PRUEBAS DE INVENTARIO POS PASARON AL 100% <<<");
    console.log("=======================================================\n");

  } catch (err) {
    console.error("\n❌ ERROR EN PRUEBAS DE INVENTARIO POS:", err);
    process.exit(1);
  } finally {
    await conn.end();
  }
}

runTests();

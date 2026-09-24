import mysql from "mysql2/promise";
import crypto from "crypto";

const BASE_URL = "http://localhost:3000";

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.cookie ? { Cookie: options.cookie } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    redirect: "manual",
  });

  let json = null;
  let text = null;
  try {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      json = await res.json();
    } else {
      text = await res.text();
    }
  } catch {}

  const setCookies = res.headers.get("set-cookie") || "";
  return { status: res.status, headers: res.headers, data: json, text, setCookies };
}

function parseCookie(setCookieHeader, cookieName) {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(new RegExp(`${cookieName}=([^;]+)`));
  return match ? match[1] : null;
}

async function run() {
  console.log("===============================================================");
  console.log("SUITE DE PRUEBAS: POS NUEVA VENTA (TECHNOVA-DERM)");
  console.log("===============================================================");

  const pool = mysql.createPool({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    password: "",
    database: "technova_derm",
  });

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASÓ: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FALLÓ: ${message}`);
      failed++;
    }
  }

  try {
    // 0. Preparar entorno: Registrar terminal y abrir turno para Laura Méndez
    console.log("\n[Setup] Registro de terminal y apertura de turno...");
    // Resetear turnos previos
    await pool.execute("UPDATE turnos SET estado = 'cerrado', fin = NOW() WHERE estado = 'abierto'");
    await pool.execute("UPDATE codigos_registro_dispositivo SET usado_en = NULL");

    const regRes = await request("/api/pos/dispositivos/registrar", {
      method: "POST",
      body: { codigo: "POS-CENTRO-2026", nombre_dispositivo: "Caja Test Suite" },
    });
    const deviceToken = parseCookie(regRes.setCookies, "pos_dispositivo");
    assert(Boolean(deviceToken), "Dispositivo registrado con éxito y cookie obtenida");

    const cookieDev = `pos_dispositivo=${deviceToken}`;

    const shiftRes = await request("/api/pos/turnos/iniciar", {
      method: "POST",
      cookie: cookieDev,
      body: { caja_id: 1, empleado_id: 1, pin: "2580" },
    });
    const sessionToken = parseCookie(shiftRes.setCookies, "pos_sesion");
    assert(Boolean(sessionToken), "Turno iniciado con éxito y cookie pos_sesion obtenida");

    const fullCookie = `pos_dispositivo=${deviceToken}; pos_sesion=${sessionToken}`;

    // [Prueba 1] Consultar catálogo de productos en la sucursal del POS
    console.log("\n[Prueba 1] Catálogo de productos y existencias de la sucursal");
    const catRes = await request("/api/pos/productos?categoria=todos", {
      cookie: fullCookie,
    });
    assert(catRes.status === 200, "GET /api/pos/productos responde 200");
    assert(Array.isArray(catRes.data?.productos) && catRes.data.productos.length >= 30, "Retorna catálogo completo con más de 30 productos");
    const tonico = catRes.data.productos.find((p) => p.sku === "TON-ROS-008");
    assert(tonico && tonico.codigo_barras === "7501000000089", "Tónico de Rosa tiene código de barras EAN-13 asignado (7501000000089)");
    assert(tonico && tonico.precio_especial === 199 && tonico.precio === 249, "Tónico de Rosa tiene precio lista $249 y precio especial $199");

    // [Prueba 2] Catálogo pestaña Combos
    console.log("\n[Prueba 2] Pestaña Combos con cálculo de stock y precios de componentes");
    const combosRes = await request("/api/pos/productos?categoria=combos", {
      cookie: fullCookie,
    });
    assert(combosRes.status === 200, "GET /api/pos/productos?categoria=combos responde 200");
    assert(Array.isArray(combosRes.data?.combos) && combosRes.data.combos.length >= 3, "Retorna combos disponibles");
    const comboDuo = combosRes.data.combos.find((c) => c.slug === "duo-tonico-rosa");
    assert(comboDuo && comboDuo.descuento_porcentaje === 20, "Dúo Tónico Rosa tiene 20% de descuento configurado");

    // [Prueba 3] Obtener o crear venta actual en borrador
    console.log("\n[Prueba 3] Creación y persistencia de venta en borrador");
    const draftRes = await request("/api/pos/ventas/actual", {
      cookie: fullCookie,
    });
    assert(draftRes.status === 200, "GET /api/pos/ventas/actual responde 200");
    assert(Boolean(draftRes.data?.ticket?.id), "Ticket de venta creado con ID");
    assert(draftRes.data?.ticket?.folio?.startsWith("V-"), `Folio usa prefijo V- (${draftRes.data?.ticket?.folio})`);
    assert(draftRes.data?.ticket?.estado === "borrador", "Estado inicial es 'borrador'");

    const ventaId = draftRes.data.ticket.id;

    // [Prueba 4] Agregar producto con precio especial y verificar líneas de descuento
    console.log("\n[Prueba 4] Agregar producto con precio especial (Tónico de Rosa)");
    const addTonicoRes = await request(`/api/pos/ventas/${ventaId}/items`, {
      method: "PUT",
      cookie: fullCookie,
      body: { accion: "agregar", producto_id: tonico.id, cantidad: 1 },
    });
    assert(addTonicoRes.status === 200, "Artículo agregado al ticket");
    assert(addTonicoRes.data?.ticket?.items.length === 1, "Ticket contiene 1 renglón");
    assert(addTonicoRes.data?.ticket?.subtotal === 249, "Subtotal a precio de lista es $249");
    assert(addTonicoRes.data?.ticket?.totalDescuento === 50, "Total descuento es $50");
    assert(addTonicoRes.data?.ticket?.total === 199, "Total a pagar es $199");
    const descPE = addTonicoRes.data?.ticket?.lineasDescuento?.find((d) => d.tipo === "precio_especial");
    assert(descPE && descPE.monto === 50, "Línea de descuento específica: Tónico de Rosa · precio especial -$50");

    // [Prueba 5] Límite de stock: intentar pedir más de lo que hay en tienda
    console.log("\n[Prueba 5] Restricción de existencias en tienda");
    const [invTonico] = await pool.execute(
      "SELECT existencias FROM inventario WHERE producto_id = ? AND sucursal_id = 1",
      [tonico.id]
    );
    const stockActual = Number(invTonico[0]?.existencias || 0);

    const excesoRes = await request(`/api/pos/ventas/${ventaId}/items`, {
      method: "PUT",
      cookie: fullCookie,
      body: { accion: "agregar", producto_id: tonico.id, cantidad: stockActual + 10 },
    });
    assert(excesoRes.status === 400, "Rechaza exceder stock disponible");
    assert(excesoRes.data?.error?.includes("Solo hay"), "Muestra mensaje claro: 'Solo hay N en tienda'");

    // [Prueba 6] Agregar Combo y verificar agrupación y descuento de combo
    console.log("\n[Prueba 6] Agregar Combo y descuento como grupo");
    const addComboRes = await request(`/api/pos/ventas/${ventaId}/items`, {
      method: "PUT",
      cookie: fullCookie,
      body: { accion: "agregar_combo", combo_id: 2 }, // Dúo tónico rosa (prod 6 y 8)
    });
    assert(addComboRes.status === 200, "Combo agregado al ticket");
    const comboDescLine = addComboRes.data?.ticket?.lineasDescuento?.find((d) => d.tipo === "combo");
    assert(Boolean(comboDescLine), "Línea de descuento de combo generada");

    // [Prueba 7] Quitar un producto de combo: pierde el descuento de combo
    console.log("\n[Prueba 7] Integridad de combos: quitar componente anula descuento de combo");
    const itemComboParaQuitar = addComboRes.data?.ticket?.items.find((i) => i.grupo_tipo === "combo" && i.producto_id === 6);
    assert(Boolean(itemComboParaQuitar), "Encontrado componente del combo en ticket");

    const removeRes = await request(`/api/pos/ventas/${ventaId}/items`, {
      method: "PUT",
      cookie: fullCookie,
      body: { accion: "quitar", item_id: itemComboParaQuitar.id },
    });
    assert(removeRes.status === 200, "Componente quitado del ticket");
    const comboDescLineDespues = removeRes.data?.ticket?.lineasDescuento?.find((d) => d.tipo === "combo");
    assert(!comboDescLineDespues, "El combo incompleto ya no recibe el descuento de combo");

    // [Prueba 8] Búsqueda y asignación de clienta
    console.log("\n[Prueba 8] Asignar y desvincular clienta registrada");
    const searchClientRes = await request("/api/pos/clientes?q=Martha", {
      cookie: fullCookie,
    });
    assert(searchClientRes.status === 200, "Búsqueda de clienta responde 200");
    const martha = searchClientRes.data?.clientes?.find((c) => c.nombre.includes("Martha"));
    assert(martha && martha.celularEnmascarado.includes("***-***-"), "Celular de clienta enmascarado (***-***-XXXX)");

    const assignRes = await request(`/api/pos/ventas/${ventaId}/cliente`, {
      method: "PUT",
      cookie: fullCookie,
      body: { usuario_id: martha.id },
    });
    assert(assignRes.status === 200, "Clienta vinculada al ticket");
    assert(assignRes.data?.ticket?.clienta?.id === martha.id, "Ticket muestra a Martha como clienta registrada");

    // [Prueba 9] Exclusión de borrador en las consultas de la tienda en línea
    console.log("\n[Prueba 9] Tienda en línea ignora pedidos en estado 'borrador'");
    const [misPedidosRows] = await pool.execute(
      "SELECT id FROM pedidos WHERE usuario_id = ? AND estado = 'borrador'",
      [martha.id]
    );
    assert(misPedidosRows.length > 0, "El borrador está asociado a Martha en la BD");

    const [cuentaResumenRows] = await pool.execute(
      `SELECT id, folio FROM pedidos 
       WHERE usuario_id = ? 
         AND estado IN ('pagado', 'por_pagar_en_tienda', 'listo_para_recoger', 'enviado', 'preparando')
       ORDER BY creado_en DESC LIMIT 1`,
      [martha.id]
    );
    assert(!cuentaResumenRows[0] || cuentaResumenRows[0].id !== ventaId, "Resumen de cuenta no muestra la venta en borrador como pedido en curso");

    // [Prueba 10] Cobro en efectivo con cálculo de cambio
    console.log("\n[Prueba 10] Cobro en efectivo y deducción atómica de inventario");
    const ticketAntesCobro = removeRes.data.ticket;
    const totalVenta = ticketAntesCobro.total;
    const efectivoRecibido = Math.ceil(totalVenta) + 200;
    const cambioEsperado = Math.round((efectivoRecibido - totalVenta) * 100) / 100;
    const idempotencyKey = `test_idem_${Date.now()}`;

    const cobroRes = await request(`/api/pos/ventas/${ventaId}/cobrar`, {
      method: "POST",
      cookie: fullCookie,
      body: {
        metodo_pago: "efectivo",
        efectivo_recibido: efectivoRecibido,
        clave_idempotencia: idempotencyKey,
      },
    });

    assert(cobroRes.status === 200, "POST /cobrar responde 200");
    assert(cobroRes.data?.recibo?.cambio === cambioEsperado, `Cambio calculado con precisión ($${cobroRes.data?.recibo?.cambio})`);

    // Verificar en BD que el pedido pasó a 'entregado' con tipo 'mostrador'
    const [pedPostRows] = await pool.execute(
      "SELECT estado, tipo_entrega, canal, metodo_pago, efectivo_recibido, cambio, entregado_en FROM pedidos WHERE id = ?",
      [ventaId]
    );
    const pedFinal = pedPostRows[0];
    assert(pedFinal.estado === "entregado", "Pedido pasó a estado 'entregado'");
    assert(pedFinal.tipo_entrega === "mostrador", "Tipo de entrega es 'mostrador'");
    assert(pedFinal.canal === "tienda", "Canal es 'tienda'");
    assert(Boolean(pedFinal.entregado_en), "Tiene timestamp entregado_en");

    // Verificar movimiento de caja
    const [movRows] = await pool.execute(
      "SELECT tipo, monto FROM movimientos_caja WHERE pedido_id = ?",
      [ventaId]
    );
    assert(movRows.length === 1 && movRows[0].tipo === "venta_efectivo", "Movimiento de caja 'venta_efectivo' registrado");

    // [Prueba 11] Idempotencia: segundo cobro con la misma clave no duplica
    console.log("\n[Prueba 11] Control de Idempotencia");
    const repetidoRes = await request(`/api/pos/ventas/${ventaId}/cobrar`, {
      method: "POST",
      cookie: fullCookie,
      body: {
        metodo_pago: "efectivo",
        efectivo_recibido: efectivoRecibido,
        clave_idempotencia: idempotencyKey,
      },
    });
    assert(repetidoRes.status === 200, "Cobro repetido responde 200");
    assert(repetidoRes.data?.repetido === true, "Indica que fue atendido por idempotencia sin duplicar cobro ni inventario");

    // [Prueba 12] Cobro con Tarjeta en nueva venta
    console.log("\n[Prueba 12] Cobro con tarjeta en nueva venta");
    const v2Res = await request("/api/pos/ventas", {
      method: "POST",
      cookie: fullCookie,
    });
    const v2Id = v2Res.data?.ticket?.id;

    // Agregar producto simple
    await request(`/api/pos/ventas/${v2Id}/items`, {
      method: "PUT",
      cookie: fullCookie,
      body: { accion: "agregar", producto_id: 1, cantidad: 1 },
    });

    const cobroTarjRes = await request(`/api/pos/ventas/${v2Id}/cobrar`, {
      method: "POST",
      cookie: fullCookie,
      body: {
        metodo_pago: "tarjeta_terminal",
        autorizacion_terminal: "AUT-9921",
        clave_idempotencia: `test_tarj_${Date.now()}`,
      },
    });
    assert(cobroTarjRes.status === 200, "Cobro con tarjeta responde 200");
    const [pagoTarj] = await pool.execute(
      "SELECT proveedor, autorizacion_terminal FROM pagos WHERE pedido_id = ?",
      [v2Id]
    );
    assert(pagoTarj[0]?.autorizacion_terminal === "AUT-9921", "Autorización de voucher registrada en pagos");

    // [Prueba 13] Cobro Mixto en nueva venta
    console.log("\n[Prueba 13] Cobro Mixto (Efectivo + Tarjeta)");
    const v3Res = await request("/api/pos/ventas", {
      method: "POST",
      cookie: fullCookie,
    });
    const v3Id = v3Res.data?.ticket?.id;

    await request(`/api/pos/ventas/${v3Id}/items`, {
      method: "PUT",
      cookie: fullCookie,
      body: { accion: "agregar", producto_id: 1, cantidad: 2 }, // $249 * 2 = $498
    });

    const cobroMixtoRes = await request(`/api/pos/ventas/${v3Id}/cobrar`, {
      method: "POST",
      cookie: fullCookie,
      body: {
        metodo_pago: "mixto",
        monto_efectivo: 200,
        monto_tarjeta: 298,
        efectivo_recibido: 300,
        autorizacion_terminal: "AUT-MIX-1",
        clave_idempotencia: `test_mix_${Date.now()}`,
      },
    });
    assert(cobroMixtoRes.status === 200, "Cobro mixto responde 200");
    assert(cobroMixtoRes.data?.recibo?.cambio === 100, "Cambio de $100 calculado para la parte en efectivo");
    const [movsMixto] = await pool.execute(
      "SELECT tipo, monto FROM movimientos_caja WHERE pedido_id = ? ORDER BY id ASC",
      [v3Id]
    );
    assert(movsMixto.length === 2, "Generó 2 movimientos de caja independientes (efectivo y tarjeta)");
    assert(movsMixto[0].tipo === "venta_efectivo" && Number(movsMixto[0].monto) === 200, "Movimiento efectivo: $200");
    assert(movsMixto[1].tipo === "venta_tarjeta" && Number(movsMixto[1].monto) === 298, "Movimiento tarjeta: $298");

    // [Prueba 14] Cerrar sesión de cajera conservando turno abierto
    console.log("\n[Prueba 14] Cerrar sesión dejando turno abierto");
    const logoutRes = await request("/api/pos/auth/logout", {
      method: "POST",
      cookie: fullCookie,
    });
    const turnoIdActual = shiftRes.data?.turno?.id;
    const [turnoCheck] = await pool.execute(
      "SELECT estado FROM turnos WHERE id = ? LIMIT 1",
      [turnoIdActual]
    );
    assert(turnoCheck[0]?.estado === "abierto", "Turno permanece en estado 'abierto' para reanudación");

  } catch (error) {
    console.error("Error inesperado en las pruebas:", error);
    failed++;
  } finally {
    await pool.end();
  }

  console.log("\n===============================================================");
  console.log(`RESULTADOS: ${passed} pruebas superadas, ${failed} fallidas.`);
  console.log("===============================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

run();

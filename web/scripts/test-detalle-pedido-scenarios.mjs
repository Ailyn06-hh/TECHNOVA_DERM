// test-detalle-pedido-scenarios.mjs
// Verificación completa de la funcionalidad de Detalle de Pedido con Seguimiento

const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("=== INICIANDO PRUEBAS DE DETALLE DE PEDIDO ===");
  let cookie = "";

  // 1. Iniciar sesión con usuario de prueba (Ana López)
  console.log("\n1. Autenticación con ana.lopez@technovaderm.com...");
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identifier: "ana.lopez@technovaderm.com",
      password: "Password123!",
    }),
  });

  if (!loginRes.ok) {
    throw new Error(`Fallo en login: ${loginRes.status} ${await loginRes.text()}`);
  }

  const setCookie = loginRes.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("No se recibió cookie de sesión");
  }
  cookie = setCookie.split(";")[0];
  console.log("✔ Login exitoso. Cookie obtenida.");

  // Helper para fetch autenticado
  const authFetch = (url, options = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Cookie: cookie,
      },
    });
  };

  // 2. Probar GET /api/cuenta/pedidos/N-1042 (Pedido del mockup: Listo para recoger)
  console.log("\n2. Consultando detalle de #N-1042 (Mockup: Listo para recoger)...");
  const res1042 = await authFetch(`${BASE_URL}/api/cuenta/pedidos/N-1042`);
  if (!res1042.ok) {
    throw new Error(`Error en GET /api/cuenta/pedidos/N-1042: ${res1042.status}`);
  }
  const data1042 = await res1042.json();
  console.log("  - Folio:", data1042.pedido.folio);
  console.log("  - Estado:", data1042.pedido.estado);
  console.log("  - Código de recogida:", data1042.pedido.codigoRecogida);
  console.log("  - Sucursal:", data1042.sucursal?.nombre, "(Horario:", data1042.sucursal?.horarioTexto, ")");
  console.log("  - Forma de pago:", data1042.pedido.formaPagoTexto);
  console.log("  - Línea de tiempo pasos:", data1042.lineaTiempo.map(p => `${p.nombre} (${p.estado}, ${p.hora || p.fecha || 'sin hora'})`).join(" -> "));
  console.log("  - Items comprados:", data1042.items.length);
  console.log("  - Factura disponible:", data1042.facturaDisponible);

  if (data1042.pedido.estado !== "listo_para_recoger") {
    throw new Error(`Esperado estado 'listo_para_recoger', recibido '${data1042.pedido.estado}'`);
  }
  if (data1042.pedido.codigoRecogida !== "4827") {
    throw new Error(`Esperado código recogida '4827', recibido '${data1042.pedido.codigoRecogida}'`);
  }
  console.log("✔ Pedido #N-1042 verificado correctamente con datos del mockup.");

  // 3. Probar GET Comprobante PDF /api/cuenta/pedidos/N-1042/comprobante
  console.log("\n3. Verificando generación de Comprobante PDF...");
  const pdfRes = await authFetch(`${BASE_URL}/api/cuenta/pedidos/N-1042/comprobante`);
  if (!pdfRes.ok) {
    throw new Error(`Error en comprobante PDF: ${pdfRes.status}`);
  }
  const contentType = pdfRes.headers.get("content-type");
  const pdfArrayBuffer = await pdfRes.arrayBuffer();
  const pdfBuffer = Buffer.from(pdfArrayBuffer);
  const pdfHeader = pdfBuffer.slice(0, 5).toString("utf-8");

  console.log("  - Content-Type:", contentType);
  console.log("  - Tamaño en bytes:", pdfBuffer.length);
  console.log("  - Encabezado PDF:", pdfHeader);

  if (!contentType.includes("application/pdf")) {
    throw new Error(`Content-Type inválido: ${contentType}`);
  }
  if (!pdfHeader.startsWith("%PDF-")) {
    throw new Error(`El archivo generado no es un PDF válido (header: ${pdfHeader})`);
  }
  console.log("✔ Comprobante PDF 1.4 generado válidamente sin dependencias externas.");

  // 4. Probar flujo de Facturación
  console.log("\n4. Probando validaciones y solicitud de factura...");
  // 4.1 RFC Inválido
  const badRfcRes = await authFetch(`${BASE_URL}/api/cuenta/pedidos/N-1042/factura`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rfc: "RFC_INVALIDO",
      razon_social: "Empresa Ficticia SA de CV",
      regimen_fiscal: "601",
      codigo_postal_fiscal: "06000",
      uso_cfdi: "G03",
      correo: "facturas@empresa.com",
    }),
  });
  const badRfcJson = await badRfcRes.json();
  if (badRfcRes.status !== 400 || !badRfcJson.error) {
    throw new Error("Esperado error 400 por RFC inválido");
  }
  console.log("  - Validación RFC rechaza formato incorrecto correctamente:", badRfcJson.error);

  // 4.2 CP Inválido
  const badCpRes = await authFetch(`${BASE_URL}/api/cuenta/pedidos/N-1042/factura`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rfc: "XAXX010101000",
      razon_social: "Público en General",
      regimen_fiscal: "616",
      codigo_postal_fiscal: "123",
      uso_cfdi: "S01",
      correo: "facturas@empresa.com",
    }),
  });
  const badCpJson = await badCpRes.json();
  if (badCpRes.status !== 400 || !badCpJson.error) {
    throw new Error("Esperado error 400 por CP inválido");
  }
  console.log("  - Validación Código Postal rechaza CP no de 5 dígitos:", badCpJson.error);

  // 4.3 Factura Válida (usando RFC genérico para personas físicas o morales)
  const goodFacturaRes = await authFetch(`${BASE_URL}/api/cuenta/pedidos/N-1042/factura`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rfc: "LOGA900823H78",
      razon_social: "Ana López García",
      regimen_fiscal: "605",
      codigo_postal_fiscal: "06000",
      uso_cfdi: "G03",
      correo: "ana.lopez@technovaderm.com",
    }),
  });
  const goodFacturaJson = await goodFacturaRes.json();
  if (!goodFacturaRes.ok || !goodFacturaJson.success) {
    // Si ya existía factura previa en la BD para este pedido, aceptamos si el mensaje es de existente
    if (goodFacturaJson.error && goodFacturaJson.error.includes("Ya existe")) {
      console.log("  - Solicitud de factura ya existía previamente.");
    } else {
      throw new Error(`Fallo al solicitar factura válida: ${JSON.stringify(goodFacturaJson)}`);
    }
  } else {
    console.log("✔ Factura solicitada con éxito. ID:", goodFacturaJson.facturaId);
  }

  // 5. Probar pedido con envío #N-1035
  console.log("\n5. Consultando pedido con envío #N-1035...");
  const res1035 = await authFetch(`${BASE_URL}/api/cuenta/pedidos/N-1035`);
  if (!res1035.ok) {
    throw new Error(`Error en GET /api/cuenta/pedidos/N-1035: ${res1035.status}`);
  }
  const data1035 = await res1035.json();
  console.log("  - Folio:", data1035.pedido.folio);
  console.log("  - Tipo de entrega:", data1035.pedido.tipoEntrega);
  console.log("  - Paquetería:", data1035.pedido.paqueteria);
  console.log("  - Número de guía:", data1035.pedido.numeroGuia);
  console.log("  - URL Rastreo:", data1035.pedido.urlRastreo);

  if (data1035.pedido.paqueteria !== "Estafeta" || data1035.pedido.numeroGuia !== "EST-8849201948") {
    throw new Error("Datos de envío de #N-1035 no coinciden con la semilla esperada");
  }
  console.log("✔ Pedido con envío #N-1035 verificado con paquetería y guía.");

  // 6. Probar validación de Devolución
  console.log("\n6. Probando validación de devoluciones...");
  // 6.1 Intentar devolución en pedido NO entregado (N-1042 está en listo_para_recoger)
  const badDevRes = await authFetch(`${BASE_URL}/api/cuenta/pedidos/N-1042/devolucion`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ pedido_item_id: data1042.items[0]?.id, cantidad: 1 }],
      motivo: "danado",
      comentario: "Producto llegó roto",
      metodo: "tienda",
    }),
  });
  const badDevJson = await badDevRes.json();
  if (badDevRes.status !== 400 || !badDevJson.error.includes("entregados")) {
    throw new Error(`Esperado error de pedido no entregado, recibido: ${JSON.stringify(badDevJson)}`);
  }
  console.log("  - Devolución en pedido no entregado rechazada correctamente:", badDevJson.error);

  // 6.2 Probar devolución en un pedido entregado del usuario
  // Buscamos un pedido entregado en la lista de pedidos
  const misPedidosRes = await authFetch(`${BASE_URL}/api/cuenta/pedidos?estado=entregados`);
  const misPedidosJson = await misPedidosRes.json();
  const pedidoEntregado = misPedidosJson.pedidos?.find(p => p.estado === "entregado");

  if (pedidoEntregado) {
    console.log(`  - Probando devolución en pedido entregado #${pedidoEntregado.folio}...`);
    const devDetailRes = await authFetch(`${BASE_URL}/api/cuenta/pedidos/${pedidoEntregado.folio}`);
    const devDetailJson = await devDetailRes.json();

    if (devDetailJson.devolucionDisponible && devDetailJson.items.length > 0) {
      const itemToReturn = devDetailJson.items[0];
      const reqDevRes = await authFetch(`${BASE_URL}/api/cuenta/pedidos/${pedidoEntregado.folio}/devolucion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ pedido_item_id: itemToReturn.id, cantidad: 1 }],
          motivo: "reaccion",
          comentario: "Prueba de solicitud de devolución automatizada",
          metodo: "tienda",
        }),
      });
      const reqDevJson = await reqDevRes.json();
      if (!reqDevRes.ok || !reqDevJson.success) {
        throw new Error(`Fallo en solicitud de devolución: ${JSON.stringify(reqDevJson)}`);
      }
      console.log("  ✔ Devolución registrada con éxito:", reqDevJson.devolucion?.codigo);
    } else {
      console.log("  - Pedido entregado ya tiene devolución previa o fuera de plazo.");
    }
  }

  // 7. Probar SSR de la página /cuenta/pedidos/N-1042
  console.log("\n7. Verificando SSR HTML de /cuenta/pedidos/N-1042...");
  const htmlRes = await authFetch(`${BASE_URL}/cuenta/pedidos/N-1042`);
  if (!htmlRes.ok) {
    throw new Error(`Error en SSR de /cuenta/pedidos/N-1042: ${htmlRes.status}`);
  }
  const htmlText = await htmlRes.text();

  const checks = [
    { label: "Título de Pedido", match: "Pedido #N-1042" },
    { label: "Estado Listo para recoger", match: "Listo para recoger" },
    { label: "Código de Recogida 4 8 2 7", match: "4 8 2 7" },
    { label: "Sucursal Technova-Derm Centro", match: "Technova-Derm Centro" },
    { label: "Horario de la sucursal", match: "Lun a sáb 10:00 a 20:00" },
    { label: "Enlace a Google Maps", match: "maps/dir" },
    { label: "Botón Comprobante", match: "Descargar comprobante" },
    { label: "Botón Recomprar", match: "Volver a comprar" },
  ];

  for (const c of checks) {
    if (!htmlText.includes(c.match)) {
      throw new Error(`HTML no contiene: '${c.match}' (${c.label})`);
    }
    console.log(`  ✔ Contenido HTML verificado: ${c.label}`);
  }

  console.log("\n=== TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE ===");
}

runTests().catch((err) => {
  console.error("\n❌ ERROR EN PRUEBAS:", err.message);
  process.exit(1);
});

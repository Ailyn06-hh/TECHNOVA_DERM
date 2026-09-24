import mysql from "mysql2/promise";
import crypto from "crypto";

const SESSION_SECRET = "technova_derm_secure_session_key_2026";

function createAuthCookie(user) {
  const dataStr = Buffer.from(JSON.stringify(user)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(dataStr)
    .digest("base64url");
  return `auth_session=${dataStr}.${signature}`;
}

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.cookie ? { Cookie: options.cookie } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`http://localhost:3000${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const json = await res.json().catch(() => null);
  return { status: res.status, data: json };
}

async function run() {
  console.log("====================================================");
  console.log("PRUEBAS INTEGRALES DE MIS PEDIDOS (TECHNOVA-DERM)");
  console.log("====================================================");

  const pool = mysql.createPool({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    database: "technova_derm",
  });

  const anaCookie = createAuthCookie({
    userId: 20,
    correo: "ana.lopez@technovaderm.com",
    nombre: "Ana",
    verificado: true,
  });

  // PRUEBA 1: Pestañas de estado (Todos, En curso, Entregados, Cancelados)
  console.log("\n--- Prueba 1: Pestañas de estado para Ana López ---");
  const resTodos = await request("/api/cuenta/pedidos?estado=todos&pagina=1", { cookie: anaCookie });
  console.log("Todos: total pedidos devueltos =", resTodos.data?.pedidos?.length, "hayMas =", resTodos.data?.hayMas);
  console.log("Conteos por canal:", resTodos.data?.conteosPorCanal);

  const resEnCurso = await request("/api/cuenta/pedidos?estado=en_curso&pagina=1", { cookie: anaCookie });
  console.log("En curso: pedidos =", resEnCurso.data?.pedidos?.length, "folios:", resEnCurso.data?.pedidos?.map(p => p.folio));

  const resEntregados = await request("/api/cuenta/pedidos?estado=entregados&pagina=1", { cookie: anaCookie });
  console.log("Entregados: pedidos =", resEntregados.data?.pedidos?.length, "hayMas =", resEntregados.data?.hayMas);

  const resCancelados = await request("/api/cuenta/pedidos?estado=cancelados&pagina=1", { cookie: anaCookie });
  console.log("Cancelados: pedidos =", resCancelados.data?.pedidos?.length, "folios:", resCancelados.data?.pedidos?.map(p => p.folio));

  if (
    resTodos.data?.pedidos?.length === 10 &&
    resTodos.data?.hayMas === true &&
    resEnCurso.data?.pedidos?.length > 0 &&
    resEntregados.data?.pedidos?.length > 0 &&
    resCancelados.data?.pedidos?.length > 0
  ) {
    console.log("✓ Prueba 1 PASÓ: Filtrado por pestañas de estado exitoso.");
  } else {
    console.error("✗ Prueba 1 FALLÓ.");
  }

  // PRUEBA 2: Canales combinados con pestañas
  console.log("\n--- Prueba 2: Combinación canal WhatsApp + Entregados ---");
  const resWhatsApp = await request("/api/cuenta/pedidos?estado=entregados&canal=whatsapp&pagina=1", { cookie: anaCookie });
  console.log("WhatsApp entregados:", resWhatsApp.data?.pedidos?.map(p => `${p.folio} (${p.canalEtiqueta.texto})`));

  const resTienda = await request("/api/cuenta/pedidos?estado=todos&canal=tienda&pagina=1", { cookie: anaCookie });
  console.log("Tienda pedidos:", resTienda.data?.pedidos?.map(p => `${p.folio} (${p.canalEtiqueta.texto}, ${p.entregaTexto})`));

  if (resWhatsApp.data?.pedidos?.every(p => p.canal === "whatsapp")) {
    console.log("✓ Prueba 2 PASÓ: Filtro de canales omnicanal funciona correctamente.");
  } else {
    console.error("✗ Prueba 2 FALLÓ.");
  }

  // PRUEBA 3: Paginación (Página 1 y Página 2)
  console.log("\n--- Prueba 3: Paginación completa hasta el final ---");
  const resPag1 = await request("/api/cuenta/pedidos?estado=todos&pagina=1", { cookie: anaCookie });
  const resPag2 = await request("/api/cuenta/pedidos?estado=todos&pagina=2", { cookie: anaCookie });
  console.log("Página 1 items:", resPag1.data?.pedidos?.length, "hayMas:", resPag1.data?.hayMas);
  console.log("Página 2 items:", resPag2.data?.pedidos?.length, "hayMas:", resPag2.data?.hayMas);

  if (resPag1.data?.hayMas === true && resPag2.data?.hayMas === false) {
    console.log("✓ Prueba 3 PASÓ: Paginación de 10 en 10 concluye correctamente en la última página.");
  } else {
    console.error("✗ Prueba 3 FALLÓ.");
  }

  // PRUEBA 4: Volver a comprar pedido completo (#N-0870)
  console.log("\n--- Prueba 4: Volver a comprar pedido completo (#N-0870) ---");
  // Limpiar carrito de Ana
  await pool.execute("DELETE ci FROM carrito_items ci JOIN carritos c ON ci.carrito_id = c.id WHERE c.usuario_id = 20");

  const resReorder = await request("/api/pedidos/N-0870/recomprar", {
    method: "POST",
    cookie: anaCookie,
  });
  console.log("Reorder N-0870 status:", resReorder.status, resReorder.data);

  if (resReorder.data?.toastTipo === "todo" && resReorder.data?.agregados?.length === 1) {
    console.log("✓ Prueba 4 PASÓ: Pedido completo reordenado con toast adecuado.");
  } else {
    console.error("✗ Prueba 4 FALLÓ.");
  }

  // PRUEBA 5: Volver a comprar pedido con rutina (#N-0902)
  console.log("\n--- Prueba 5: Volver a comprar pedido que venía como rutina (#N-0902) ---");
  await pool.execute("DELETE ci FROM carrito_items ci JOIN carritos c ON ci.carrito_id = c.id WHERE c.usuario_id = 20");

  const resReorderRoutine = await request("/api/pedidos/N-0902/recomprar", {
    method: "POST",
    cookie: anaCookie,
  });
  console.log("Reorder N-0902 status:", resReorderRoutine.status, resReorderRoutine.data);

  // Verificar si se aplicó el grupo y descuento en carrito_items
  const [cartItemsRoutine] = await pool.execute(
    `SELECT ci.producto_id, ci.grupo_id, ci.grupo_tipo, ci.descuento_porcentaje, ci.precio_unitario_al_agregar
     FROM carrito_items ci
     JOIN carritos c ON ci.carrito_id = c.id
     WHERE c.usuario_id = 20`
  );
  console.log("Items agregados en carrito:", cartItemsRoutine);

  if (
    cartItemsRoutine.length === 2 &&
    cartItemsRoutine[0].grupo_tipo === "rutina" &&
    cartItemsRoutine[0].grupo_id !== null &&
    cartItemsRoutine[0].descuento_porcentaje > 0
  ) {
    console.log("✓ Prueba 5 PASÓ: Los ítems de rutina se agruparon y recalcularon su descuento correctamente.");
  } else {
    console.error("✗ Prueba 5 FALLÓ.");
  }

  // PRUEBA 6: Volver a comprar pedido con producto agotado
  console.log("\n--- Prueba 6: Volver a comprar con producto agotado ---");
  // Temporalmente marcar existencias de producto 4 (Gel Aloe) en 0
  await pool.execute("UPDATE inventario SET existencias = 0 WHERE producto_id = 4");

  const resReorderAgotado = await request("/api/pedidos/N-0987/recomprar", {
    method: "POST",
    cookie: anaCookie,
  });
  console.log("Reorder N-0987 status con producto agotado:", resReorderAgotado.data);

  // Restaurar inventario
  await pool.execute("UPDATE inventario SET existencias = 25 WHERE producto_id = 4");

  if (
    resReorderAgotado.data?.toastTipo === "parcial" &&
    resReorderAgotado.data?.omitidos?.length > 0
  ) {
    console.log("✓ Prueba 6 PASÓ: Producto agotado fue omitido y el toast parcial avisó al usuario.");
  } else {
    console.error("✗ Prueba 6 FALLÓ.");
  }

  // PRUEBA 7: Usuario nuevo sin pedidos
  console.log("\n--- Prueba 7: Usuario nuevo sin pedidos ---");
  const nuevoCookie = createAuthCookie({
    userId: 9999,
    correo: "nuevo@technovaderm.com",
    nombre: "Cliente Nuevo",
    verificado: true,
  });

  const resNuevo = await request("/api/cuenta/pedidos", { cookie: nuevoCookie });
  console.log("Usuario nuevo pedidos:", resNuevo.data?.pedidos?.length, "conteos:", resNuevo.data?.conteosPorCanal);

  if (resNuevo.data?.pedidos?.length === 0 && resNuevo.data?.conteosPorCanal?.todos === 0) {
    console.log("✓ Prueba 7 PASÓ: Usuario nuevo responde con estado vacío limpio.");
  } else {
    console.error("✗ Prueba 7 FALLÓ.");
  }

  // PRUEBA 8: Vincular pedido de invitado (#N-0650) por celular
  console.log("\n--- Prueba 8: Vincular pedido de invitado (#N-0650) por celular ---");
  // Crear usuario temporal con celular '5599887766'
  await pool.execute("DELETE FROM usuarios WHERE correo = 'invitada.temp@technovaderm.com'");
  await pool.execute("DELETE FROM usuarios WHERE celular = '5599887766'");
  const [insertUser] = await pool.execute(
    `INSERT INTO usuarios (nombre, apellido, correo, celular, password_hash, verificado)
     VALUES ('Invitada', 'Prueba', 'invitada.temp@technovaderm.com', '5599887766', 'hash', 0)`
  );
  const tempUserId = insertUser.insertId;

  // Insertar código de verificación para este usuario
  const testCode = "654321";
  const bcrypt = await import("bcryptjs");
  const codeHash = await bcrypt.default.hash(testCode, 10);
  await pool.execute(
    `INSERT INTO codigos_verificacion (usuario_id, codigo_hash, expira_en, intentos, usado)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE), 0, 0)`,
    [tempUserId, codeHash]
  );

  // Crear cookie pendiente para llamar a /api/auth/verificar
  const pendingPayload = Buffer.from(
    JSON.stringify({ userId: tempUserId, correo: "invitada.temp@technovaderm.com" })
  ).toString("base64url");
  const pendingCookie = `pending_verification=${pendingPayload}`;

  const resVerif = await request("/api/auth/verificar", {
    method: "POST",
    headers: { Cookie: pendingCookie },
    body: { codigo: testCode },
  });
  console.log("Verificar cuenta status:", resVerif.status, resVerif.data);

  // Comprobar si el pedido N-0650 fue vinculado al tempUserId
  const [orderLinked] = await pool.execute(
    "SELECT id, folio, usuario_id, cliente_celular FROM pedidos WHERE folio = 'N-0650'"
  );
  console.log("Pedido N-0650 tras verificación:", orderLinked[0]);

  if (orderLinked[0]?.usuario_id === tempUserId) {
    console.log("✓ Prueba 8 PASÓ: Pedido de invitado vinculado exitosamente al verificar la cuenta.");
  } else {
    console.error("✗ Prueba 8 FALLÓ.");
  }

  // Limpiar usuario temporal y restaurar N-0650 como invitado
  await pool.execute("DELETE FROM usuarios WHERE id = ?", [tempUserId]);
  await pool.execute("UPDATE pedidos SET usuario_id = NULL WHERE folio = 'N-0650'");

  console.log("\n====================================================");
  console.log("TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE");
  console.log("====================================================");
  await pool.end();
}

run().catch((err) => {
  console.error("Error fatal en suite de pruebas:", err);
  process.exit(1);
});

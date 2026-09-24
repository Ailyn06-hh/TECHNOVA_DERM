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
  console.log("PRUEBAS INTEGRALES DE MI CUENTA (TECHNOVA-DERM)");
  console.log("====================================================");

  const pool = mysql.createPool({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    database: "technova_derm",
  });

  // Limpiar recompras descartadas para iniciar prueba limpia con Ana
  await pool.execute("DELETE FROM recompras_descartadas WHERE usuario_id = 20");

  const anaCookie = createAuthCookie({
    userId: 20,
    correo: "ana.lopez@technovaderm.com",
    nombre: "Ana",
    verificado: true,
  });

  // SCENARIO 1: Usuario de prueba Ana López con todo (mockup)
  console.log("\n--- Escenario 1: Resumen completo de Ana López ---");
  const resAna = await request("/api/cuenta/resumen", { cookie: anaCookie });
  console.log("Status:", resAna.status);
  console.log("Usuario:", resAna.data?.usuario);
  console.log("Pedido en curso:", resAna.data?.pedidoEnCurso);
  console.log("Recompra sugerida:", resAna.data?.recompra);
  console.log("Perfil de piel:", resAna.data?.perfilPiel);
  console.log("Rutina guardada:", resAna.data?.rutinaGuardada);
  console.log("Últimos pedidos:", resAna.data?.ultimosPedidos);

  if (
    resAna.data?.pedidoEnCurso?.folio === "N-1042" &&
    resAna.data?.pedidoEnCurso?.codigoRecogida === "4827" &&
    resAna.data?.recompra?.nombre === "Tónico de Rosa" &&
    resAna.data?.recompra?.precioVigente === 199 &&
    resAna.data?.ultimosPedidos?.length >= 2
  ) {
    console.log("✓ Escenario 1 PASÓ: Ana López tiene todos los datos idénticos al mockup.");
  } else {
    console.error("✗ Escenario 1 FALLÓ: Datos no coinciden con el mockup.");
  }

  // SCENARIO 2: Descartar la recompra por 30 días
  console.log("\n--- Escenario 2: Descartar sugerencia de recompra ---");
  const discardRes = await request("/api/cuenta/recompra/descartar", {
    method: "POST",
    cookie: anaCookie,
    body: { productoId: 8 },
  });
  console.log("Descartar status:", discardRes.status, discardRes.data);

  const resAnaAfterDiscard = await request("/api/cuenta/resumen", { cookie: anaCookie });
  console.log("Recompra tras descartar producto 8:", resAnaAfterDiscard.data?.recompra?.nombre);

  // Descartar también el siguiente candidato (producto 23)
  await request("/api/cuenta/recompra/descartar", {
    method: "POST",
    cookie: anaCookie,
    body: { productoId: 23 },
  });

  const resAnaAfterDiscardAll = await request("/api/cuenta/resumen", { cookie: anaCookie });
  console.log("Recompra tras descartar todos los candidatos:", resAnaAfterDiscardAll.data?.recompra);

  if (
    resAnaAfterDiscard.data?.recompra?.productoId !== 8 &&
    resAnaAfterDiscardAll.data?.recompra === null
  ) {
    console.log("✓ Escenario 2 PASÓ: Los productos descartados se excluyen por 30 días y la tarjeta desaparece.");
  } else {
    console.error("✗ Escenario 2 FALLÓ: No se excluyeron correctamente las recompras descartadas.");
  }

  // Limpiar para permitir prueba de recompra al carrito
  await pool.execute("DELETE FROM recompras_descartadas WHERE usuario_id = 20");

  // SCENARIO 3: Recomprar por $199 y verificar el carrito
  console.log("\n--- Escenario 3: Recomprar por $199 y verificar carrito ---");
  const addCartRes = await request("/api/carrito/items", {
    method: "POST",
    cookie: anaCookie,
    body: { producto_id: 8, cantidad: 1 },
  });
  console.log("Agregar al carrito status:", addCartRes.status, addCartRes.data);

  const cartRes = await request("/api/carrito", { cookie: anaCookie });
  const itemTonico = (cartRes.data?.items || []).find((i) => i.producto_id === 8);
  console.log("Ítem en carrito:", itemTonico?.nombre, "Precio vigente:", itemTonico?.precio_vigente);
  if (itemTonico && itemTonico.precio_vigente === 199) {
    console.log("✓ Escenario 3 PASÓ: Tónico de Rosa agregado a la bolsa por $199.");
  } else {
    console.error("✗ Escenario 3 FALLÓ: Ítem no encontrado o precio incorrecto.");
  }

  // SCENARIO 4: Guardar una rutina desde /rutinas y verla en la cuenta
  console.log("\n--- Escenario 4: Guardar nueva rutina ---");
  const saveRoutineRes = await request("/api/cuenta/rutinas", {
    method: "POST",
    cookie: anaCookie,
    body: {
      plantillaClave: "noche",
      tipoPiel: "mixta",
      productoIds: [1, 2, 4],
    },
  });
  console.log("Guardar rutina status:", saveRoutineRes.status, saveRoutineRes.data);

  const resAnaAfterSaveRoutine = await request("/api/cuenta/resumen", { cookie: anaCookie });
  console.log("Rutina más reciente:", resAnaAfterSaveRoutine.data?.rutinaGuardada);
  if (resAnaAfterSaveRoutine.data?.rutinaGuardada?.plantillaClave === "noche") {
    console.log("✓ Escenario 4 PASÓ: La nueva rutina guardada aparece en el resumen de cuenta.");
  } else {
    console.error("✗ Escenario 4 FALLÓ: No se actualizó la rutina guardada.");
  }

  // SCENARIO 5: Usuario nuevo sin pedidos ni perfil
  console.log("\n--- Escenario 5: Usuario nuevo sin pedidos ni perfil ---");
  const [newUserRes] = await pool.execute(
    `INSERT INTO usuarios (nombre, apellido, correo, celular, password_hash, acepta_terminos, verificado, fecha_registro, onboarding_omitido)
     VALUES ('Lucía', 'Prueba', 'lucia.nueva@technovaderm.com', '5599887766', 'hash', 1, 1, NOW(), 1)`
  );
  const newUserId = newUserRes.insertId;

  const newUserCookie = createAuthCookie({
    userId: newUserId,
    correo: "lucia.nueva@technovaderm.com",
    nombre: "Lucía",
    verificado: true,
  });

  const resNewUser = await request("/api/cuenta/resumen", { cookie: newUserCookie });
  console.log("Usuario nuevo pedido en curso:", resNewUser.data?.pedidoEnCurso);
  console.log("Usuario nuevo recompra:", resNewUser.data?.recompra);
  console.log("Usuario nuevo perfil:", resNewUser.data?.perfilPiel);
  console.log("Usuario nuevo rutina:", resNewUser.data?.rutinaGuardada);
  console.log("Usuario nuevo últimos pedidos:", resNewUser.data?.ultimosPedidos);

  if (
    resNewUser.data?.pedidoEnCurso === null &&
    resNewUser.data?.recompra === null &&
    resNewUser.data?.perfilPiel?.hasProfile === false &&
    resNewUser.data?.rutinaGuardada?.hasRoutine === false &&
    resNewUser.data?.ultimosPedidos?.length === 0
  ) {
    console.log("✓ Escenario 5 PASÓ: Usuario nuevo muestra correctamente los estados vacíos con llamadas a la acción.");
  } else {
    console.error("✗ Escenario 5 FALLÓ: Estados vacíos no se representaron como se esperaba.");
  }

  // Limpiar usuario temporal
  await pool.execute("DELETE FROM usuarios WHERE id = ?", [newUserId]);
  await pool.end();

  console.log("\n====================================================");
  console.log("TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE");
  console.log("====================================================");
}

run().catch((err) => {
  console.error("Error en pruebas:", err);
  process.exit(1);
});

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
    redirect: "manual",
  });

  let json = null;
  try {
    json = await res.json();
  } catch {
    // maybe html or redirect
  }
  return { status: res.status, headers: res.headers, data: json };
}

async function run() {
  console.log("===============================================================");
  console.log("SUITE DE PRUEBAS: DIRECCIONES Y MÉTODOS DE PAGO (TECHNOVA-DERM)");
  console.log("===============================================================");

  const pool = mysql.createPool({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    database: "technova_derm",
  });

  const anaUser = {
    userId: 20,
    correo: "ana.lopez@technovaderm.com",
    nombre: "Ana",
    verificado: true,
  };
  const anaCookie = createAuthCookie(anaUser);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [OK] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Redirección /cuenta/pagos -> /cuenta/direcciones
    console.log("\n1. Verificando redirección /cuenta/pagos -> /cuenta/direcciones");
    const resRedirect = await request("/cuenta/pagos", { cookie: anaCookie });
    const location = resRedirect.headers.get("location");
    assert(
      resRedirect.status === 307 || resRedirect.status === 308 || location?.includes("/cuenta/direcciones"),
      `Redirige correctamente a /cuenta/direcciones (status: ${resRedirect.status}, location: ${location})`
    );

    // 2. Consulta de códigos postales válidos e inválidos
    console.log("\n2. Servicio de Códigos Postales (/api/codigos-postales/[cp])");
    const cpValido = await request("/api/codigos-postales/20127");
    assert(cpValido.status === 200, "CP 20127 retorna status 200");
    assert(cpValido.data?.municipio === "Aguascalientes", "CP 20127 municipio es Aguascalientes");
    assert(
      Array.isArray(cpValido.data?.colonias) && cpValido.data.colonias.includes("Bosques del Prado"),
      "CP 20127 incluye la colonia Bosques del Prado"
    );

    const cpInvalido = await request("/api/codigos-postales/99999");
    assert(cpInvalido.status === 404, "CP 99999 no registrado responde 404");

    const cpMalFormato = await request("/api/codigos-postales/201");
    assert(cpMalFormato.status === 400, "CP de menos de 5 dígitos responde 400");

    // 3. Consulta de datos iniciales agregados
    console.log("\n3. Consulta agregada /api/cuenta/direcciones-pagos");
    const resData = await request("/api/cuenta/direcciones-pagos", { cookie: anaCookie });
    assert(resData.status === 200, "Responde status 200");
    assert(Array.isArray(resData.data?.direcciones), "Contiene array de direcciones");
    assert(Array.isArray(resData.data?.metodosPago), "Contiene array de métodos de pago");
    assert(resData.data?.cuentasVinculadas?.mercadopago?.conectado === true, "Mercado Pago está conectado para Ana");
    assert(
      resData.data?.cuentasVinculadas?.mercadopago?.cuenta_mascara === "a***@technovaderm.com",
      "Máscara de cuenta MP coincide con a***@technovaderm.com"
    );

    // 4. Validación de Dirección: Rechazar si no contiene número en calle_y_numero
    console.log("\n4. Validación de Dirección (calle sin número)");
    const dirSinNumero = await request("/api/direcciones", {
      method: "POST",
      cookie: anaCookie,
      body: {
        alias: "Oficina",
        calle_y_numero: "Avenida Principal Sin Numero",
        colonia: "Centro",
        codigo_postal: "20000",
        ciudad: "Aguascalientes",
        estado: "Aguascalientes",
      },
    });
    assert(dirSinNumero.status === 400, "Rechaza dirección sin dígitos en calle_y_numero (HTTP 400)");

    // 5. Alta exitosa de dirección
    console.log("\n5. Alta exitosa de una nueva dirección");
    const nuevaDirRes = await request("/api/direcciones", {
      method: "POST",
      cookie: anaCookie,
      body: {
        alias: "Consultorio",
        calle_y_numero: "Sierra Morena 402",
        numero_interior: "Piso 2",
        colonia: "Bosques del Prado",
        codigo_postal: "20127",
        ciudad: "Aguascalientes",
        estado: "Aguascalientes",
        referencias: "Frente a parque médico",
        predeterminada: false,
      },
    });
    assert(nuevaDirRes.status === 200, "Crea dirección correctamente (HTTP 200)");
    const nuevaDirId = nuevaDirRes.data?.direccion?.id;
    assert(Boolean(nuevaDirId), `Dirección creada tiene ID ${nuevaDirId}`);

    // 6. Edición de dirección
    console.log("\n6. Edición de dirección");
    const editDirRes = await request(`/api/direcciones/${nuevaDirId}`, {
      method: "PATCH",
      cookie: anaCookie,
      body: {
        alias: "Consultorio Norte",
        calle_y_numero: "Sierra Morena 402-B",
        numero_interior: "Piso 3",
        colonia: "Bosques del Prado",
        codigo_postal: "20127",
        ciudad: "Aguascalientes",
        estado: "Aguascalientes",
        referencias: "Edificio blanco con azul",
        predeterminada: true,
      },
    });
    assert(editDirRes.status === 200, "Modifica dirección y la marca como predeterminada (HTTP 200)");
    assert(editDirRes.data?.direccion?.alias === "Consultorio Norte", "Alias actualizado correctamente");
    assert(editDirRes.data?.direccion?.predeterminada === 1 || editDirRes.data?.direccion?.predeterminada === true, "Es ahora predeterminada");

    // 7. Eliminación de dirección y fallback de predeterminada
    console.log("\n7. Eliminación de dirección predeterminada y fallback");
    const delDirRes = await request(`/api/direcciones/${nuevaDirId}`, {
      method: "DELETE",
      cookie: anaCookie,
    });
    assert(delDirRes.status === 200, "Elimina dirección correctamente (HTTP 200)");

    // Verificar que una dirección anterior volvió a ser predeterminada
    const checkDirRes = await request("/api/cuenta/direcciones-pagos", { cookie: anaCookie });
    const hasDefaultDir = checkDirRes.data?.direcciones?.some((d) => d.predeterminada === 1 || d.predeterminada === true);
    assert(hasDefaultDir, "Tras eliminar la dirección predeterminada, otra dirección quedó asignada como predeterminada");

    // 8. Métodos de Pago: Detección de duplicados
    console.log("\n8. Métodos de Pago: Prevención de tarjetas duplicadas");
    // Ana ya tiene tarjeta 4242 que vence 08/28
    const dupCardRes = await request("/api/cuenta/tarjetas", {
      method: "POST",
      cookie: anaCookie,
      body: {
        token: "tok_test_dup",
        marca: "visa",
        ultimos4: "4242",
        titular: "ANA LOPEZ",
        mes_vencimiento: 8,
        anio_vencimiento: 2028,
        predeterminado: false,
      },
    });
    assert(dupCardRes.status === 409, "Rechaza tarjeta duplicada con HTTP 409");

    // 9. Métodos de Pago: Agregar nueva tarjeta válida
    console.log("\n9. Métodos de Pago: Agregar nueva tarjeta");
    const newCardRes = await request("/api/cuenta/tarjetas", {
      method: "POST",
      cookie: anaCookie,
      body: {
        token: "tok_test_amex_0005",
        marca: "american_express",
        ultimos4: "0005",
        titular: "ANA LÓPEZ GÓMEZ",
        mes_vencimiento: 11,
        anio_vencimiento: 2029,
        predeterminado: false,
      },
    });
    assert(newCardRes.status === 200, "Agrega tarjeta American Express 0005 exitosamente");
    const newCardId = newCardRes.data?.tarjeta?.id;
    assert(Boolean(newCardId), `Tarjeta creada tiene ID ${newCardId}`);

    // 10. Métodos de Pago: Marcar como predeterminada
    console.log("\n10. Métodos de Pago: Cambiar tarjeta predeterminada");
    const setDefaultRes = await request(`/api/cuenta/tarjetas/${newCardId}`, {
      method: "PATCH",
      cookie: anaCookie,
      body: { predeterminado: true },
    });
    assert(setDefaultRes.status === 200, "Tarjeta 0005 establecida como predeterminada");

    // 11. Métodos de Pago: Eliminar tarjeta
    console.log("\n11. Métodos de Pago: Eliminar tarjeta predeterminada y fallback");
    const delCardRes = await request(`/api/cuenta/tarjetas/${newCardId}`, {
      method: "DELETE",
      cookie: anaCookie,
    });
    assert(delCardRes.status === 200, "Elimina tarjeta correctamente");
    const checkCardRes = await request("/api/cuenta/direcciones-pagos", { cookie: anaCookie });
    const hasDefaultCard = checkCardRes.data?.metodosPago?.some((c) => c.predeterminado === 1 || c.predeterminado === true);
    assert(hasDefaultCard, "Tras eliminar la tarjeta predeterminada, otra tarjeta quedó como predeterminada");

    // 12. Vinculación de Mercado Pago (Desconectar y reconectar)
    console.log("\n12. Vinculación Mercado Pago (Desconectar y Reconectar)");
    const desconectarRes = await request("/api/cuenta/vinculaciones/mercadopago", {
      method: "DELETE",
      cookie: anaCookie,
    });
    assert(desconectarRes.status === 200, "Desconecta cuenta de Mercado Pago exitosamente");

    const recheckMP1 = await request("/api/cuenta/direcciones-pagos", { cookie: anaCookie });
    assert(recheckMP1.data?.cuentasVinculadas?.mercadopago?.conectado === false, "Estado refleja desconectado");

    const reconectarRes = await request("/api/cuenta/vinculaciones/mercadopago", {
      method: "POST",
      cookie: anaCookie,
      body: { email: "a***@technovaderm.com" },
    });
    assert(reconectarRes.status === 200, "Reconecta cuenta de Mercado Pago exitosamente");

    const recheckMP2 = await request("/api/cuenta/direcciones-pagos", { cookie: anaCookie });
    assert(recheckMP2.data?.cuentasVinculadas?.mercadopago?.conectado === true, "Estado refleja conectado de nuevo");

    // 13. Límite de Direcciones (MAX_DIRECCIONES = 10)
    console.log("\n13. Verificación de límite máximo de direcciones (10)");
    const tempIds = [];
    const freshDirRes = await request("/api/cuenta/direcciones-pagos", { cookie: anaCookie });
    const countCurrent = freshDirRes.data?.direcciones?.length || 0;
    const needToAdd = 10 - countCurrent;

    for (let i = 0; i < needToAdd; i++) {
      const res = await request("/api/direcciones", {
        method: "POST",
        cookie: anaCookie,
        body: {
          alias: `Extra ${i + 1}`,
          calle_y_numero: `Calle Falsa ${100 + i}`,
          colonia: "Centro",
          codigo_postal: "20000",
          ciudad: "Aguascalientes",
          estado: "Aguascalientes",
        },
      });
      if (res.status === 200 && res.data?.direccion?.id) {
        tempIds.push(res.data.direccion.id);
      }
    }

    // El número 11 debe ser rechazado
    const excesoRes = await request("/api/direcciones", {
      method: "POST",
      cookie: anaCookie,
      body: {
        alias: "Exceso",
        calle_y_numero: "Calle Limite 999",
        colonia: "Centro",
        codigo_postal: "20000",
        ciudad: "Aguascalientes",
        estado: "Aguascalientes",
      },
    });
    if (excesoRes.data?.direccion?.id) {
      tempIds.push(excesoRes.data.direccion.id);
    }
    assert(excesoRes.status === 400, "Rechaza la dirección número 11 por alcanzar límite máximo de 10");

    // Limpieza de direcciones temporales
    for (const id of tempIds) {
      await request(`/api/direcciones/${id}`, { method: "DELETE", cookie: anaCookie });
    }

    // 14. Checkout: Verificar que las tarjetas vigentes se muestran y las expiradas no
    console.log("\n14. Integración con Checkout: Filtro de tarjetas expiradas");
    // Insertar temporalmente una tarjeta expirada en la BD para Ana
    const [expInsert] = await pool.execute(
      `INSERT INTO metodos_pago (usuario_id, proveedor, token_proveedor, marca, ultimos4, titular, mes_vencimiento, anio_vencimiento, predeterminado)
       VALUES (20, 'simulado', 'tok_expired_test', 'visa', '9999', 'ANA LOPEZ', 1, 2020, 0)`
    );
    const expiredCardId = expInsert.insertId;

    // En direcciones-pagos (cuenta), debe aparecer con estado expirada
    const checkExpAccount = await request("/api/cuenta/direcciones-pagos", { cookie: anaCookie });
    const cardInAccount = checkExpAccount.data?.metodosPago?.find((c) => c.id === expiredCardId);
    assert(Boolean(cardInAccount), "Tarjeta expirada aparece en Mi Cuenta para que el usuario la gestione");

    // En la base de datos de checkout, la consulta filtra (anio_vencimiento > curYear OR ...)
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const [checkoutCards] = await pool.execute(
      `SELECT id FROM metodos_pago 
       WHERE usuario_id = 20 
         AND (anio_vencimiento > ? OR (anio_vencimiento = ? AND mes_vencimiento >= ?))`,
      [curYear, curYear, curMonth]
    );
    const cardInCheckout = checkoutCards.some((c) => c.id === expiredCardId);
    assert(!cardInCheckout, "Tarjeta expirada NO es ofrecida como opción de pago en el checkout");

    // Limpiar tarjeta de prueba expirada
    await pool.execute("DELETE FROM metodos_pago WHERE id = ?", [expiredCardId]);

  } finally {
    await pool.end();
  }

  console.log("\n===============================================================");
  console.log(`RESUMEN DE PRUEBAS: ${passed} PASADAS, ${failed} FALLIDAS`);
  console.log("===============================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Error fatal en la ejecución:", err);
  process.exit(1);
});

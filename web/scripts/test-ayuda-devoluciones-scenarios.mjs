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
  let text = null;
  try {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      json = await res.json();
    } else {
      text = await res.text();
    }
  } catch {
    // no body
  }
  return { status: res.status, headers: res.headers, data: json, text };
}

async function run() {
  console.log("===============================================================");
  console.log("SUITE DE PRUEBAS: AYUDA Y DEVOLUCIONES (TECHNOVA-DERM)");
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
      console.log(`  ✅ PASÓ: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FALLÓ: ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // PRUEBA 1: Consulta general del centro de ayuda (/api/ayuda)
    // -------------------------------------------------------------
    console.log("\n[Prueba 1] Consulta de temas y artículos con variables reemplazadas");
    const resAyuda = await request("/api/ayuda");
    assert(resAyuda.status === 200, "GET /api/ayuda responde 200 OK");
    assert(Array.isArray(resAyuda.data?.temas) && resAyuda.data.temas.length === 4, "Retorna los 4 temas principales");
    assert(Array.isArray(resAyuda.data?.articulos) && resAyuda.data.articulos.length >= 16, "Retorna al menos 16 artículos");

    // Verificar reemplazo dinámico de variables
    const artDevolucion = resAyuda.data?.articulos?.find(a => a.slug === "puedo-devolver-un-producto-abierto");
    assert(
      artDevolucion && artDevolucion.respuesta.includes("30"),
      "Variable {{DIAS_DEVOLUCION}} reemplazada correctamente por '30'"
    );
    assert(!artDevolucion?.respuesta.includes("{{DIAS_DEVOLUCION}}"), "No quedan etiquetas {{DIAS_DEVOLUCION}} sin procesar");

    const artFactura = resAyuda.data?.articulos?.find(a => a.slug === "como-pido-mi-factura");
    assert(
      artFactura && artFactura.respuesta.includes("30"),
      "Variable {{DIAS_PARA_FACTURAR}} reemplazada correctamente por '30'"
    );

    const artEnvios = resAyuda.data?.articulos?.find(a => a.slug === "costos-y-tiempos-de-envio");
    assert(
      artEnvios && artEnvios.respuesta.includes("$99"),
      "Variable {{COSTO_ENVIO}} reemplazada correctamente por '$99'"
    );

    const artRecoger = resAyuda.data?.articulos?.find(a => a.slug === "cuanto-tarda-en-estar-listo-para-recoger");
    assert(
      artRecoger && (artRecoger.respuesta.includes("60 minutos") || artRecoger.respuesta.includes("menos de una hora")),
      "Variable {{MINUTOS_PREPARACION}} reemplazada correctamente por '60'"
    );

    // -------------------------------------------------------------
    // PRUEBA 2: Filtro por tema (?tema=slug)
    // -------------------------------------------------------------
    console.log("\n[Prueba 2] Filtrado de preguntas por tema");
    const resTemaEnvios = await request("/api/ayuda?tema=envios");
    assert(resTemaEnvios.status === 200, "GET /api/ayuda?tema=envios responde 200");
    assert(resTemaEnvios.data?.filtroTema === "envios", "filtroTema refleja 'envios'");
    const todosEnvios = resTemaEnvios.data?.articulos?.every(a => a.temaSlug === "envios");
    assert(todosEnvios, "Todos los artículos devueltos corresponden al tema 'envios'");

    // -------------------------------------------------------------
    // PRUEBA 3: Búsqueda de preguntas (?q=)
    // -------------------------------------------------------------
    console.log("\n[Prueba 3] Búsqueda por texto");
    const resBusqueda = await request("/api/ayuda?q=factura");
    assert(resBusqueda.status === 200, "GET /api/ayuda?q=factura responde 200");
    assert(resBusqueda.data?.articulos?.length > 0, "Encuentra preguntas relacionadas con 'factura'");

    // Búsqueda sin resultados
    const resVacia = await request("/api/ayuda?q=palabrainventadanoexiste999");
    assert(resVacia.status === 200 && resVacia.data?.articulos?.length === 0, "Búsqueda sin coincidencias retorna arreglo vacío");

    // -------------------------------------------------------------
    // PRUEBA 4: Votación de utilidad (/api/ayuda/[id]/util)
    // -------------------------------------------------------------
    console.log("\n[Prueba 4] Votación de utilidad en preguntas");
    const testArticulo = resAyuda.data?.articulos?.[0];
    const utilInicial = testArticulo.utilSi;

    const resVotoSi = await request(`/api/ayuda/${testArticulo.id}/util`, {
      method: "POST",
      body: { util: true },
    });
    assert(resVotoSi.status === 200 && resVotoSi.data?.exito, "POST /api/ayuda/[id]/util con util=true responde exitoso");
    assert(resVotoSi.data?.utilSi === utilInicial + 1, "utilSi se incrementó en +1");

    const [dbVoto] = await pool.execute(
      "SELECT util_si, util_no FROM ayuda_articulos WHERE id = ?",
      [testArticulo.id]
    );
    assert(dbVoto[0]?.util_si === utilInicial + 1, "La base de datos confirma el incremento de util_si");

    // -------------------------------------------------------------
    // PRUEBA 5: Envío de ticket de soporte (/api/ayuda/contacto)
    // -------------------------------------------------------------
    console.log("\n[Prueba 5] Registro de ticket de soporte");
    const resTicket = await request("/api/ayuda/contacto", {
      method: "POST",
      body: {
        correo: "cliente.soporte@ejemplo.com",
        asunto: "Duda con Garantía Dermatológica",
        mensaje: "Hola, me gustaría saber si el protector solar tiene cambio.",
      },
    });
    assert(resTicket.status === 200 && resTicket.data?.exito, "POST /api/ayuda/contacto registra ticket");
    const ticketId = resTicket.data?.ticketId;
    assert(Boolean(ticketId), `Ticket creado tiene ID ${ticketId}`);

    const [dbTicket] = await pool.execute(
      "SELECT id, correo, asunto, estado FROM tickets_soporte WHERE id = ?",
      [ticketId]
    );
    assert(dbTicket[0]?.correo === "cliente.soporte@ejemplo.com" && dbTicket[0]?.estado === "abierto", "BD confirma ticket con estado 'abierto'");

    // -------------------------------------------------------------
    // PRUEBA 6: Pedidos elegibles para devolución (/api/cuenta/devoluciones/pedidos-elegibles)
    // -------------------------------------------------------------
    console.log("\n[Prueba 6] Pedidos elegibles para devolución");
    const resElegiblesUnauth = await request("/api/cuenta/devoluciones/pedidos-elegibles");
    assert(resElegiblesUnauth.status === 401, "GET pedidos-elegibles rechaza sin sesión (401)");

    const resElegibles = await request("/api/cuenta/devoluciones/pedidos-elegibles", { cookie: anaCookie });
    assert(resElegibles.status === 200 && resElegibles.data?.exito, "GET pedidos-elegibles responde 200 para usuario autenticado");
    assert(Array.isArray(resElegibles.data?.pedidos), "Retorna arreglo de pedidos elegibles");

    // -------------------------------------------------------------
    // PRUEBA 7: Creación de devolución con folio único D-XXXX
    // -------------------------------------------------------------
    console.log("\n[Prueba 7] Generación de devolución con folio único (D-XXXX)");
    // Buscamos un pedido entregado de Ana para probar la creación
    const [pedidosEntregados] = await pool.execute(
      `SELECT id, folio FROM pedidos WHERE usuario_id = 20 AND estado = 'entregado' LIMIT 1`
    );

    if (pedidosEntregados.length > 0) {
      const ped = pedidosEntregados[0];
      const [itemsPedido] = await pool.execute(
        `SELECT id FROM pedido_items WHERE pedido_id = ? LIMIT 1`,
        [ped.id]
      );

      if (itemsPedido.length > 0) {
        // Limpiamos devoluciones previas no rechazadas de ese pedido para permitir la prueba
        await pool.execute("DELETE FROM devoluciones WHERE pedido_id = ?", [ped.id]);

        const resDev = await request(`/api/cuenta/pedidos/${ped.folio}/devolucion`, {
          method: "POST",
          cookie: anaCookie,
          body: {
            items: [{ pedido_item_id: itemsPedido[0].id, cantidad: 1 }],
            motivo: "reaccion",
            comentario: "Prueba automatizada de suite",
            metodo: "tienda",
          },
        });

        assert(resDev.status === 200 && resDev.data?.exito, `POST /api/cuenta/pedidos/${ped.folio}/devolucion responde 200`);
        assert(Boolean(resDev.data?.devolucion?.folio), `Retorna folio de devolución: ${resDev.data?.devolucion?.folio}`);
        assert(resDev.data?.devolucion?.folio.startsWith("D-"), "El folio sigue el formato D-XXXX");

        const [devDb] = await pool.execute(
          "SELECT folio, estado FROM devoluciones WHERE id = ?",
          [resDev.data?.devolucion?.id]
        );
        assert(devDb[0]?.folio?.startsWith("D-"), "La columna 'folio' en BD se actualizó correctamente");
      }
    } else {
      console.log("  ℹ️  No hay pedidos en estado entregado para Ana; verificando estructura de tabla devoluciones");
      const [cols] = await pool.execute("SHOW COLUMNS FROM devoluciones LIKE 'folio'");
      assert(cols.length > 0, "Columna 'folio' existe en la tabla devoluciones");
    }

    // -------------------------------------------------------------
    // PRUEBA 8: Verificación de rutas públicas y privadas
    // -------------------------------------------------------------
    console.log("\n[Prueba 8] Páginas /ayuda y /cuenta/ayuda");
    const resPublicPage = await request("/ayuda");
    assert(resPublicPage.status === 200, "GET /ayuda responde 200 OK (vista pública)");
    assert(resPublicPage.text?.includes("¿En qué te ayudamos?"), "Contiene título '¿En qué te ayudamos?'");

    const resCuentaAyudaUnauth = await request("/cuenta/ayuda");
    assert(
      resCuentaAyudaUnauth.status === 307 || resCuentaAyudaUnauth.status === 308 || resCuentaAyudaUnauth.status === 302,
      "GET /cuenta/ayuda redirige a /login cuando no hay sesión activa"
    );

    const resCuentaAyudaAuth = await request("/cuenta/ayuda", { cookie: anaCookie });
    assert(resCuentaAyudaAuth.status === 200, "GET /cuenta/ayuda responde 200 con sesión activa");

    console.log("\n===============================================================");
    console.log(`RESULTADOS FINALES: ${passed} pruebas superadas, ${failed} fallidas.`);
    console.log("===============================================================");
  } catch (error) {
    console.error("Error inesperado en la suite de pruebas:", error);
  } finally {
    await pool.end();
  }
}

run();

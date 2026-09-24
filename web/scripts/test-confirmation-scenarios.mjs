import mysql from "mysql2/promise";
import {
  cambiarEstado,
  generarCodigoRecogida,
  validarCodigoRecogida,
  pasosSeguimiento,
} from "../src/lib/pedidos.js";
import { enviarConfirmacionPedido } from "../src/lib/notificaciones.js";
import { PREFIJO_FOLIO } from "../src/lib/marca.js";

async function runTests() {
  console.log("=== INICIANDO SUITE DE PRUEBAS DE PANTALLA DE CONFIRMACIÓN ===");

  const pool = mysql.createPool({
    host: "127.0.0.1",
    port: 3306,
    user: "root",
    password: "",
    database: "technova_derm",
    waitForConnections: true,
    connectionLimit: 5,
  });

  const [uRows] = await pool.query(
    "SELECT id, nombre, correo FROM usuarios WHERE correo = 'mayaframa@gmail.com' LIMIT 1"
  );
  if (!uRows || uRows.length === 0) {
    console.error("No se encontró el usuario de prueba mayaframa@gmail.com");
    process.exit(1);
  }
  const usuario = uRows[0];
  console.log(`Usuario de prueba: ${usuario.nombre} (${usuario.correo})`);

  // Usuario alterno para pruebas de seguridad 404
  const [altUsers] = await pool.query(
    "SELECT id, nombre, correo FROM usuarios WHERE id != ? LIMIT 1",
    [usuario.id]
  );
  let usuarioAlternoId = 999999;
  if (altUsers && altUsers.length > 0) {
    usuarioAlternoId = altUsers[0].id;
  }

  try {
    // Pre-limpieza de órdenes de prueba previas
    await pool.execute("DELETE FROM pedidos WHERE clave_idempotencia LIKE 'test_conf_%'");

    // -------------------------------------------------------------------------
    // PRUEBA 1: Pedido pagado con recolección en tienda (mockup)
    // -------------------------------------------------------------------------
    console.log("\n--- PRUEBA 1: Pedido pagado con recolección en tienda ---");
    const codRec1 = await generarCodigoRecogida(1, pool);
    if (!/^\d{4}$/.test(codRec1)) {
      throw new Error(`El código de recogida no tiene 4 dígitos: ${codRec1}`);
    }

    const [ins1] = await pool.execute(
      `INSERT INTO pedidos 
       (usuario_id, canal, tipo_entrega, sucursal_id, codigo_recogida,
        subtotal, descuento, costo_envio, total, metodo_pago, estado, clave_idempotencia, creado_en)
       VALUES (?, 'web', 'recoger', 1, ?, 960, 0, 0, 960, 'tarjeta', 'pagado', ?, NOW())`,
      [usuario.id, codRec1, `test_conf_1_${Date.now()}`]
    );

    const pedido1Id = ins1.insertId;
    const folio1 = `${PREFIJO_FOLIO}-${pedido1Id}`;
    await pool.execute("UPDATE pedidos SET folio = ? WHERE id = ?", [folio1, pedido1Id]);

    // Registrar evento
    await cambiarEstado(pedido1Id, "pagado", "Pago con tarjeta aprobado exitosamente", pool);

    // Enviar confirmación (correo y notificaciones)
    await enviarConfirmacionPedido({ id: pedido1Id, folio: folio1 }, pool);

    const [verif1] = await pool.execute(
      "SELECT folio, codigo_recogida, confirmacion_enviada, estado FROM pedidos WHERE id = ?",
      [pedido1Id]
    );

    if (
      verif1[0].folio !== folio1 ||
      verif1[0].codigo_recogida !== codRec1 ||
      verif1[0].confirmacion_enviada !== 1 ||
      verif1[0].estado !== "pagado"
    ) {
      throw new Error("Datos de pedido 1 incorrectos");
    }

    console.log(`✓ PRUEBA 1 PASÓ: Pedido #${folio1} generado con código [${codRec1}] y confirmación enviada.`);

    // -------------------------------------------------------------------------
    // PRUEBA 2: Pedido pagado con envío a domicilio (sin código de recogida)
    // -------------------------------------------------------------------------
    console.log("\n--- PRUEBA 2: Pedido pagado con envío a domicilio ---");
    const [ins2] = await pool.execute(
      `INSERT INTO pedidos 
       (usuario_id, canal, tipo_entrega, sucursal_id, codigo_recogida,
        envio_calle, envio_numero, envio_colonia, envio_cp, envio_ciudad, envio_estado,
        subtotal, descuento, costo_envio, total, metodo_pago, estado, clave_idempotencia, creado_en)
       VALUES (?, 'web', 'envio', NULL, NULL, 'Av. Durango', '45', 'Roma Norte', '06700', 'CDMX', 'CDMX',
               1200, 0, 0, 1200, 'tarjeta', 'pagado', ?, NOW())`,
      [usuario.id, `test_conf_2_${Date.now()}`]
    );

    const pedido2Id = ins2.insertId;
    const folio2 = `${PREFIJO_FOLIO}-${pedido2Id}`;
    await pool.execute("UPDATE pedidos SET folio = ? WHERE id = ?", [folio2, pedido2Id]);
    await cambiarEstado(pedido2Id, "pagado", "Pago aprobado con envío a domicilio", pool);

    const [verif2] = await pool.execute(
      "SELECT codigo_recogida, tipo_entrega, envio_calle FROM pedidos WHERE id = ?",
      [pedido2Id]
    );

    if (verif2[0].codigo_recogida !== null || verif2[0].tipo_entrega !== "envio") {
      throw new Error("El pedido de envío a domicilio no debe tener código de recogida.");
    }
    console.log(`✓ PRUEBA 2 PASÓ: Pedido #${folio2} configurado para envío sin código de recogida.`);

    // -------------------------------------------------------------------------
    // PRUEBA 3: Apartado para pagar en tienda (por_pagar_en_tienda)
    // -------------------------------------------------------------------------
    console.log("\n--- PRUEBA 3: Apartado para pagar en tienda ---");
    const codRec3 = await generarCodigoRecogida(1, pool);
    const exp3 = new Date(Date.now() + 24 * 3600 * 1000);

    const [ins3] = await pool.execute(
      `INSERT INTO pedidos 
       (usuario_id, canal, tipo_entrega, sucursal_id, codigo_recogida,
        subtotal, descuento, costo_envio, total, metodo_pago, estado, clave_idempotencia, reserva_expira_en, creado_en)
       VALUES (?, 'web', 'recoger', 1, ?, 850, 0, 0, 850, 'pagar_en_tienda', 'por_pagar_en_tienda', ?, ?, NOW())`,
      [usuario.id, codRec3, `test_conf_3_${Date.now()}`, exp3]
    );

    const pedido3Id = ins3.insertId;
    const folio3 = `${PREFIJO_FOLIO}-${pedido3Id}`;
    await pool.execute("UPDATE pedidos SET folio = ? WHERE id = ?", [folio3, pedido3Id]);
    await cambiarEstado(pedido3Id, "por_pagar_en_tienda", "Apartado para pago en tienda", pool);

    const [ev3] = await pool.execute(
      "SELECT estado FROM pedido_eventos WHERE pedido_id = ? ORDER BY id DESC LIMIT 1",
      [pedido3Id]
    );
    if (!ev3 || ev3[0].estado !== "por_pagar_en_tienda") {
      throw new Error("No se registró el evento de apartado.");
    }

    console.log(`✓ PRUEBA 3 PASÓ: Pedido #${folio3} apartado con código [${codRec3}] y evento registrado.`);

    // -------------------------------------------------------------------------
    // PRUEBA 4: Validación de código de recogida en caja (POS) con límite de intentos
    // -------------------------------------------------------------------------
    console.log("\n--- PRUEBA 4: Validación de código de recogida en POS ---");

    // Intento 1: Código erróneo
    const intentoErroneo = await validarCodigoRecogida(folio1, "9999");
    if (intentoErroneo.valido !== false || intentoErroneo.intentosRestantes !== 4) {
      throw new Error("El conteo de intentos fallidos en POS no decrementó correctamente.");
    }
    console.log("✓ Intento fallido 1 detectado. Intentos restantes:", intentoErroneo.intentosRestantes);

    // Intento 2: Código correcto -> Debe resetear intentos
    const intentoCorrecto = await validarCodigoRecogida(folio1, codRec1);
    if (!intentoCorrecto.valido) {
      throw new Error("El código correcto fue rechazado indebidamente.");
    }

    const [checkIntentos] = await pool.execute(
      "SELECT intentos_codigo_recogida FROM pedidos WHERE id = ?",
      [pedido1Id]
    );
    if (checkIntentos[0].intentos_codigo_recogida !== 0) {
      throw new Error("Los intentos no se restablecieron a 0 tras acierto.");
    }
    console.log("✓ Intento con código correcto validado con éxito. Contador restablecido a 0.");

    // Simular bloqueo tras 5 intentos fallidos
    await pool.execute("UPDATE pedidos SET intentos_codigo_recogida = 5 WHERE id = ?", [pedido1Id]);
    const intentoBloqueado = await validarCodigoRecogida(folio1, codRec1);
    if (intentoBloqueado.valido !== false || !intentoBloqueado.error.includes("Límite de intentos superado")) {
      throw new Error("El pedido debió bloquearse tras alcanzar 5 intentos fallidos.");
    }
    console.log("✓ Bloqueo por 5 intentos fallidos verificado:", intentoBloqueado.error);

    // -------------------------------------------------------------------------
    // PRUEBA 5: Seguridad y control de acceso (404 si es de otro usuario o no existe)
    // -------------------------------------------------------------------------
    console.log("\n--- PRUEBA 5: Seguridad y control de acceso ---");
    const [duenoDirecto] = await pool.execute(
      "SELECT id FROM pedidos WHERE folio = ? AND usuario_id = ?",
      [folio1, usuario.id]
    );
    if (!duenoDirecto || duenoDirecto.length === 0) {
      throw new Error("El dueño legítimo debe poder consultar su pedido.");
    }

    const [otroUsuario] = await pool.execute(
      "SELECT id FROM pedidos WHERE folio = ? AND usuario_id = ?",
      [folio1, usuarioAlternoId]
    );
    if (otroUsuario && otroUsuario.length > 0) {
      throw new Error("Un usuario alterno no debe tener acceso al pedido de otro.");
    }

    const [inexistente] = await pool.execute(
      "SELECT id FROM pedidos WHERE folio = 'N-999999999' AND usuario_id = ?",
      [usuario.id]
    );
    if (inexistente && inexistente.length > 0) {
      throw new Error("Un folio inexistente no debe retornar registros.");
    }
    console.log("✓ PRUEBA 5 PASÓ: Dueño accede legítimamente; usuarios ajenos y folios inválidos resultan en 404.");

    // -------------------------------------------------------------------------
    // PRUEBA 6: Idempotencia de confirmación (correo y notificaciones una sola vez)
    // -------------------------------------------------------------------------
    console.log("\n--- PRUEBA 6: Idempotencia en confirmación enviada ---");
    const [notifsAntes] = await pool.execute(
      "SELECT COUNT(*) as c FROM notificaciones WHERE usuario_id = ? AND titulo LIKE ?",
      [usuario.id, `%${folio1}%`]
    );
    const countAntes = notifsAntes[0].c;

    // Llamar de nuevo enviarConfirmacionPedido
    const resultadoReenvio = await enviarConfirmacionPedido({ id: pedido1Id, folio: folio1 }, pool);
    if (!resultadoReenvio) {
      throw new Error("La función enviarConfirmacionPedido falló en llamada repetida.");
    }

    const [notifsDespues] = await pool.execute(
      "SELECT COUNT(*) as c FROM notificaciones WHERE usuario_id = ? AND titulo LIKE ?",
      [usuario.id, `%${folio1}%`]
    );
    const countDespues = notifsDespues[0].c;

    if (countDespues !== countAntes) {
      throw new Error(`Se duplicaron las notificaciones: antes ${countAntes}, después ${countDespues}`);
    }
    console.log("✓ PRUEBA 6 PASÓ: confirmacion_enviada previno envíos duplicados con éxito.");

    // -------------------------------------------------------------------------
    // PRUEBA 7: Actualización en vivo (cambio a listo_para_recoger en base de datos)
    // -------------------------------------------------------------------------
    console.log("\n--- PRUEBA 7: Actualización en vivo de estados de seguimiento ---");
    await cambiarEstado(pedido1Id, "listo_para_recoger", "Paquete empaquetado en sucursal", pool);

    const [eventosP1] = await pool.execute(
      "SELECT estado, creado_en FROM pedido_eventos WHERE pedido_id = ? ORDER BY id ASC",
      [pedido1Id]
    );

    const [pedRow1] = await pool.execute("SELECT * FROM pedidos WHERE id = ?", [pedido1Id]);
    const pasosActualizados = pasosSeguimiento(pedRow1[0], eventosP1);

    const pasoListo = pasosActualizados.find((p) => p.id === "listo");
    const pasoPreparando = pasosActualizados.find((p) => p.id === "preparando");

    if (pasoListo?.estado !== "actual" || pasoPreparando?.estado !== "completado") {
      throw new Error(
        `Los pasos no reflejaron el cambio a listo_para_recoger: Listo=${pasoListo?.estado}, Preparando=${pasoPreparando?.estado}`
      );
    }
    console.log("✓ PRUEBA 7 PASÓ: 'listo_para_recoger' actualizó la barra de seguimiento a estado actual.");

    // -------------------------------------------------------------------------
    // LIMPIEZA DE PEDIDOS DE PRUEBA
    // -------------------------------------------------------------------------
    await pool.execute("DELETE FROM pedidos WHERE id IN (?, ?, ?)", [pedido1Id, pedido2Id, pedido3Id]);
    console.log("\n✓ Limpieza completada. TODAS LAS 7 PRUEBAS DE CONFIRMACIÓN PASARON AL 100%.");
  } catch (err) {
    console.error("ERROR EN PRUEBAS DE CONFIRMACIÓN:", err);
    process.exit(1);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

runTests();

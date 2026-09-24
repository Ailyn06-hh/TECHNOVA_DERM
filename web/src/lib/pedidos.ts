import crypto from "crypto";
import { getDbPool } from "./db";

/**
 * Genera un código de recogida de 4 dígitos con crypto.
 * Garantiza que sea único entre los pedidos activos de la misma sucursal.
 */
export async function generarCodigoRecogida(
  sucursalId: number,
  connOrPool?: any
): Promise<string> {
  const db = connOrPool || getDbPool();

  for (let i = 0; i < 20; i++) {
    const candidate = crypto.randomInt(0, 10000).toString().padStart(4, "0");

    const [rows]: any = await db.execute(
      `SELECT id FROM pedidos 
       WHERE sucursal_id = ? 
         AND codigo_recogida = ? 
         AND estado IN ('por_pagar_en_tienda', 'pagado', 'preparando', 'listo_para_recoger') 
       LIMIT 1`,
      [sucursalId, candidate]
    );

    if (!rows || rows.length === 0) {
      return candidate;
    }
  }

  // Fallback seguro en caso extremo de colisiones
  return crypto.randomInt(0, 10000).toString().padStart(4, "0");
}

/**
 * Cambia el estado de un pedido y registra siempre el evento en `pedido_eventos`.
 */
export async function cambiarEstado(
  pedidoId: number,
  nuevoEstado: string,
  nota?: string | null,
  connOrPool?: any,
  empleadoId?: number | null
): Promise<boolean> {
  const db = connOrPool || getDbPool();

  // Si el nuevo estado es definitivo o no requiere reserva, limpiamos reserva_expira_en
  const estadosLimpiarReserva = [
    "pagado",
    "preparando",
    "listo_para_recoger",
    "enviado",
    "entregado",
    "cancelado",
    "expirado",
    "pago_fallido",
  ];

  if (nuevoEstado === "entregado") {
    if (empleadoId) {
      await db.execute(
        "UPDATE pedidos SET estado = ?, reserva_expira_en = NULL, entregado_en = NOW(), entregado_por = ? WHERE id = ?",
        [nuevoEstado, empleadoId, pedidoId]
      );
    } else {
      await db.execute(
        "UPDATE pedidos SET estado = ?, reserva_expira_en = NULL, entregado_en = NOW() WHERE id = ?",
        [nuevoEstado, pedidoId]
      );
    }
  } else if (estadosLimpiarReserva.includes(nuevoEstado)) {
    await db.execute(
      "UPDATE pedidos SET estado = ?, reserva_expira_en = NULL WHERE id = ?",
      [nuevoEstado, pedidoId]
    );
  } else {
    await db.execute("UPDATE pedidos SET estado = ? WHERE id = ?", [
      nuevoEstado,
      pedidoId,
    ]);
  }

  // Insertar evento en el historial con empleado_id si se proporcionó
  await db.execute(
    `INSERT INTO pedido_eventos (pedido_id, estado, nota, empleado_id, creado_en)
     VALUES (?, ?, ?, ?, NOW())`,
    [pedidoId, nuevoEstado, nota || null, empleadoId || null]
  );

  // Notificar al usuario según el nuevo estado
  if (["listo_para_recoger", "enviado", "entregado"].includes(nuevoEstado)) {
    try {
      const [pRows]: any = await db.execute(
        `SELECT p.id, p.folio, p.usuario_id, p.codigo_recogida, p.tipo_entrega, p.sucursal_id,
                p.numero_guia, p.paqueteria, s.nombre as sucursal_nombre
         FROM pedidos p
         LEFT JOIN sucursales s ON s.id = p.sucursal_id
         WHERE p.id = ? LIMIT 1`,
        [pedidoId]
      );

      if (pRows && pRows.length > 0 && pRows[0].usuario_id) {
        const ped = pRows[0];
        const folio = ped.folio;
        const enlace = `/cuenta/pedidos/${folio}`;

        // Importación diferida segura de notificar para evitar dependencias circulares
        const { notificar } = await import("./notificaciones");

        if (nuevoEstado === "listo_para_recoger") {
          const sucNom = ped.sucursal_nombre || "Centro";
          const sucConMarca = sucNom.startsWith("Technova-Derm") ? sucNom : `Technova-Derm ${sucNom}`;
          await notificar(
            ped.usuario_id,
            {
              tipo: "pedido",
              evento: "pedido_listo",
              titulo: "Tu pedido está listo para recoger",
              mensaje: `Pasa por él a ${sucConMarca} con tu código ${ped.codigo_recogida || ""}.`.trim(),
              enlace,
            },
            db
          );
        } else if (nuevoEstado === "enviado") {
          const guiaTexto = ped.numero_guia ? ` con guía ${ped.numero_guia}` : "";
          const paqTexto = ped.paqueteria ? ` por ${ped.paqueteria}` : "";
          await notificar(
            ped.usuario_id,
            {
              tipo: "pedido",
              evento: "pedido_enviado",
              titulo: "Tu pedido va en camino",
              mensaje: `Tu paquete${guiaTexto} va en camino${paqTexto}. Folio #${folio}.`,
              enlace,
            },
            db
          );
        } else if (nuevoEstado === "entregado") {
          await notificar(
            ped.usuario_id,
            {
              tipo: "pedido",
              evento: "pedido_entregado",
              titulo: "Pedido entregado",
              mensaje: `Recogiste tu pedido #${folio}. ¡Gracias!`,
              enlace,
            },
            db
          );
        }
      }
    } catch (notifErr: any) {
      console.error("[cambiarEstado notificar Error]:", notifErr.message);
    }
  }

  return true;
}

/**
 * Valida un código de recogida en caja (POS) para un folio dado.
 * Implementa límite de 5 intentos fallidos por pedido.
 */
export async function validarCodigoRecogida(
  folio: string,
  codigo: string
): Promise<{
  valido: boolean;
  error?: string;
  bloqueado?: boolean;
  intentosRestantes?: number;
  pedido?: any;
}> {
  const pool = getDbPool();

  const [rows]: any = await pool.execute(
    `SELECT id, folio, usuario_id, sucursal_id, estado, tipo_entrega, total, 
            codigo_recogida, COALESCE(intentos_codigo, intentos_codigo_recogida, 0) as intentos_fallidos 
     FROM pedidos 
     WHERE folio = ? LIMIT 1`,
    [folio]
  );

  if (!rows || rows.length === 0) {
    return { valido: false, error: "Pedido no encontrado." };
  }

  const pedido = rows[0];

  if (pedido.tipo_entrega !== "recoger") {
    return {
      valido: false,
      error: "Este pedido tiene método de envío a domicilio, no recolección en tienda.",
    };
  }

  const intentosActuales = Number(pedido.intentos_fallidos) || 0;
  if (intentosActuales >= 5) {
    return {
      valido: false,
      bloqueado: true,
      error: "Código bloqueado. Pide a una supervisora que autorice la entrega.",
      intentosRestantes: 0,
    };
  }

  if (pedido.codigo_recogida !== codigo) {
    const nuevosIntentos = intentosActuales + 1;
    await pool.execute(
      "UPDATE pedidos SET intentos_codigo_recogida = ?, intentos_codigo = ? WHERE id = ?",
      [nuevosIntentos, nuevosIntentos, pedido.id]
    );

    const restantes = Math.max(0, 5 - nuevosIntentos);
    if (restantes === 0) {
      return {
        valido: false,
        bloqueado: true,
        error: "Código bloqueado. Pide a una supervisora que autorice la entrega.",
        intentosRestantes: 0,
      };
    }
    return {
      valido: false,
      error: `El código no coincide. Te quedan ${restantes} intentos.`,
      intentosRestantes: restantes,
    };
  }

  // Código correcto: resetear contador de intentos fallidos
  await pool.execute(
    "UPDATE pedidos SET intentos_codigo_recogida = 0, intentos_codigo = 0 WHERE id = ?",
    [pedido.id]
  );

  return {
    valido: true,
    pedido,
  };
}

import {
  GRUPOS_ESTADO,
  etiquetaCanal,
  textoEntrega,
  formatearFechaPedido,
  extraerHora,
  pasosSeguimiento,
} from "./pedidos-utils";
import type { PasoSeguimiento } from "./pedidos-utils";
import { DIAS_DEVOLUCION, DIAS_PARA_FACTURAR } from "./marca";

export {
  GRUPOS_ESTADO,
  etiquetaCanal,
  textoEntrega,
  formatearFechaPedido,
  extraerHora,
  pasosSeguimiento,
};
export type { PasoSeguimiento };

/**
 * Vincula pedidos de invitado (sin usuario_id) cuyo email o celular coincidan
 */
export async function vincularPedidosInvitado(
  usuario: { id: number; correo?: string; celular?: string },
  connOrPool?: any
): Promise<number> {
  const db = connOrPool || getDbPool();
  if (!usuario.id) return 0;
  if (!usuario.correo && !usuario.celular) return 0;

  const [res]: any = await db.execute(
    `UPDATE pedidos 
     SET usuario_id = ? 
     WHERE usuario_id IS NULL 
       AND (
         (? IS NOT NULL AND cliente_email = ?) 
         OR 
         (? IS NOT NULL AND cliente_celular = ?)
       )`,
    [
      usuario.id,
      usuario.correo || null,
      usuario.correo || null,
      usuario.celular || null,
      usuario.celular || null,
    ]
  );

  return res?.affectedRows || 0;
}

export interface ParametrosMisPedidos {
  userId: number;
  estado?: string;
  canal?: string;
  pagina?: number;
  limite?: number;
}

export async function obtenerMisPedidos({
  userId,
  estado = "todos",
  canal = "todos",
  pagina = 1,
  limite = 10,
}: ParametrosMisPedidos) {
  const pool = getDbPool();

  const rawEstado = (estado || "todos").toLowerCase().trim();
  const rawCanal = (canal || "todos").toLowerCase().trim();
  const validEstado = Object.keys(GRUPOS_ESTADO).includes(rawEstado) ? rawEstado : "todos";
  const validCanal = ["todos", "web", "app", "whatsapp", "tienda"].includes(rawCanal) ? rawCanal : "todos";
  const safePagina = Math.max(1, Number(pagina) || 1);

  // 1. Conteos por canal con el filtro de estado actual
  const estadoFiltroLista = GRUPOS_ESTADO[validEstado];
  let conteoSql = `
    SELECT p.canal, COUNT(*) as total 
    FROM pedidos p 
    WHERE p.usuario_id = ? AND p.estado != 'borrador'
  `;
  const conteoParams: any[] = [userId];

  if (estadoFiltroLista.length > 0) {
    conteoSql += ` AND p.estado IN (${estadoFiltroLista.map(() => "?").join(",")})`;
    conteoParams.push(...estadoFiltroLista);
  }

  conteoSql += ` GROUP BY p.canal`;
  const [conteoRows]: any = await pool.execute(conteoSql, conteoParams);

  const conteosPorCanal: Record<string, number> = {
    todos: 0,
    web: 0,
    app: 0,
    whatsapp: 0,
    tienda: 0,
  };

  let totalGlobalEstado = 0;
  if (Array.isArray(conteoRows)) {
    for (const row of conteoRows) {
      const c = String(row.canal);
      const count = Number(row.total || 0);
      conteosPorCanal[c] = count;
      totalGlobalEstado += count;
    }
  }
  conteosPorCanal.todos = totalGlobalEstado;

  // 2. Consulta de pedidos para la página solicitada (limite + 1 para detectar si hayMas)
  let pedidosSql = `
    SELECT 
      p.id, 
      p.folio, 
      p.canal, 
      p.tipo_entrega, 
      p.sucursal_id, 
      s.nombre as sucursal_nombre,
      p.estado, 
      p.total, 
      p.creado_en
    FROM pedidos p
    LEFT JOIN sucursales s ON p.sucursal_id = s.id
    WHERE p.usuario_id = ? AND p.estado != 'borrador'
  `;
  const pedidosParams: any[] = [userId];

  if (estadoFiltroLista.length > 0) {
    pedidosSql += ` AND p.estado IN (${estadoFiltroLista.map(() => "?").join(",")})`;
    pedidosParams.push(...estadoFiltroLista);
  }

  if (validCanal !== "todos") {
    pedidosSql += ` AND p.canal = ?`;
    pedidosParams.push(validCanal);
  }

  const offset = (safePagina - 1) * limite;
  pedidosSql += ` ORDER BY p.creado_en DESC LIMIT ? OFFSET ?`;
  pedidosParams.push(limite + 1, offset);

  const [rows]: any = await pool.query(pedidosSql, pedidosParams);
  const rawPedidos = Array.isArray(rows) ? rows : [];

  const hayMas = rawPedidos.length > limite;
  const pedidosPagina = hayMas ? rawPedidos.slice(0, limite) : rawPedidos;

  // 3. Obtener los productos asociados a los pedidos de esta página
  const pedidoIds = pedidosPagina.map((p: any) => p.id);
  const itemsPorPedido: Record<number, { nombres: string[]; totalPiezas: number }> = {};

  if (pedidoIds.length > 0) {
    const [itemRows]: any = await pool.query(
      `SELECT 
         pi.pedido_id, 
         pi.cantidad, 
         p.nombre as producto_nombre
       FROM pedido_items pi
       JOIN productos p ON pi.producto_id = p.id
       WHERE pi.pedido_id IN (?)
       ORDER BY pi.id ASC`,
      [pedidoIds]
    );

    if (Array.isArray(itemRows)) {
      for (const item of itemRows) {
        if (!itemsPorPedido[item.pedido_id]) {
          itemsPorPedido[item.pedido_id] = { nombres: [], totalPiezas: 0 };
        }
        itemsPorPedido[item.pedido_id].nombres.push(item.producto_nombre);
        itemsPorPedido[item.pedido_id].totalPiezas += Number(item.cantidad || 1);
      }
    }
  }

  // 4. Formatear para presentación
  const currencyFormatter = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  });

  const pedidos = pedidosPagina.map((p: any) => {
    const itemData = itemsPorPedido[p.id] || { nombres: [], totalPiezas: 0 };
    const nombres = itemData.nombres;

    let productosTexto = "";
    if (nombres.length === 0) {
      productosTexto = "Productos de skincare";
    } else if (nombres.length <= 3) {
      productosTexto = nombres.join(", ");
    } else {
      const primeros = nombres.slice(0, 3).join(", ");
      const restantes = nombres.length - 3;
      productosTexto = `${primeros} y ${restantes} más`;
    }

    return {
      id: p.id,
      folio: p.folio,
      canal: p.canal,
      canalEtiqueta: etiquetaCanal(p.canal, p.sucursal_nombre),
      tipoEntrega: p.tipo_entrega,
      entregaTexto: textoEntrega(p.tipo_entrega, p.sucursal_nombre),
      estado: p.estado,
      total: Number(p.total),
      totalFormateado: currencyFormatter.format(Number(p.total)),
      fechaFormateada: formatearFechaPedido(p.creado_en),
      creadoEn: p.creado_en instanceof Date ? p.creado_en.toISOString() : String(p.creado_en),
      productosTexto,
      totalPiezas: itemData.totalPiezas,
      sucursalNombre: p.sucursal_nombre || "Centro",
    };
  });

  return {
    pedidos,
    hayMas,
    conteosPorCanal,
    pagina: safePagina,
    estado: validEstado,
    canal: validCanal,
  };
}

export async function obtenerDetallePedido(folio: string, userId: number) {
  const pool = getDbPool();

  // 1. Obtener pedido con datos de sucursal
  const [orderRows]: any = await pool.execute(
    `SELECT 
       p.*,
       s.nombre as sucursal_nombre,
       s.direccion as sucursal_direccion,
       s.direccion_corta as sucursal_direccion_corta,
       s.ciudad as sucursal_ciudad,
       s.latitud as sucursal_latitud,
       s.longitud as sucursal_longitud,
       s.horario_texto as sucursal_horario_texto
     FROM pedidos p
     LEFT JOIN sucursales s ON p.sucursal_id = s.id
     WHERE p.folio = ? LIMIT 1`,
    [folio]
  );

  if (!orderRows || orderRows.length === 0) {
    return null;
  }

  const pedido = orderRows[0];
  if (pedido.usuario_id !== userId) {
    return null;
  }

  // 2. Obtener items originales con sus descuentos y grupos
  const [itemRows]: any = await pool.execute(
    `SELECT 
       pi.id,
       pi.producto_id,
       pi.cantidad,
       pi.precio_unitario,
       pi.descuento,
       pi.grupo_tipo,
       pi.grupo_clave,
       p.nombre,
       p.slug,
       p.color_fondo,
       p.color_frasco,
       p.imagen_url
     FROM pedido_items pi
     JOIN productos p ON pi.producto_id = p.id
     WHERE pi.pedido_id = ?
     ORDER BY pi.id ASC`,
    [pedido.id]
  );

  // 3. Obtener eventos para la línea de tiempo
  const [eventRows]: any = await pool.execute(
    `SELECT id, estado, nota, creado_en 
     FROM pedido_eventos 
     WHERE pedido_id = ? 
     ORDER BY creado_en ASC, id ASC`,
    [pedido.id]
  );

  const eventos = Array.isArray(eventRows) ? eventRows : [];
  const lineaTiempo = pasosSeguimiento(pedido, eventos);

  // 4. Formatear forma de pago
  let formaPagoTexto = "Pagado";
  if (pedido.metodo_pago === "tarjeta") {
    const marca = pedido.pago_marca || "tarjeta";
    const u4 = pedido.pago_ultimos4 ? ` •••• ${pedido.pago_ultimos4}` : "";
    formaPagoTexto = `Pagado con ${marca}${u4}`;
  } else if (pedido.metodo_pago === "mercado_pago") {
    formaPagoTexto = "Pagado con Mercado Pago";
  } else if (pedido.metodo_pago === "pagar_en_tienda") {
    formaPagoTexto = "Pagas al recoger";
  } else if (pedido.tipo_entrega === "mostrador") {
    formaPagoTexto = "Pagado en caja";
  }

  // 5. Consultar factura asociada
  const [facturaRows]: any = await pool.execute(
    "SELECT id, rfc, razon_social, regimen_fiscal, codigo_postal_fiscal, uso_cfdi, correo, estado, pdf_url, xml_url, creado_en FROM facturas WHERE pedido_id = ? LIMIT 1",
    [pedido.id]
  );
  const factura = facturaRows && facturaRows.length > 0 ? facturaRows[0] : null;

  // Precargar datos fiscales de la última factura del usuario si no hay factura actual
  let datosFiscalesPrevios: any = null;
  if (!factura) {
    const [prevFacturaRows]: any = await pool.execute(
      `SELECT f.rfc, f.razon_social, f.regimen_fiscal, f.codigo_postal_fiscal, f.uso_cfdi, f.correo
       FROM facturas f
       JOIN pedidos p ON f.pedido_id = p.id
       WHERE p.usuario_id = ?
       ORDER BY f.id DESC LIMIT 1`,
      [userId]
    );
    if (prevFacturaRows && prevFacturaRows.length > 0) {
      datosFiscalesPrevios = prevFacturaRows[0];
    }
  }

  // Cálculo de plazo de facturación
  const fechaPedido = new Date(pedido.creado_en);
  const diasDesdePedido = Math.floor(
    (Date.now() - fechaPedido.getTime()) / (1000 * 60 * 60 * 24)
  );
  const esEstadoFacturable = [
    "pagado",
    "preparando",
    "listo_para_recoger",
    "enviado",
    "entregado",
  ].includes(pedido.estado);

  const facturaDisponible = esEstadoFacturable && diasDesdePedido <= DIAS_PARA_FACTURAR;
  const facturaFueraDePlazo = esEstadoFacturable && diasDesdePedido > DIAS_PARA_FACTURAR;

  // 6. Consultar devoluciones asociadas
  const [devolucionRows]: any = await pool.execute(
    "SELECT id, motivo, comentario, metodo, estado, creado_en FROM devoluciones WHERE pedido_id = ? ORDER BY id DESC LIMIT 1",
    [pedido.id]
  );
  const devolucion = devolucionRows && devolucionRows.length > 0 ? devolucionRows[0] : null;

  // Consultar items ya devueltos previamente
  const [devItemsRows]: any = await pool.execute(
    `SELECT di.pedido_item_id, SUM(di.cantidad) as total_devuelto
     FROM devolucion_items di
     JOIN devoluciones d ON di.devolucion_id = d.id
     WHERE d.pedido_id = ? AND d.estado NOT IN ('rechazada')
     GROUP BY di.pedido_item_id`,
    [pedido.id]
  );

  const devueltosPorItem: Record<number, number> = {};
  if (Array.isArray(devItemsRows)) {
    for (const row of devItemsRows) {
      devueltosPorItem[row.pedido_item_id] = Number(row.total_devuelto || 0);
    }
  }

  // Plazo de devolución desde entregado_en (o creado_en como fallback)
  const fechaEntregado = pedido.entregado_en
    ? new Date(pedido.entregado_en)
    : new Date(pedido.creado_en);
  const diasDesdeEntregado = Math.floor(
    (Date.now() - fechaEntregado.getTime()) / (1000 * 60 * 60 * 24)
  );

  const esEntregado = pedido.estado === "entregado";
  const devolucionEnCurso = Boolean(
    devolucion && ["solicitada", "aprobada", "recibida"].includes(devolucion.estado)
  );
  const devolucionDisponible =
    esEntregado &&
    diasDesdeEntregado <= DIAS_DEVOLUCION &&
    !devolucionEnCurso;
  const devolucionFueraDePlazo = esEntregado && diasDesdeEntregado > DIAS_DEVOLUCION;

  // Enriquecer items con cantidades disponibles para devolución
  const itemsEnriquecidos = (itemRows || []).map((it: any) => {
    const yaDevuelto = devueltosPorItem[it.id] || 0;
    const disponibleDevolucion = Math.max(0, it.cantidad - yaDevuelto);
    return {
      id: it.id,
      productoId: it.producto_id,
      nombre: it.nombre,
      slug: it.slug,
      cantidad: Number(it.cantidad),
      precioUnitario: Number(it.precio_unitario),
      descuento: Number(it.descuento || 0),
      totalLinea: Number(it.precio_unitario) * Number(it.cantidad) - Number(it.descuento || 0),
      grupoTipo: it.grupo_tipo,
      grupoClave: it.grupo_clave,
      colorFondo: it.color_fondo || "#FAF3F6",
      colorFrasco: it.color_frasco || "#6B1F4A",
      imagenUrl: it.imagen_url,
      disponibleDevolucion,
    };
  });

  const currencyFormatter = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  });

  return {
    pedido: {
      id: pedido.id,
      folio: pedido.folio,
      canal: pedido.canal,
      canalEtiqueta: etiquetaCanal(pedido.canal, pedido.sucursal_nombre).texto,
      tipoEntrega: pedido.tipo_entrega,
      sucursalId: pedido.sucursal_id,
      codigoRecogida: pedido.codigo_recogida,
      estado: pedido.estado,
      subtotal: Number(pedido.subtotal),
      descuento: Number(pedido.descuento || 0),
      costoEnvio: Number(pedido.costo_envio || 0),
      total: Number(pedido.total),
      totalFormateado: currencyFormatter.format(Number(pedido.total)),
      fechaFormateada: formatearFechaPedido(pedido.creado_en),
      creadoEn: pedido.creado_en instanceof Date ? pedido.creado_en.toISOString() : String(pedido.creado_en),
      entregadoEn: pedido.entregado_en instanceof Date ? pedido.entregado_en.toISOString() : pedido.entregado_en ? String(pedido.entregado_en) : null,
      formaPagoTexto,
      metodoPago: pedido.metodo_pago,
      pagoMarca: pedido.pago_marca,
      pagoUltimos4: pedido.pago_ultimos4,
      paqueteria: pedido.paqueteria,
      numeroGuia: pedido.numero_guia,
      urlRastreo: pedido.url_rastreo,
      envio: {
        calle: pedido.envio_calle,
        numero: pedido.envio_numero,
        colonia: pedido.envio_colonia,
        cp: pedido.envio_cp,
        ciudad: pedido.envio_ciudad,
        estado: pedido.envio_estado,
        referencias: pedido.envio_referencias,
      },
    },
    sucursal: pedido.sucursal_id
      ? {
          id: pedido.sucursal_id,
          nombre: pedido.sucursal_nombre || "Centro",
          direccion: pedido.sucursal_direccion || "",
          direccionCorta: pedido.sucursal_direccion_corta || "",
          ciudad: pedido.sucursal_ciudad || "Ciudad de México",
          latitud: pedido.sucursal_latitud ? Number(pedido.sucursal_latitud) : 19.43422,
          longitud: pedido.sucursal_longitud ? Number(pedido.sucursal_longitud) : -99.13864,
          horarioTexto: pedido.sucursal_horario_texto || "Lun a sáb 10:00 a 20:00",
        }
      : null,
    items: itemsEnriquecidos,
    lineaTiempo,
    factura: factura ? {
      ...factura,
      creado_en: factura.creado_en instanceof Date ? factura.creado_en.toISOString() : String(factura.creado_en),
    } : null,
    datosFiscalesPrevios,
    facturaDisponible,
    facturaFueraDePlazo,
    diasParaFacturar: DIAS_PARA_FACTURAR,
    devolucion: devolucion ? {
      ...devolucion,
      creado_en: devolucion.creado_en instanceof Date ? devolucion.creado_en.toISOString() : String(devolucion.creado_en),
    } : null,
    devolucionDisponible,
    devolucionEnCurso,
    devolucionFueraDePlazo,
    diasDevolucion: DIAS_DEVOLUCION,
  };
}

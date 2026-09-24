import { getDbPool } from "@/lib/db";
import { PREFIJO_FOLIO_POS } from "@/lib/marca";

export interface PosTicketItem {
  id: number;
  producto_id: number;
  nombre: string;
  sku: string;
  codigo_barras: string | null;
  cantidad: number;
  precio_lista: number;
  precio_unitario: number;
  descuento: number;
  subtotal: number;
  color_fondo: string;
  color_frasco: string;
  tipo_rutina: string | null;
  grupo_tipo: "combo" | "rutina" | null;
  grupo_clave: string | null;
  stock_tienda: number;
}

export interface PosLineaDescuento {
  id: string;
  concepto: string;
  monto: number;
  tipo: "precio_especial" | "combo" | "rutina" | "manual";
}

export interface PosClientaInfo {
  id: number;
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  correo: string;
  celular: string | null;
  celularEnmascarado: string;
}

export interface PosTicket {
  id: number;
  folio: string;
  turnoId: number;
  cajaId: number;
  sucursalId: number;
  empleadoId: number;
  estado: "borrador" | "entregado" | "cancelado";
  fechaHoraTexto: string;
  fechaCreacion: string;
  clienta: PosClientaInfo | null;
  items: PosTicketItem[];
  lineasDescuento: PosLineaDescuento[];
  subtotal: number;
  totalDescuento: number;
  total: number;
  totalArticulos: number;
}

/**
 * Enmascara un número de celular: ***-***-1234
 */
export function enmascararCelular(celular: string | null | undefined): string {
  if (!celular) return "";
  const clean = celular.replace(/\D/g, "");
  if (clean.length < 4) return clean;
  const ultimos4 = clean.slice(-4);
  return `***-***-${ultimos4}`;
}

/**
 * Formatea fecha y hora al estilo del mockup: "23 sep · 17:12"
 */
export function formatearFechaTicket(fecha: Date | string): string {
  const d = new Date(fecha);
  const meses = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic"
  ];
  const dia = d.getDate();
  const mes = meses[d.getMonth()] || "";
  const horas = String(d.getHours()).padStart(2, "0");
  const minutos = String(d.getMinutes()).padStart(2, "0");
  return `${dia} ${mes} · ${horas}:${minutos}`;
}

/**
 * Obtiene o crea la venta en borrador para el turno actual de la colaboradora
 */
export async function getOrCreateBorradorVenta(
  turnoId: number,
  sucursalId: number,
  empleadoId: number,
  cajaId: number
): Promise<PosTicket> {
  const pool = getDbPool();

  // 1. Buscar borrador existente en este turno
  const [draftRows]: any = await pool.execute(
    `SELECT id FROM pedidos 
     WHERE turno_id = ? AND estado = 'borrador'
     ORDER BY id DESC LIMIT 1`,
    [turnoId]
  );

  let pedidoId: number;

  if (draftRows && draftRows.length > 0) {
    pedidoId = draftRows[0].id;
  } else {
    // 2. Crear un nuevo pedido en estado 'borrador'
    const [insertResult]: any = await pool.execute(
      `INSERT INTO pedidos (
        folio, canal, tipo_entrega, sucursal_id, empleado_id, turno_id, caja_id,
        subtotal, descuento, total, estado, creado_en
      ) VALUES (
        NULL, 'tienda', 'mostrador', ?, ?, ?, ?,
        0.00, 0.00, 0.00, 'borrador', NOW()
      )`,
      [sucursalId, empleadoId, turnoId, cajaId]
    );

    pedidoId = insertResult.insertId;
    const folioGenerado = `${PREFIJO_FOLIO_POS || "V"}-${pedidoId}`;

    await pool.execute("UPDATE pedidos SET folio = ? WHERE id = ?", [
      folioGenerado,
      pedidoId,
    ]);
  }

  return await calcularTicketPos(pedidoId, sucursalId);
}

/**
 * Calcula en tiempo real el ticket del POS:
 * precios de lista, precios especiales, descuentos de combos y existencias en la sucursal.
 */
export async function calcularTicketPos(
  pedidoId: number,
  sucursalId: number
): Promise<PosTicket> {
  const pool = getDbPool();

  // 1. Consultar pedido base
  const [pedRows]: any = await pool.execute(
    `SELECT p.id, p.folio, p.usuario_id, p.sucursal_id, p.empleado_id, 
            p.turno_id, p.caja_id, p.estado, p.creado_en,
            u.id as user_id, u.nombre as user_nombre, u.apellido as user_apellido,
            u.correo as user_correo, u.celular as user_celular
     FROM pedidos p
     LEFT JOIN usuarios u ON u.id = p.usuario_id
     WHERE p.id = ? LIMIT 1`,
    [pedidoId]
  );

  if (!pedRows || pedRows.length === 0) {
    throw new Error(`Venta con ID ${pedidoId} no encontrada`);
  }

  const pedido = pedRows[0];

  // 2. Preparar datos de clienta si está asignada
  let clienta: PosClientaInfo | null = null;
  if (pedido.usuario_id && pedido.user_id) {
    clienta = {
      id: pedido.user_id,
      nombre: pedido.user_nombre,
      apellido: pedido.user_apellido,
      nombreCompleto: `${pedido.user_nombre} ${pedido.user_apellido}`.trim(),
      correo: pedido.user_correo,
      celular: pedido.user_celular,
      celularEnmascarado: enmascararCelular(pedido.user_celular),
    };
  }

  // 3. Consultar items del pedido
  const [itemRows]: any = await pool.execute(
    `SELECT 
       pi.id as item_id,
       pi.producto_id,
       pi.cantidad,
       pi.precio_unitario,
       pi.descuento,
       pi.grupo_tipo,
       pi.grupo_clave,
       p.nombre as prod_nombre,
       p.sku as prod_sku,
       p.codigo_barras as prod_codigo_barras,
       p.precio as prod_precio,
       p.precio_especial as prod_precio_especial,
       p.color_fondo as prod_color_fondo,
       p.color_frasco as prod_color_frasco,
       p.tipo_rutina as prod_tipo_rutina,
       COALESCE(i.existencias, 0) as stock_tienda
     FROM pedido_items pi
     JOIN productos p ON p.id = pi.producto_id
     LEFT JOIN inventario i ON i.producto_id = p.id AND i.sucursal_id = ?
     WHERE pi.pedido_id = ?
     ORDER BY pi.id ASC`,
    [sucursalId, pedidoId]
  );

  const rawItems: any[] = itemRows || [];

  // 4. Analizar combos vigentes en los items
  const combosMap = new Map<string, any[]>();
  for (const item of rawItems) {
    if (item.grupo_tipo === "combo" && item.grupo_clave) {
      if (!combosMap.has(item.grupo_clave)) {
        combosMap.set(item.grupo_clave, []);
      }
      combosMap.get(item.grupo_clave)!.push(item);
    }
  }

  // Verificar integridad de cada grupo combo
  const combosValidos = new Map<string, { nombre: string; descuentoPct: number; descuentoMonto: number }>();

  for (const [grupoClave, itemsGrupo] of Array.from(combosMap.entries())) {
    // Consultar combo por slug o id
    const [comboRows]: any = await pool.execute(
      "SELECT id, nombre, slug, descuento_porcentaje, activo FROM combos WHERE slug = ? OR id = ? LIMIT 1",
      [grupoClave, Number(grupoClave) || 0]
    );

    if (comboRows && comboRows.length > 0 && comboRows[0].activo) {
      const combo = comboRows[0];
      const [cpRows]: any = await pool.execute(
        "SELECT producto_id, cantidad FROM combo_productos WHERE combo_id = ?",
        [combo.id]
      );
      const reqMap = new Map<number, number>();
      for (const cp of cpRows) {
        reqMap.set(Number(cp.producto_id), Number(cp.cantidad));
      }

      // Comprobar si todos los productos requeridos están presentes
      let esCompleto = true;
      let subtotalCombo = 0;
      for (const [prodId, reqQty] of Array.from(reqMap.entries())) {
        const itemP = itemsGrupo.find((i) => Number(i.producto_id) === prodId);
        if (!itemP || itemP.cantidad < reqQty) {
          esCompleto = false;
          break;
        }
      }

      if (esCompleto) {
        for (const itemP of itemsGrupo) {
          const precioBase = Number(itemP.prod_precio);
          subtotalCombo += precioBase * itemP.cantidad;
        }
        const descuentoPct = Number(combo.descuento_porcentaje);
        const descuentoMonto = Math.round(subtotalCombo * (descuentoPct / 100) * 100) / 100;
        combosValidos.set(grupoClave, {
          nombre: combo.nombre,
          descuentoPct,
          descuentoMonto,
        });
      }
    }
  }

  // 5. Procesar items y líneas de descuento
  const ticketItems: PosTicketItem[] = [];
  const lineasDescuento: PosLineaDescuento[] = [];
  let subtotalGeneral = 0;
  let totalDescuentoGeneral = 0;

  for (const item of rawItems) {
    const precioLista = Number(item.prod_precio);
    const precioEspecial = item.prod_precio_especial !== null ? Number(item.prod_precio_especial) : null;
    const cantidad = Number(item.cantidad);
    const stockTienda = Number(item.stock_tienda);
    const subtotalItem = Math.round(precioLista * cantidad * 100) / 100;
    subtotalGeneral += subtotalItem;

    let descuentoItem = 0;
    const perteneceACombo = item.grupo_tipo === "combo" && item.grupo_clave && combosValidos.has(item.grupo_clave);

    if (perteneceACombo) {
      // El descuento de combo se calcula a nivel de grupo, por item aplicamos el proporcional
      const comboInfo = combosValidos.get(item.grupo_clave!)!;
      descuentoItem = Math.round(precioLista * cantidad * (comboInfo.descuentoPct / 100) * 100) / 100;
    } else if (precioEspecial !== null && precioEspecial < precioLista) {
      // Descuento por precio especial individual
      const unitarioDesc = precioLista - precioEspecial;
      descuentoItem = Math.round(unitarioDesc * cantidad * 100) / 100;

      lineasDescuento.push({
        id: `desc_pe_${item.item_id}`,
        concepto: `${item.prod_nombre} · precio especial`,
        monto: descuentoItem,
        tipo: "precio_especial",
      });
    }

    totalDescuentoGeneral += descuentoItem;

    // Actualizar en base de datos el descuento real del item
    await pool.execute(
      "UPDATE pedido_items SET precio_unitario = ?, descuento = ? WHERE id = ?",
      [precioLista, descuentoItem, item.item_id]
    );

    ticketItems.push({
      id: Number(item.item_id),
      producto_id: Number(item.producto_id),
      nombre: item.prod_nombre,
      sku: item.prod_sku,
      codigo_barras: item.prod_codigo_barras,
      cantidad,
      precio_lista: precioLista,
      precio_unitario: precioEspecial ?? precioLista,
      descuento: descuentoItem,
      subtotal: subtotalItem,
      color_fondo: item.prod_color_fondo || "#F3E1E4",
      color_frasco: item.prod_color_frasco || "#D08C98",
      tipo_rutina: item.prod_tipo_rutina,
      grupo_tipo: item.grupo_tipo,
      grupo_clave: item.grupo_clave,
      stock_tienda: stockTienda,
    });
  }

  // Agregar líneas de descuento de combos válidos
  for (const [clave, comboInfo] of Array.from(combosValidos.entries())) {
    lineasDescuento.push({
      id: `desc_combo_${clave}`,
      concepto: `${comboInfo.nombre} · combo -${comboInfo.descuentoPct}%`,
      monto: comboInfo.descuentoMonto,
      tipo: "combo",
    });
  }

  subtotalGeneral = Math.round(subtotalGeneral * 100) / 100;
  totalDescuentoGeneral = Math.round(totalDescuentoGeneral * 100) / 100;
  const totalFinal = Math.max(0, Math.round((subtotalGeneral - totalDescuentoGeneral) * 100) / 100);

  // 6. Actualizar totales del pedido en base de datos
  await pool.execute(
    "UPDATE pedidos SET subtotal = ?, descuento = ?, total = ? WHERE id = ?",
    [subtotalGeneral, totalDescuentoGeneral, totalFinal, pedidoId]
  );

  const totalArticulos = ticketItems.reduce((acc, it) => acc + it.cantidad, 0);

  return {
    id: pedido.id,
    folio: pedido.folio || `${PREFIJO_FOLIO_POS || "V"}-${pedido.id}`,
    turnoId: pedido.turno_id,
    cajaId: pedido.caja_id,
    sucursalId: pedido.sucursal_id,
    empleadoId: pedido.empleado_id,
    estado: pedido.estado,
    fechaHoraTexto: formatearFechaTicket(pedido.creado_en),
    fechaCreacion: new Date(pedido.creado_en).toISOString(),
    clienta,
    items: ticketItems,
    lineasDescuento,
    subtotal: subtotalGeneral,
    totalDescuento: totalDescuentoGeneral,
    total: totalFinal,
    totalArticulos,
  };
}

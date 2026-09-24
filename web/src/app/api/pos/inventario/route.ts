import { NextRequest, NextResponse } from "next/server";
import { getDispositivoFromRequest, getPosSessionFromRequest } from "@/lib/pos-session";
import { getDbPool } from "@/lib/db";
import { DIAS_RITMO_VENTA, DIAS_AGOTA_ALERTA, DIAS_SOBRESTOCK, DIAS_ALERTA_CADUCIDAD, NOMBRE_MARCA } from "@/lib/marca";

export const dynamic = "force-dynamic";

export interface ItemInventarioPos {
  id: number;
  nombre: string;
  sku: string;
  codigoBarras: string | null;
  precio: number;
  colorFondo: string;
  colorFrasco: string;
  tipoRutina: string | null;
  disponiblesTienda: number;
  apartadasTienda: number;
  pedidosApartados: string[];
  stockOtrasTiendas: number;
  proximoLote: {
    codigo: string;
    caducaEn: string;
    caducaTexto: string;
    diasParaCaducar: number;
    existencias: number;
  } | null;
  lotes: Array<{
    id: number;
    codigo: string;
    caducaEn: string;
    caducaTexto: string;
    diasParaCaducar: number;
    existencias: number;
  }>;
  ritmoDiario: number;
  diasRestantes: number | null;
  enCombo: boolean;
  tipoAlerta: "agotado" | "caducando" | "agotandose" | "sobrestock" | "normal";
  etiquetaAlerta: string;
  ordenCompraEnCamino: {
    folio: string;
    proveedor: string;
    cantidad: number;
    llegadaEstimada: string;
    llegadaTexto: string;
  } | null;
}

function formatearFechaCorta(fechaStr: string | Date): string {
  const d = new Date(fechaStr);
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${meses[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function formatearFechaLlegada(fechaStr: string | Date): string {
  const d = new Date(fechaStr);
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${d.getUTCDate()} ${meses[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export async function GET(req: NextRequest) {
  try {
    const dispositivo = await getDispositivoFromRequest(req);
    const session = await getPosSessionFromRequest(req);

    if (!dispositivo || !session) {
      return NextResponse.json(
        { error: "Sesión o dispositivo POS no válido.", redirect: "/pos" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const filtro = (searchParams.get("filtro") || "todos").toLowerCase(); // 'todos' | 'agotandose' | 'caducando'
    const query = (searchParams.get("q") || "").trim().toLowerCase();
    const orden = (searchParams.get("orden") || "nombre").toLowerCase();
    const direccion = (searchParams.get("direccion") || "asc").toLowerCase() === "desc" ? "desc" : "asc";

    const sucursalId = session.sucursalId;
    const pool = getDbPool();

    // 1. Catálogo base de productos
    const [prodRows]: any = await pool.execute(`
      SELECT 
        p.id, p.nombre, p.sku, p.codigo_barras, p.precio, 
        p.color_fondo, p.color_frasco, p.tipo_rutina
      FROM productos p
      ORDER BY p.id ASC
    `);

    // 2. Existencias en todas las sucursales
    const [invRows]: any = await pool.execute(`
      SELECT producto_id, sucursal_id, existencias
      FROM inventario
    `);
    const invMapTienda = new Map<number, number>();
    const invMapOtras = new Map<number, number>();

    for (const r of invRows) {
      const pid = Number(r.producto_id);
      const sid = Number(r.sucursal_id);
      const qty = Number(r.existencias) || 0;
      if (sid === sucursalId) {
        invMapTienda.set(pid, qty);
      } else {
        invMapOtras.set(pid, (invMapOtras.get(pid) || 0) + qty);
      }
    }

    // 3. Apartadas en pedidos activos de recoger en esta sucursal (con folios)
    const [apartadasRows]: any = await pool.execute(`
      SELECT pi.producto_id, pi.cantidad, p.folio
      FROM pedido_items pi
      JOIN pedidos p ON p.id = pi.pedido_id
      WHERE p.sucursal_id = ?
        AND p.tipo_entrega = 'recoger'
        AND p.estado IN ('pagado', 'preparando', 'listo_para_recoger', 'por_pagar_en_tienda')
    `, [sucursalId]);

    const apartadasMap = new Map<number, number>();
    const foliosApartadosMap = new Map<number, string[]>();

    for (const r of apartadasRows) {
      const pid = Number(r.producto_id);
      const qty = Number(r.cantidad) || 0;
      apartadasMap.set(pid, (apartadasMap.get(pid) || 0) + qty);
      const folios = foliosApartadosMap.get(pid) || [];
      const folioEtiqueta = r.folio ? (r.folio.startsWith("#") ? r.folio : `#${r.folio}`) : "";
      if (folioEtiqueta && !folios.includes(folioEtiqueta)) {
        folios.push(folioEtiqueta);
      }
      foliosApartadosMap.set(pid, folios);
    }

    // 4. Lotes de inventario (FEFO) para esta sucursal
    const [lotesRows]: any = await pool.execute(`
      SELECT id, producto_id, codigo_lote, caduca_en, existencias
      FROM inventario_lotes
      WHERE sucursal_id = ? AND existencias > 0
      ORDER BY caduca_en ASC, id ASC
    `, [sucursalId]);

    const lotesPorProducto = new Map<number, any[]>();
    const hoy = new Date();
    // Normalizar a inicio del día en UTC
    const hoyMs = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

    for (const l of lotesRows) {
      const pid = Number(l.producto_id);
      const cadDate = new Date(l.caduca_en);
      const cadMs = Date.UTC(cadDate.getUTCFullYear(), cadDate.getUTCMonth(), cadDate.getUTCDate());
      const diffDias = Math.round((cadMs - hoyMs) / (1000 * 60 * 60 * 24));

      const loteObj = {
        id: Number(l.id),
        codigo: l.codigo_lote,
        caducaEn: l.caduca_en,
        caducaTexto: formatearFechaCorta(l.caduca_en),
        diasParaCaducar: diffDias,
        existencias: Number(l.existencias) || 0,
      };

      const list = lotesPorProducto.get(pid) || [];
      list.push(loteObj);
      lotesPorProducto.set(pid, list);
    }

    // 5. Ritmo de venta en los últimos DIAS_RITMO_VENTA (14 días)
    const [ventasRows]: any = await pool.execute(`
      SELECT pi.producto_id, SUM(pi.cantidad) AS total_vendidas
      FROM pedido_items pi
      JOIN pedidos p ON p.id = pi.pedido_id
      WHERE p.sucursal_id = ?
        AND p.estado IN ('pagado', 'preparando', 'listo_para_recoger', 'entregado')
        AND p.creado_en >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY pi.producto_id
    `, [sucursalId, DIAS_RITMO_VENTA]);

    const ritmoMap = new Map<number, number>();
    for (const r of ventasRows) {
      const total = Number(r.total_vendidas) || 0;
      ritmoMap.set(Number(r.producto_id), total / DIAS_RITMO_VENTA);
    }

    // 6. Productos en combos activos
    const [comboRows]: any = await pool.execute(`
      SELECT DISTINCT cp.producto_id
      FROM combo_productos cp
      JOIN combos c ON c.id = cp.combo_id
      WHERE c.activo = 1
    `);
    const productosEnCombo = new Set<number>(comboRows.map((r: any) => Number(r.producto_id)));

    // 7. Órdenes de compra en tránsito para esta sucursal
    const [ocRows]: any = await pool.execute(`
      SELECT oc.folio, oc.proveedor, oc.llegada_estimada, oci.producto_id, oci.cantidad
      FROM ordenes_compra oc
      JOIN orden_compra_items oci ON oci.orden_id = oc.id
      WHERE oc.sucursal_destino_id = ? AND oc.estado = 'en_transito'
      ORDER BY oc.llegada_estimada ASC, oc.id ASC
    `, [sucursalId]);

    const ocMap = new Map<number, any>();
    for (const r of ocRows) {
      const pid = Number(r.producto_id);
      if (!ocMap.has(pid)) {
        ocMap.set(pid, {
          folio: r.folio,
          proveedor: r.proveedor,
          cantidad: Number(r.cantidad) || 0,
          llegadaEstimada: r.llegada_estimada,
          llegadaTexto: r.llegada_estimada ? formatearFechaLlegada(r.llegada_estimada) : "Próximamente",
        });
      }
    }

    // 8. Construir objetos de inventario y calcular estado prioritario
    const todosItems: ItemInventarioPos[] = [];
    let conteoAgotandose = 0;
    let conteoCaducando = 0;

    for (const p of prodRows) {
      const prodId = Number(p.id);
      const disponibles = invMapTienda.get(prodId) || 0;
      const apartadas = apartadasMap.get(prodId) || 0;
      const foliosApartados = foliosApartadosMap.get(prodId) || [];
      const stockOtras = invMapOtras.get(prodId) || 0;
      const lotesProd = lotesPorProducto.get(prodId) || [];
      const proximoLote = lotesProd.length > 0 ? lotesProd[0] : null;
      const ritmo = ritmoMap.get(prodId) || 0;
      const enCombo = productosEnCombo.has(prodId);
      const ocCamino = ocMap.get(prodId) || null;

      let diasRestantes: number | null = null;
      if (ritmo > 0 && disponibles > 0) {
        diasRestantes = Math.ceil(disponibles / ritmo);
      }

      // Reglas de prioridad de alertas:
      // 1. Agotado (disponibles === 0)
      // 2. Por caducar (próximo lote caduca dentro de DIAS_ALERTA_CADUCIDAD días)
      // 3. Por agotarse (ritmo de venta indica que se acaba en <= 7 días)
      // 4. Sobrestock (cubre más de 45 días)
      // 5. Normal
      let tipoAlerta: ItemInventarioPos["tipoAlerta"] = "normal";
      let etiquetaAlerta = "Normal";

      const esPorCaducar = Boolean(proximoLote && proximoLote.diasParaCaducar <= DIAS_ALERTA_CADUCIDAD);
      const esPorAgotarse = Boolean(disponibles > 0 && diasRestantes !== null && diasRestantes <= DIAS_AGOTA_ALERTA);

      if (esPorCaducar) {
        conteoCaducando++;
      }
      if (disponibles === 0 || esPorAgotarse) {
        conteoAgotandose++;
      }

      if (disponibles === 0) {
        tipoAlerta = "agotado";
        etiquetaAlerta = "Agotado";
      } else if (esPorCaducar) {
        tipoAlerta = "caducando";
        etiquetaAlerta = "Por caducar";
      } else if (esPorAgotarse) {
        tipoAlerta = "agotandose";
        etiquetaAlerta = `Se agota en ~${diasRestantes} días`;
      } else if (diasRestantes !== null && diasRestantes > DIAS_SOBRESTOCK) {
        tipoAlerta = "sobrestock";
        etiquetaAlerta = enCombo ? "Sobrestock · en combos" : "Sobrestock";
      }

      todosItems.push({
        id: prodId,
        nombre: p.nombre,
        sku: p.sku,
        codigoBarras: p.codigo_barras || null,
        precio: Number(p.precio) || 0,
        colorFondo: p.color_fondo || "#F3E1E4",
        colorFrasco: p.color_frasco || "#D08C98",
        tipoRutina: p.tipo_rutina || null,
        disponiblesTienda: disponibles,
        apartadasTienda: apartadas,
        pedidosApartados: foliosApartados,
        stockOtrasTiendas: stockOtras,
        proximoLote,
        lotes: lotesProd,
        ritmoDiario: Math.round(ritmo * 100) / 100,
        diasRestantes,
        enCombo,
        tipoAlerta,
        etiquetaAlerta,
        ordenCompraEnCamino: ocCamino,
      });
    }

    // 9. Filtrado por pestaña
    let filtrados = todosItems;
    if (filtro === "agotandose") {
      filtrados = filtrados.filter((it) => it.tipoAlerta === "agotado" || it.tipoAlerta === "agotandose");
    } else if (filtro === "caducando") {
      filtrados = filtrados.filter((it) => it.tipoAlerta === "caducando");
    }

    // 10. Filtrado por búsqueda (nombre, sku, código de barras)
    if (query) {
      filtrados = filtrados.filter((it) => {
        const matchesNombre = it.nombre.toLowerCase().includes(query);
        const matchesSku = it.sku.toLowerCase().includes(query);
        const matchesBarcode = it.codigoBarras ? it.codigoBarras.toLowerCase().includes(query) : false;
        const matchesLote = it.proximoLote ? it.proximoLote.codigo.toLowerCase().includes(query) : false;
        return matchesNombre || matchesSku || matchesBarcode || matchesLote;
      });
    }

    // 11. Ordenamiento
    filtrados.sort((a, b) => {
      let comp = 0;
      if (orden === "nombre") {
        comp = a.nombre.localeCompare(b.nombre);
      } else if (orden === "stock_tienda") {
        comp = a.disponiblesTienda - b.disponiblesTienda;
      } else if (orden === "stock_otras") {
        comp = a.stockOtrasTiendas - b.stockOtrasTiendas;
      } else if (orden === "lote") {
        const diasA = a.proximoLote ? a.proximoLote.diasParaCaducar : 99999;
        const diasB = b.proximoLote ? b.proximoLote.diasParaCaducar : 99999;
        comp = diasA - diasB;
      } else if (orden === "alerta") {
        const pesoAlerta = (t: string) => {
          if (t === "agotado") return 1;
          if (t === "caducando") return 2;
          if (t === "agotandose") return 3;
          if (t === "sobrestock") return 4;
          return 5;
        };
        comp = pesoAlerta(a.tipoAlerta) - pesoAlerta(b.tipoAlerta);
      }
      return direccion === "desc" ? -comp : comp;
    });

    return NextResponse.json({
      sucursal: {
        id: session.sucursalId,
        nombre: session.sucursalNombre || "Centro",
        nombreCompleto: session.sucursalNombreCompleto || `${NOMBRE_MARCA} Centro`,
      },
      conteo: {
        todos: todosItems.length,
        agotandose: conteoAgotandose,
        caducando: conteoCaducando,
      },
      productos: filtrados,
    });
  } catch (err: any) {
    console.error("[GET /api/pos/inventario Error]:", err);
    return NextResponse.json(
      { error: "Error al consultar inventario POS.", detalle: err.message },
      { status: 500 }
    );
  }
}

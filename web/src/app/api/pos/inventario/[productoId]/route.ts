import { NextRequest, NextResponse } from "next/server";
import { getDispositivoFromRequest, getPosSessionFromRequest } from "@/lib/pos-session";
import { getDbPool } from "@/lib/db";
import { DIAS_ALERTA_CADUCIDAD, NOMBRE_MARCA } from "@/lib/marca";

export const dynamic = "force-dynamic";

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

export async function GET(
  req: NextRequest,
  { params }: { params: { productoId: string } }
) {
  try {
    const dispositivo = await getDispositivoFromRequest(req);
    const session = await getPosSessionFromRequest(req);

    if (!dispositivo || !session) {
      return NextResponse.json(
        { error: "Sesión o dispositivo POS no válido.", redirect: "/pos" },
        { status: 401 }
      );
    }

    const productoId = parseInt(params.productoId, 10);
    if (isNaN(productoId)) {
      return NextResponse.json(
        { error: "ID de producto inválido." },
        { status: 400 }
      );
    }

    const pool = getDbPool();
    const sucursalId = session.sucursalId;

    // 1. Producto base
    const [prodRows]: any = await pool.execute(`
      SELECT 
        p.id, p.nombre, p.sku, p.codigo_barras, p.precio, 
        p.color_fondo, p.color_frasco, p.tipo_rutina, p.descripcion
      FROM productos p
      WHERE p.id = ?
      LIMIT 1
    `, [productoId]);

    if (!prodRows || prodRows.length === 0) {
      return NextResponse.json(
        { error: "Producto no encontrado." },
        { status: 404 }
      );
    }
    const producto = prodRows[0];

    // 2. Disponibilidad en todas las sucursales (Centro, Norte, Bodega)
    const [sucursalesRows]: any = await pool.execute(`
      SELECT 
        s.id, s.nombre, s.tipo, s.direccion_corta, s.activa,
        COALESCE(i.existencias, 0) AS existencias
      FROM sucursales s
      LEFT JOIN inventario i ON i.sucursal_id = s.id AND i.producto_id = ?
      WHERE s.activa = 1
      ORDER BY s.id ASC
    `, [productoId]);

    // 3. Apartadas por sucursal en pedidos de recoger activos
    const [apartadasRows]: any = await pool.execute(`
      SELECT p.sucursal_id, pi.cantidad, p.folio
      FROM pedido_items pi
      JOIN pedidos p ON p.id = pi.pedido_id
      WHERE pi.producto_id = ?
        AND p.tipo_entrega = 'recoger'
        AND p.estado IN ('pagado', 'preparando', 'listo_para_recoger', 'por_pagar_en_tienda')
    `, [productoId]);

    const apartadasPorSucursal = new Map<number, number>();
    const foliosPorSucursal = new Map<number, string[]>();

    for (const r of apartadasRows) {
      const sid = Number(r.sucursal_id);
      const qty = Number(r.cantidad) || 0;
      apartadasPorSucursal.set(sid, (apartadasPorSucursal.get(sid) || 0) + qty);
      const folios = foliosPorSucursal.get(sid) || [];
      const folioEtiqueta = r.folio ? (r.folio.startsWith("#") ? r.folio : `#${r.folio}`) : "";
      if (folioEtiqueta && !folios.includes(folioEtiqueta)) {
        folios.push(folioEtiqueta);
      }
      foliosPorSucursal.set(sid, folios);
    }

    const tiendas = sucursalesRows.map((s: any) => {
      const sid = Number(s.id);
      const esTiendaActual = sid === sucursalId;
      const existencias = Number(s.existencias) || 0;
      const apartadas = apartadasPorSucursal.get(sid) || 0;
      const foliosApartados = foliosPorSucursal.get(sid) || [];
      const esBodega = s.tipo === "bodega";

      let nombreCompleto = `${NOMBRE_MARCA} ${s.nombre}`;
      if (esBodega) {
        nombreCompleto = s.nombre === "Bodega" ? "Bodega" : `${NOMBRE_MARCA} Bodega`;
      }

      return {
        id: sid,
        nombre: s.nombre,
        nombreCompleto,
        tipo: s.tipo,
        esBodega,
        esTiendaActual,
        disponibles: existencias,
        apartadas,
        pedidosApartados: foliosApartados,
        direccionCorta: s.direccion_corta || "",
      };
    });

    // 4. Lotes de inventario (FEFO) en la sucursal actual
    const [lotesRows]: any = await pool.execute(`
      SELECT id, codigo_lote, caduca_en, existencias
      FROM inventario_lotes
      WHERE producto_id = ? AND sucursal_id = ? AND existencias > 0
      ORDER BY caduca_en ASC, id ASC
    `, [productoId, sucursalId]);

    const hoy = new Date();
    const hoyMs = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

    const lotes = lotesRows.map((l: any, idx: number) => {
      const cadDate = new Date(l.caduca_en);
      const cadMs = Date.UTC(cadDate.getUTCFullYear(), cadDate.getUTCMonth(), cadDate.getUTCDate());
      const diffDias = Math.round((cadMs - hoyMs) / (1000 * 60 * 60 * 24));

      return {
        id: Number(l.id),
        codigo: l.codigo_lote,
        caducaEn: l.caduca_en,
        caducaTexto: formatearFechaCorta(l.caduca_en),
        diasParaCaducar: diffDias,
        esPorCaducar: diffDias <= DIAS_ALERTA_CADUCIDAD,
        existencias: Number(l.existencias) || 0,
        esPrimeroEnSalir: idx === 0, // FEFO: primero en salir
      };
    });

    // 5. Órdenes de compra en tránsito para este producto en la sucursal actual
    const [ocRows]: any = await pool.execute(`
      SELECT oc.folio, oc.proveedor, oc.llegada_estimada, oci.cantidad
      FROM ordenes_compra oc
      JOIN orden_compra_items oci ON oci.orden_id = oc.id
      WHERE oc.sucursal_destino_id = ? AND oci.producto_id = ? AND oc.estado = 'en_transito'
      ORDER BY oc.llegada_estimada ASC, oc.id ASC
      LIMIT 1
    `, [sucursalId, productoId]);

    let ordenCompra = null;
    if (ocRows && ocRows.length > 0) {
      const oc = ocRows[0];
      ordenCompra = {
        folio: oc.folio,
        proveedor: oc.proveedor,
        cantidad: Number(oc.cantidad) || 0,
        llegadaEstimada: oc.llegada_estimada,
        llegadaTexto: oc.llegada_estimada ? formatearFechaLlegada(oc.llegada_estimada) : "Próximamente",
      };
    }

    return NextResponse.json({
      producto: {
        id: Number(producto.id),
        nombre: producto.nombre,
        sku: producto.sku,
        codigoBarras: producto.codigo_barras || null,
        precio: Number(producto.precio) || 0,
        colorFondo: producto.color_fondo || "#F3E1E4",
        colorFrasco: producto.color_frasco || "#D08C98",
        tipoRutina: producto.tipo_rutina || null,
        descripcion: producto.descripcion || null,
      },
      sucursalActual: {
        id: session.sucursalId,
        nombre: session.sucursalNombre || "Centro",
        nombreCompleto: session.sucursalNombreCompleto || `${NOMBRE_MARCA} Centro`,
      },
      tiendas,
      lotes,
      ordenCompra,
    });
  } catch (err: any) {
    console.error("[GET /api/pos/inventario/[productoId] Error]:", err);
    return NextResponse.json(
      { error: "Error al consultar detalle de producto en inventario.", detalle: err.message },
      { status: 500 }
    );
  }
}

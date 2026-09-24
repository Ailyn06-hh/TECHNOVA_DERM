import { getDbPool } from "@/lib/db";
import {
  DIAS_DEVOLUCION,
  DIAS_PARA_FACTURAR,
  COSTO_ENVIO,
  ENVIO_GRATIS_DESDE,
  DIAS_ENVIO,
} from "@/lib/marca";
import { HelpTopic } from "@/components/help/HelpTopicCards";
import { HelpArticle } from "@/components/help/HelpFaqAccordion";
import { EligibleOrder } from "@/components/orders/detail/ReturnRequestForm";

export async function getAyudaDataServer(): Promise<{
  temas: HelpTopic[];
  articulos: HelpArticle[];
}> {
  try {
    const pool = getDbPool();

    // Minutos de preparación de sucursal
    const [sucRows]: any = await pool.execute(
      "SELECT minutos_preparacion FROM sucursales WHERE activa = 1 ORDER BY id ASC LIMIT 1"
    );
    const minutosPreparacion = Number(sucRows?.[0]?.minutos_preparacion || 60);

    // Temas
    const [temasRows]: any = await pool.execute(
      "SELECT id, slug, nombre, descripcion, icono, orden FROM ayuda_temas ORDER BY orden ASC"
    );

    // Artículos
    const [artRows]: any = await pool.execute(`
      SELECT a.id, a.tema_id, t.slug as tema_slug, t.nombre as tema_nombre,
             a.slug, a.pregunta, a.respuesta, a.destacado, a.orden,
             a.util_si, a.util_no
      FROM ayuda_articulos a
      JOIN ayuda_temas t ON a.tema_id = t.id
      WHERE a.activo = 1
      ORDER BY a.destacado DESC, a.orden ASC, (a.util_si - a.util_no) DESC
    `);

    const reemplazarVariables = (texto: string) => {
      if (!texto) return "";
      return texto
        .replace(/\{\{DIAS_DEVOLUCION\}\}/g, String(DIAS_DEVOLUCION))
        .replace(/\{\{DIAS_PARA_FACTURAR\}\}/g, String(DIAS_PARA_FACTURAR))
        .replace(/\{\{COSTO_ENVIO\}\}/g, String(COSTO_ENVIO))
        .replace(/\{\{ENVIO_GRATIS_DESDE\}\}/g, ENVIO_GRATIS_DESDE.toLocaleString("es-MX"))
        .replace(/\{\{DIAS_ENVIO\}\}/g, DIAS_ENVIO)
        .replace(/\{\{MINUTOS_PREPARACION\}\}/g, String(minutosPreparacion));
    };

    const articulos: HelpArticle[] = artRows.map((r: any) => ({
      id: r.id,
      temaId: r.tema_id,
      temaSlug: r.tema_slug,
      temaNombre: r.tema_nombre,
      slug: r.slug,
      pregunta: r.pregunta,
      respuesta: reemplazarVariables(r.respuesta),
      destacado: Number(r.destacado) === 1,
      orden: r.orden,
      utilSi: Number(r.util_si || 0),
      utilNo: Number(r.util_no || 0),
    }));

    return {
      temas: temasRows,
      articulos,
    };
  } catch (error) {
    console.error("[getAyudaDataServer Error]:", error);
    return { temas: [], articulos: [] };
  }
}

export async function getPedidosElegiblesDevolucionServer(
  usuarioId: number
): Promise<EligibleOrder[]> {
  try {
    const pool = getDbPool();

    const [pedidosRows]: any = await pool.execute(
      `SELECT p.id, p.folio, p.estado, p.creado_en, p.entregado_en
       FROM pedidos p
       WHERE p.usuario_id = ?
         AND p.estado = 'entregado'
         AND DATEDIFF(NOW(), COALESCE(p.entregado_en, p.creado_en)) <= ?
       ORDER BY COALESCE(p.entregado_en, p.creado_en) DESC`,
      [usuarioId, DIAS_DEVOLUCION]
    );

    if (!pedidosRows || pedidosRows.length === 0) {
      return [];
    }

    const pedidoIds = pedidosRows.map((p: any) => p.id);
    const placeholders = pedidoIds.map(() => "?").join(",");

    const [itemsRows]: any = await pool.execute(
      `SELECT pi.id, pi.pedido_id, pi.producto_id, pi.cantidad, pi.precio_unitario,
              COALESCE(prod.nombre, 'Producto') as nombre,
              prod.imagen_url as imagen
       FROM pedido_items pi
       LEFT JOIN productos prod ON pi.producto_id = prod.id
       WHERE pi.pedido_id IN (${placeholders})`,
      pedidoIds
    );

    const [devItemsRows]: any = await pool.execute(
      `SELECT di.pedido_item_id, SUM(di.cantidad) as total_devuelto
       FROM devolucion_items di
       JOIN devoluciones d ON di.devolucion_id = d.id
       WHERE d.pedido_id IN (${placeholders})
         AND d.estado NOT IN ('rechazada')
       GROUP BY di.pedido_item_id`,
      pedidoIds
    );

    const devueltosMap = new Map<number, number>();
    for (const row of devItemsRows) {
      devueltosMap.set(Number(row.pedido_item_id), Number(row.total_devuelto || 0));
    }

    const itemsPorPedido = new Map<number, any[]>();
    for (const it of itemsRows) {
      const yaDevuelto = devueltosMap.get(Number(it.id)) || 0;
      const disponible = Number(it.cantidad) - yaDevuelto;

      if (disponible > 0) {
        if (!itemsPorPedido.has(it.pedido_id)) {
          itemsPorPedido.set(it.pedido_id, []);
        }
        itemsPorPedido.get(it.pedido_id)!.push({
          id: it.id,
          pedido_item_id: it.id,
          producto_id: it.producto_id,
          nombre: it.nombre,
          imagen: it.imagen,
          cantidad: Number(it.cantidad),
          precio_unitario: Number(it.precio_unitario),
          disponibleDevolucion: disponible,
        });
      }
    }

    const formateador = new Intl.DateTimeFormat("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    return pedidosRows
      .filter((p: any) => itemsPorPedido.has(p.id) && itemsPorPedido.get(p.id)!.length > 0)
      .map((p: any) => {
        const fechaBase = p.entregado_en ? new Date(p.entregado_en) : new Date(p.creado_en);
        const fechaTexto = formateador.format(fechaBase).replace(".", "");
        const label = `#${p.folio} · ${fechaTexto}`;

        return {
          id: p.id,
          folio: p.folio,
          label,
          fecha: fechaBase.toISOString(),
          fechaTexto,
          items: itemsPorPedido.get(p.id) || [],
        };
      });
  } catch (error) {
    console.error("[getPedidosElegiblesDevolucionServer Error]:", error);
    return [];
  }
}

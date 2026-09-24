import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/session";
import { getDbPool } from "@/lib/db";
import { DIAS_DEVOLUCION } from "@/lib/marca";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = getAuthUserFromRequest(req);
    if (!user?.userId) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const pool = getDbPool();

    // 1. Obtener pedidos entregados dentro del plazo de devolución
    const [pedidosRows]: any = await pool.execute(
      `SELECT p.id, p.folio, p.estado, p.creado_en, p.entregado_en
       FROM pedidos p
       WHERE p.usuario_id = ?
         AND p.estado = 'entregado'
         AND DATEDIFF(NOW(), COALESCE(p.entregado_en, p.creado_en)) <= ?
       ORDER BY COALESCE(p.entregado_en, p.creado_en) DESC`,
      [user.userId, DIAS_DEVOLUCION]
    );

    if (!pedidosRows || pedidosRows.length === 0) {
      return NextResponse.json({
        exito: true,
        success: true,
        pedidos: [],
      });
    }

    const pedidoIds = pedidosRows.map((p: any) => p.id);

    // 2. Obtener items de esos pedidos
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

    // 3. Consultar cantidades ya devueltas en solicitudes activas (no rechazadas)
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

    // 4. Mapear items calculando disponibleDevolucion
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

    // Formateador de fechas para el selector "#TD-0987 · 12 jul 2026"
    const formateador = new Intl.DateTimeFormat("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const pedidosElegibles = pedidosRows
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

    return NextResponse.json({
      exito: true,
      success: true,
      pedidos: pedidosElegibles,
    });
  } catch (error: any) {
    console.error("[GET /api/cuenta/devoluciones/pedidos-elegibles Error]:", error);
    return NextResponse.json(
      { error: "Error al obtener pedidos elegibles para devolución", details: error.message },
      { status: 500 }
    );
  }
}

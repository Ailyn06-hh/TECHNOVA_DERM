import { NextRequest, NextResponse } from "next/server";
import { getDispositivoFromRequest, getPosSessionFromRequest } from "@/lib/pos-session";
import { getDbPool } from "@/lib/db";
import { estaCodigoVerificado } from "@/lib/pos/verificacion-cache";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const dispositivo = await getDispositivoFromRequest(req);
    const session = await getPosSessionFromRequest(req);

    if (!dispositivo || !session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    const pool = getDbPool();

    // Filtros base: sucursal del dispositivo, tipo 'recoger', estados activos
    let sql = `
      SELECT 
        p.id,
        p.folio,
        p.canal,
        p.estado,
        p.total,
        p.subtotal,
        p.descuento,
        p.metodo_pago,
        p.creado_en,
        COALESCE(p.intentos_codigo, p.intentos_codigo_recogida, 0) AS intentos_fallidos,
        u.id AS usuario_id,
        COALESCE(u.nombre, '') AS usuario_nombre,
        COALESCE(u.apellido, '') AS usuario_apellido,
        COALESCE(u.correo, p.cliente_email, '') AS usuario_correo,
        COALESCE(u.celular, p.cliente_celular, '') AS usuario_celular
      FROM pedidos p
      LEFT JOIN usuarios u ON u.id = p.usuario_id
      WHERE p.sucursal_id = ?
        AND p.tipo_entrega = 'recoger'
        AND p.estado IN ('pagado', 'preparando', 'listo_para_recoger', 'por_pagar_en_tienda')
    `;

    const params: any[] = [dispositivo.sucursalId];

    if (q) {
      // Limpiar prefijo # si viene
      const qLimpio = q.replace(/^#/, "").trim();
      // Quitar posible prefijo N- si la usuaria tecleó solo números
      const qSoloDigitos = qLimpio.replace(/^N-/i, "");

      sql += ` AND (
        p.folio LIKE ? 
        OR p.folio LIKE ?
        OR CONCAT(COALESCE(u.nombre, ''), ' ', COALESCE(u.apellido, '')) LIKE ?
        OR u.celular LIKE ?
        OR p.cliente_celular LIKE ?
      )`;

      params.push(`%${qLimpio}%`);
      params.push(`%${qSoloDigitos}%`);
      params.push(`%${qLimpio}%`);
      params.push(`%${qSoloDigitos}%`);
      params.push(`%${qSoloDigitos}%`);
    }

    // Orden:
    // 1: listo_para_recoger y por_pagar_en_tienda (pueden llegar en cualquier momento)
    // 2: preparando y pagado (pendiente de preparar)
    // Dentro de cada grupo, más antiguos primero (creado_en ASC)
    sql += `
      ORDER BY 
        CASE 
          WHEN p.estado IN ('listo_para_recoger', 'por_pagar_en_tienda') THEN 1 
          ELSE 2 
        END ASC,
        p.creado_en ASC
    `;

    const [pedidosRows]: any = await pool.execute(sql, params);

    if (!pedidosRows || pedidosRows.length === 0) {
      return NextResponse.json({
        exito: true,
        pedidos: [],
      });
    }

    const pedidoIds = pedidosRows.map((p: any) => p.id);

    // Obtener los productos de estos pedidos
    const placeholders = pedidoIds.map(() => "?").join(",");
    const [itemsRows]: any = await pool.execute(
      `SELECT 
        pi.id,
        pi.pedido_id,
        pi.producto_id,
        pi.cantidad,
        pi.precio_unitario,
        pi.descuento,
        prod.nombre,
        prod.sku
       FROM pedido_items pi
       JOIN productos prod ON prod.id = pi.producto_id
       WHERE pi.pedido_id IN (${placeholders})
       ORDER BY pi.id ASC`,
      pedidoIds
    );

    const itemsPorPedido = new Map<number, any[]>();
    for (const item of itemsRows) {
      const list = itemsPorPedido.get(item.pedido_id) || [];
      list.push({
        id: item.id,
        productoId: item.producto_id,
        nombre: item.nombre,
        sku: item.sku,
        cantidad: Number(item.cantidad) || 1,
        precioUnitario: Number(item.precio_unitario) || 0,
        descuento: Number(item.descuento) || 0,
        total: (Number(item.precio_unitario) || 0) * (Number(item.cantidad) || 1) - (Number(item.descuento) || 0),
        estadoItem: "Apartado",
      });
      itemsPorPedido.set(item.pedido_id, list);
    }

    const pedidos = pedidosRows.map((p: any) => {
      const items = itemsPorPedido.get(p.id) || [];
      const piezasTotal = items.reduce((acc: number, it: any) => acc + it.cantidad, 0);

      const nombreCompleto = `${p.usuario_nombre} ${p.usuario_apellido}`.trim() || p.usuario_correo || "Clienta";
      const verificadoReciente = estaCodigoVerificado(p.folio, session.empleadoId);

      return {
        id: p.id,
        folio: p.folio,
        canal: p.canal,
        estado: p.estado,
        subtotal: Number(p.subtotal) || 0,
        descuento: Number(p.descuento) || 0,
        total: Number(p.total) || 0,
        metodoPago: p.metodo_pago,
        porPagar: p.estado === "por_pagar_en_tienda",
        bloqueado: Number(p.intentos_fallidos) >= 5,
        intentosFallidos: Number(p.intentos_fallidos),
        creadoEn: p.creado_en,
        codigoVerificado: verificadoReciente,
        cliente: {
          id: p.usuario_id,
          nombreCompleto,
          nombre: p.usuario_nombre,
          apellido: p.usuario_apellido,
          correo: p.usuario_correo,
          celular: p.usuario_celular,
        },
        piezas: piezasTotal,
        items,
        // SEGURIDAD: Nunca se retorna codigo_recogida
      };
    });

    return NextResponse.json({
      exito: true,
      pedidos,
    });
  } catch (error: any) {
    console.error("[GET /api/pos/por-recoger Error]:", error);
    return NextResponse.json(
      { error: "Error al obtener pedidos por recoger", details: error.message },
      { status: 500 }
    );
  }
}

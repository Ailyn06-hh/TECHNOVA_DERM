import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/session";
import { getDbPool } from "@/lib/db";
import { DIAS_DEVOLUCION } from "@/lib/marca";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { folio: string } }
) {
  try {
    const user = getAuthUserFromRequest(req);
    if (!user?.userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { folio } = params;
    if (!folio) {
      return NextResponse.json({ error: "Folio no especificado" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { items, motivo, comentario, metodo } = body;

    const pool = getDbPool();

    // 1. Obtener pedido y validar propiedad
    const [orderRows]: any = await pool.execute(
      "SELECT id, folio, usuario_id, estado, creado_en, entregado_en FROM pedidos WHERE folio = ? LIMIT 1",
      [folio]
    );

    if (!orderRows || orderRows.length === 0) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    const order = orderRows[0];
    if (order.usuario_id !== user.userId) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    // 2. Solo pedidos entregados
    if (order.estado !== "entregado") {
      return NextResponse.json(
        { error: "Solo puedes solicitar la devolución de pedidos que ya hayan sido entregados." },
        { status: 400 }
      );
    }

    // 3. Validar plazo de 30 días
    const fechaEntrega = order.entregado_en
      ? new Date(order.entregado_en)
      : new Date(order.creado_en);
    const dias = Math.floor((Date.now() - fechaEntrega.getTime()) / (1000 * 60 * 60 * 24));
    if (dias > DIAS_DEVOLUCION) {
      return NextResponse.json(
        { error: `El plazo para devoluciones es de ${DIAS_DEVOLUCION} días tras la entrega.` },
        { status: 400 }
      );
    }

    // 4. Verificar si ya hay una devolución en curso
    const [existingDevRows]: any = await pool.execute(
      "SELECT id, estado FROM devoluciones WHERE pedido_id = ? AND estado IN ('solicitada', 'aprobada', 'recibida') LIMIT 1",
      [order.id]
    );

    if (existingDevRows && existingDevRows.length > 0) {
      return NextResponse.json(
        {
          error: `Ya existe una solicitud de devolución en curso para este pedido (DEV-${String(
            existingDevRows[0].id
          ).padStart(4, "0")}).`,
        },
        { status: 400 }
      );
    }

    // 5. Validar método y motivo
    const motivosValidos = ["danado", "reaccion", "no_esperado", "equivocado", "otro"];
    if (!motivo || !motivosValidos.includes(motivo)) {
      return NextResponse.json(
        { error: "Debes seleccionar un motivo válido para la devolución." },
        { status: 400 }
      );
    }

    const metodosValidos = ["tienda", "recoleccion"];
    if (!metodo || !metodosValidos.includes(metodo)) {
      return NextResponse.json(
        { error: "Debes elegir un método de devolución (tienda o recolección)." },
        { status: 400 }
      );
    }

    const comentarioLimpio = typeof comentario === "string" ? comentario.trim() : "";
    if (comentarioLimpio.length > 500) {
      return NextResponse.json(
        { error: "El comentario no puede superar los 500 caracteres." },
        { status: 400 }
      );
    }

    // 6. Validar items seleccionados
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Debes seleccionar al menos un producto a devolver." },
        { status: 400 }
      );
    }

    // Consultar todos los items del pedido
    const [orderItems]: any = await pool.execute(
      "SELECT id, cantidad FROM pedido_items WHERE pedido_id = ?",
      [order.id]
    );
    const orderItemsMap = new Map<number, number>();
    for (const it of orderItems) {
      orderItemsMap.set(Number(it.id), Number(it.cantidad));
    }

    // Consultar cantidades ya devueltas previamente
    const [previousDevItems]: any = await pool.execute(
      `SELECT di.pedido_item_id, SUM(di.cantidad) as total_devuelto
       FROM devolucion_items di
       JOIN devoluciones d ON di.devolucion_id = d.id
       WHERE d.pedido_id = ? AND d.estado NOT IN ('rechazada')
       GROUP BY di.pedido_item_id`,
      [order.id]
    );
    const alreadyReturnedMap = new Map<number, number>();
    for (const row of previousDevItems) {
      alreadyReturnedMap.set(Number(row.pedido_item_id), Number(row.total_devuelto || 0));
    }

    const itemsAProcesar: { pedido_item_id: number; cantidad: number }[] = [];

    for (const it of items) {
      const pedidoItemId = Number(it.pedido_item_id || it.id);
      const cantidad = Number(it.cantidad);

      if (!orderItemsMap.has(pedidoItemId)) {
        return NextResponse.json(
          { error: `El producto seleccionado (ID ${pedidoItemId}) no pertenece a este pedido.` },
          { status: 400 }
        );
      }

      const totalComprado = orderItemsMap.get(pedidoItemId) || 0;
      const yaDevuelto = alreadyReturnedMap.get(pedidoItemId) || 0;
      const disponible = totalComprado - yaDevuelto;

      if (cantidad <= 0) {
        continue;
      }

      if (cantidad > disponible) {
        return NextResponse.json(
          {
            error: `La cantidad a devolver (${cantidad}) excede el disponible (${disponible}) para uno de los productos.`,
          },
          { status: 400 }
        );
      }

      itemsAProcesar.push({ pedido_item_id: pedidoItemId, cantidad });
    }

    if (itemsAProcesar.length === 0) {
      return NextResponse.json(
        { error: "Debes seleccionar una cantidad mayor a cero para al menos un producto." },
        { status: 400 }
      );
    }

    // 7. Transacción en Base de Datos
    const conn = await pool.getConnection();
    let devId = 0;
    try {
      await conn.beginTransaction();

      const [devResult]: any = await conn.execute(
        `INSERT INTO devoluciones (pedido_id, usuario_id, motivo, comentario, metodo, estado, creado_en)
         VALUES (?, ?, ?, ?, ?, 'solicitada', NOW())`,
        [order.id, user.userId, motivo, comentarioLimpio || null, metodo]
      );
      devId = devResult.insertId;
      const devFolio = `D-${String(devId).padStart(4, "0")}`;

      // Asignar folio único D-0001
      await conn.execute(
        "UPDATE devoluciones SET folio = ? WHERE id = ?",
        [devFolio, devId]
      );

      for (const item of itemsAProcesar) {
        await conn.execute(
          `INSERT INTO devolucion_items (devolucion_id, pedido_item_id, cantidad)
           VALUES (?, ?, ?)`,
          [devId, item.pedido_item_id, item.cantidad]
        );
      }

      // Insertar notificación al usuario
      const { notificar } = await import("@/lib/notificaciones");
      await notificar(
        user.userId,
        {
          tipo: "pedido",
          evento: "devolucion_solicitada",
          titulo: `Solicitud de devolución recibida - #${order.folio}`,
          mensaje: `Hemos recibido tu solicitud de devolución ${devFolio} para el pedido #${order.folio}. Revisaremos tu caso en un plazo máximo de 48 horas hábiles.`,
          enlace: `/cuenta/pedidos/${order.folio}`,
        },
        conn
      );

      await conn.commit();
    } catch (txError) {
      await conn.rollback();
      throw txError;
    } finally {
      conn.release();
    }

    const devFolio = `D-${String(devId).padStart(4, "0")}`;

    return NextResponse.json({
      success: true,
      exito: true,
      message: "Solicitud de devolución recibida. Te contactaremos por correo.",
      devolucion: {
        id: devId,
        folio: devFolio,
        codigo: devFolio,
        estado: "solicitada",
        motivo,
        metodo,
        creadoEn: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("[API DEVOLUCION ERROR]:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud de devolución", details: error.message },
      { status: 500 }
    );
  }
}

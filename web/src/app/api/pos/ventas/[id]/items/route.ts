import { NextRequest, NextResponse } from "next/server";
import { getDispositivoFromRequest, getPosSessionFromRequest } from "@/lib/pos-session";
import { getDbPool } from "@/lib/db";
import { calcularTicketPos } from "@/lib/pos/ventas";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
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

    const pedidoId = Number(params.id);
    if (!pedidoId) {
      return NextResponse.json({ error: "ID de venta inválido." }, { status: 400 });
    }

    const pool = getDbPool();

    // 1. Validar que la venta exista, esté en borrador y pertenezca a este turno
    const [pedRows]: any = await pool.execute(
      "SELECT id, turno_id, estado, sucursal_id FROM pedidos WHERE id = ? LIMIT 1",
      [pedidoId]
    );

    if (!pedRows || pedRows.length === 0) {
      return NextResponse.json({ error: "Venta no encontrada." }, { status: 404 });
    }

    const pedido = pedRows[0];
    if (pedido.turno_id !== session.turnoId) {
      return NextResponse.json(
        { error: "Esta venta pertenece a otro turno de caja." },
        { status: 403 }
      );
    }

    if (pedido.estado !== "borrador") {
      return NextResponse.json(
        { error: "Esta venta ya fue cobrada o cancelada y no puede modificarse." },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { accion, producto_id, combo_id, item_id, cantidad, delta } = body;

    // 2. Procesar acción: AGREGAR_COMBO
    if (accion === "agregar_combo" && combo_id) {
      const [comboRows]: any = await pool.execute(
        "SELECT id, nombre, slug, descuento_porcentaje, activo FROM combos WHERE id = ? AND activo = 1 LIMIT 1",
        [Number(combo_id)]
      );

      if (!comboRows || comboRows.length === 0) {
        return NextResponse.json({ error: "El combo seleccionado no está disponible." }, { status: 404 });
      }

      const combo = comboRows[0];
      const [cpRows]: any = await pool.execute(
        `SELECT cp.producto_id, cp.cantidad, p.precio, p.nombre,
                COALESCE(i.existencias, 0) as stock_tienda
         FROM combo_productos cp
         JOIN productos p ON p.id = cp.producto_id
         LEFT JOIN inventario i ON i.producto_id = cp.producto_id AND i.sucursal_id = ?
         WHERE cp.combo_id = ?`,
        [dispositivo.sucursalId, combo.id]
      );

      const componentes: any[] = cpRows || [];
      if (componentes.length === 0) {
        return NextResponse.json({ error: "El combo no contiene productos." }, { status: 400 });
      }

      // Validar stock de cada componente
      for (const comp of componentes) {
        const [enTicketRows]: any = await pool.execute(
          "SELECT COALESCE(SUM(cantidad), 0) as en_ticket FROM pedido_items WHERE pedido_id = ? AND producto_id = ?",
          [pedidoId, comp.producto_id]
        );
        const enTicket = Number(enTicketRows[0]?.en_ticket || 0);
        const reqQty = Number(comp.cantidad);
        const totalReq = enTicket + reqQty;

        if (totalReq > Number(comp.stock_tienda)) {
          return NextResponse.json(
            {
              error: `Solo hay ${comp.stock_tienda} de "${comp.nombre}" en tienda. No alcanza para agregar el combo.`,
              stock: comp.stock_tienda,
            },
            { status: 400 }
          );
        }
      }

      const grupoClave = combo.slug || String(combo.id);

      for (const comp of componentes) {
        await pool.execute(
          `INSERT INTO pedido_items (
            pedido_id, producto_id, cantidad, precio_unitario, descuento, grupo_tipo, grupo_clave
          ) VALUES (?, ?, ?, ?, 0.00, 'combo', ?)`,
          [pedidoId, comp.producto_id, Number(comp.cantidad), Number(comp.precio), grupoClave]
        );
      }

      const ticketActualizado = await calcularTicketPos(pedidoId, dispositivo.sucursalId);
      return NextResponse.json({
        exito: true,
        mensaje: `Combo "${combo.nombre}" agregado.`,
        ticket: ticketActualizado,
      });
    }

    // 3. Procesar acción: QUITAR item
    if (accion === "quitar" && item_id) {
      await pool.execute("DELETE FROM pedido_items WHERE id = ? AND pedido_id = ?", [
        Number(item_id),
        pedidoId,
      ]);

      const ticketActualizado = await calcularTicketPos(pedidoId, dispositivo.sucursalId);
      return NextResponse.json({
        exito: true,
        mensaje: "Artículo eliminado de la venta.",
        ticket: ticketActualizado,
      });
    }

    // 4. Procesar acción: ESTABLECER cantidad o sumar/restar (delta)
    if (item_id && (cantidad !== undefined || delta !== undefined)) {
      const [itRows]: any = await pool.execute(
        `SELECT pi.id, pi.producto_id, pi.cantidad, p.nombre,
                COALESCE(i.existencias, 0) as stock_tienda
         FROM pedido_items pi
         JOIN productos p ON p.id = pi.producto_id
         LEFT JOIN inventario i ON i.producto_id = pi.producto_id AND i.sucursal_id = ?
         WHERE pi.id = ? AND pi.pedido_id = ? LIMIT 1`,
        [dispositivo.sucursalId, Number(item_id), pedidoId]
      );

      if (!itRows || itRows.length === 0) {
        return NextResponse.json({ error: "Artículo no encontrado en el ticket." }, { status: 404 });
      }

      const itemTarget = itRows[0];
      const stockDisponible = Number(itemTarget.stock_tienda);
      let nuevaCantidad = cantidad !== undefined ? Number(cantidad) : Number(itemTarget.cantidad) + Number(delta || 0);

      if (nuevaCantidad <= 0) {
        // Eliminar del ticket si la cantidad llega a 0
        await pool.execute("DELETE FROM pedido_items WHERE id = ?", [itemTarget.id]);
      } else {
        if (nuevaCantidad > stockDisponible) {
          return NextResponse.json(
            {
              error: `Solo hay ${stockDisponible} en tienda`,
              stock: stockDisponible,
            },
            { status: 400 }
          );
        }

        await pool.execute("UPDATE pedido_items SET cantidad = ? WHERE id = ?", [
          nuevaCantidad,
          itemTarget.id,
        ]);
      }

      const ticketActualizado = await calcularTicketPos(pedidoId, dispositivo.sucursalId);
      return NextResponse.json({
        exito: true,
        ticket: ticketActualizado,
      });
    }

    // 5. Procesar acción: AGREGAR producto individual
    if (producto_id) {
      const prodId = Number(producto_id);

      const [pRows]: any = await pool.execute(
        `SELECT p.id, p.nombre, p.precio, p.precio_especial, p.activo,
                COALESCE(i.existencias, 0) as stock_tienda
         FROM productos p
         LEFT JOIN inventario i ON i.producto_id = p.id AND i.sucursal_id = ?
         WHERE p.id = ? LIMIT 1`,
        [dispositivo.sucursalId, prodId]
      );

      if (!pRows || pRows.length === 0 || !pRows[0].activo) {
        return NextResponse.json({ error: "Producto no encontrado o inactivo." }, { status: 404 });
      }

      const prod = pRows[0];
      const stockDisponible = Number(prod.stock_tienda);

      if (stockDisponible <= 0) {
        return NextResponse.json(
          { error: `"${prod.nombre}" está agotado en esta tienda.`, stock: 0 },
          { status: 400 }
        );
      }

      // Revisar si ya existe este producto en el ticket fuera de combo
      const [existingRows]: any = await pool.execute(
        "SELECT id, cantidad FROM pedido_items WHERE pedido_id = ? AND producto_id = ? AND grupo_tipo IS NULL LIMIT 1",
        [pedidoId, prodId]
      );

      const cantidadActual = existingRows?.[0] ? Number(existingRows[0].cantidad) : 0;
      const incremento = Number(cantidad || 1);
      const nuevaCantidad = cantidadActual + incremento;

      if (nuevaCantidad > stockDisponible) {
        return NextResponse.json(
          {
            error: `Solo hay ${stockDisponible} en tienda`,
            stock: stockDisponible,
          },
          { status: 400 }
        );
      }

      if (existingRows?.[0]) {
        await pool.execute("UPDATE pedido_items SET cantidad = ? WHERE id = ?", [
          nuevaCantidad,
          existingRows[0].id,
        ]);
      } else {
        await pool.execute(
          `INSERT INTO pedido_items (
            pedido_id, producto_id, cantidad, precio_unitario, descuento, grupo_tipo, grupo_clave
          ) VALUES (?, ?, ?, ?, 0.00, NULL, NULL)`,
          [pedidoId, prodId, incremento, Number(prod.precio)]
        );
      }

      const ticketActualizado = await calcularTicketPos(pedidoId, dispositivo.sucursalId);
      return NextResponse.json({
        exito: true,
        mensaje: `"${prod.nombre}" agregado.`,
        ticket: ticketActualizado,
      });
    }

    return NextResponse.json({ error: "Parámetros incompletos para actualizar artículos." }, { status: 400 });
  } catch (error: any) {
    console.error("[PUT /api/pos/ventas/[id]/items Error]:", error);
    return NextResponse.json(
      { error: "Error al actualizar artículos del ticket", details: error.message },
      { status: 500 }
    );
  }
}

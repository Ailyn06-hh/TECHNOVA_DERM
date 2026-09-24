import { NextRequest, NextResponse } from "next/server";
import { getAuthUserFromRequest } from "@/lib/session";
import { getOrCreateCart, calcularCarrito } from "@/lib/carrito";
import { getDbPool } from "@/lib/db";
import { getProveedorPagos } from "@/lib/pagos";
import { liberarReservasVencidas } from "@/lib/reservas";
import { notificarWhatsAppPedidoListo, enviarConfirmacionPedido } from "@/lib/notificaciones";
import { COSTO_ENVIO, ENVIO_GRATIS_DESDE, PREFIJO_FOLIO } from "@/lib/marca";
import { cambiarEstado, generarCodigoRecogida } from "@/lib/pedidos";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // 0. Liberar reservas vencidas al inicio
    await liberarReservasVencidas();

    const session = getAuthUserFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Debes iniciar sesión para completar tu orden." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      tipo_entrega,
      sucursal_id,
      direccion_id,
      metodo,
      id_tarjeta_guardada,
      token_tarjeta,
      datos_tarjeta_nueva,
      guardar_tarjeta,
      total_visto,
      clave_idempotencia,
    } = body;

    if (!clave_idempotencia || typeof clave_idempotencia !== "string") {
      return NextResponse.json(
        { error: "Clave de idempotencia requerida." },
        { status: 400 }
      );
    }

    if (!["recoger", "envio"].includes(tipo_entrega)) {
      return NextResponse.json(
        { error: "Tipo de entrega no válido." },
        { status: 400 }
      );
    }

    if (!["tarjeta", "mercado_pago", "pagar_en_tienda"].includes(metodo)) {
      return NextResponse.json(
        { error: "Método de pago no válido." },
        { status: 400 }
      );
    }

    // Pagar en tienda solo se permite con recoger
    if (metodo === "pagar_en_tienda" && tipo_entrega !== "recoger") {
      return NextResponse.json(
        { error: "Pagar en tienda solo está disponible al recoger en tienda." },
        { status: 400 }
      );
    }

    if (tipo_entrega === "recoger" && !sucursal_id) {
      return NextResponse.json(
        { error: "Debes seleccionar una sucursal para recoger." },
        { status: 400 }
      );
    }

    if (tipo_entrega === "envio" && !direccion_id) {
      return NextResponse.json(
        { error: "Debes seleccionar o ingresar una dirección de entrega." },
        { status: 400 }
      );
    }

    const pool = getDbPool();

    // 1. REGLA DE IDEMPOTENCIA: Verificar si ya existe un pedido con esa clave
    const [existingOrder]: any = await pool.execute(
      "SELECT id, folio, estado, total FROM pedidos WHERE clave_idempotencia = ? LIMIT 1",
      [clave_idempotencia]
    );

    if (existingOrder && existingOrder.length > 0) {
      const ord = existingOrder[0];
      return NextResponse.json({
        exito: true,
        folio: ord.folio,
        estado: ord.estado,
        yaProcesado: true,
      });
    }

    // 2. RECALCULAR TOTALES DESDE EL SERVIDOR (única fuente de verdad)
    const { cartId } = await getOrCreateCart(req);
    const carrito = await calcularCarrito(cartId, session.userId);

    if (!carrito.tieneArticulos || carrito.totalItems === 0) {
      return NextResponse.json(
        { error: "Tu bolsa de compras está vacía.", vacio: true },
        { status: 400 }
      );
    }

    if (carrito.hayAgotados || carrito.hayInsuficientes) {
      return NextResponse.json(
        {
          error: "Hay artículos sin existencias suficientes en tu bolsa.",
          requiereRevision: true,
        },
        { status: 400 }
      );
    }

    // Calcular costo de envío oficial del servidor
    const montoBase = Math.max(0, carrito.subtotal - carrito.totalDescuentos);
    let costoEnvio = 0;
    if (tipo_entrega === "envio") {
      costoEnvio = montoBase >= ENVIO_GRATIS_DESDE ? 0 : COSTO_ENVIO;
    }

    const totalServidor = Math.round(montoBase + costoEnvio);
    const totalCliente = Math.round(Number(total_visto) || 0);

    // Detección de cambio de precio
    if (totalServidor !== totalCliente) {
      return NextResponse.json(
        {
          exito: false,
          motivo: "total_cambiado",
          mensaje: "Tu total cambió. Por favor revisa los nuevos montos antes de pagar.",
          nuevoTotal: totalServidor,
        },
        { status: 409 }
      );
    }

    // 3. TRANSACCIÓN ATÓMICA DE INVENTARIO Y CREACIÓN DE PEDIDO
    let conn: any = null;
    try {
      conn = await pool.getConnection();
      await conn.beginTransaction();

      // Bloquear filas de inventario necesarias para los productos del carrito
      const productIds = Array.from(
        new Set(carrito.items.map((i) => i.producto_id).filter(Boolean))
      );
      const prodPlaceholders = productIds.map(() => "?").join(",");

      const [invRows]: any = await conn.execute(
        `SELECT sucursal_id, producto_id, existencias 
         FROM inventario 
         WHERE producto_id IN (${prodPlaceholders}) 
         FOR UPDATE`,
        [...productIds]
      );

      // Validar y descontar existencias
      if (tipo_entrega === "recoger") {
        const storeInvMap = new Map<number, number>();
        for (const row of invRows || []) {
          if (Number(row.sucursal_id) === Number(sucursal_id)) {
            storeInvMap.set(Number(row.producto_id), Number(row.existencias || 0));
          }
        }

        for (const item of carrito.items) {
          const avail = storeInvMap.get(item.producto_id!) || 0;
          if (avail < item.cantidad) {
            await conn.rollback();
            return NextResponse.json(
              {
                exito: false,
                motivo: "stock_insuficiente",
                mensaje: `El producto ${item.nombre} ya no cuenta con existencias suficientes en esta sucursal.`,
              },
              { status: 400 }
            );
          }
        }

        // Descontar en la sucursal
        for (const item of carrito.items) {
          await conn.execute(
            `UPDATE inventario 
             SET existencias = existencias - ? 
             WHERE producto_id = ? AND sucursal_id = ? 
             LIMIT 1`,
            [item.cantidad, item.producto_id, sucursal_id]
          );
        }
      } else {
        // Para envío a domicilio: descontar de la sucursal con mayor existencias
        for (const item of carrito.items) {
          const matching = (invRows || [])
            .filter((r: any) => Number(r.producto_id) === item.producto_id && Number(r.existencias) >= item.cantidad)
            .sort((a: any, b: any) => Number(b.existencias) - Number(a.existencias));

          if (matching.length === 0) {
            await conn.rollback();
            return NextResponse.json(
              {
                exito: false,
                motivo: "stock_insuficiente",
                mensaje: `El producto ${item.nombre} se agotó durante el proceso.`,
              },
              { status: 400 }
            );
          }

          const selectedBranchId = matching[0].sucursal_id;
          await conn.execute(
            `UPDATE inventario 
             SET existencias = existencias - ? 
             WHERE producto_id = ? AND sucursal_id = ? 
             LIMIT 1`,
            [item.cantidad, item.producto_id, selectedBranchId]
          );
        }
      }

      // Copiar dirección si es envío a domicilio
      let envioCalle: string | null = null;
      let envioNumero: string | null = null;
      let envioColonia: string | null = null;
      let envioCp: string | null = null;
      let envioCiudad: string | null = null;
      let envioEstado: string | null = null;
      let envioReferencias: string | null = null;

      if (tipo_entrega === "envio") {
        const [dirRows]: any = await conn.execute(
          `SELECT calle, numero_exterior, numero_interior, colonia, codigo_postal, ciudad, estado, referencias 
           FROM direcciones 
           WHERE id = ? AND usuario_id = ? LIMIT 1`,
          [direccion_id, session.userId]
        );

        if (dirRows && dirRows.length > 0) {
          const d = dirRows[0];
          envioCalle = d.calle;
          envioNumero = d.numero_interior ? `${d.numero_exterior} Int. ${d.numero_interior}` : d.numero_exterior;
          envioColonia = d.colonia;
          envioCp = d.codigo_postal;
          envioCiudad = d.ciudad;
          envioEstado = d.estado;
          envioReferencias = d.referencias;
        }
      }

      // Calcular tiempo de reserva según el método
      let reservaExpiraEn: Date;
      let estadoInicial: any = "pendiente_pago";

      if (metodo === "pagar_en_tienda") {
        estadoInicial = "por_pagar_en_tienda";
        // Cierre de mañana a las 20:00
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(20, 0, 0, 0);
        reservaExpiraEn = tomorrow;
      } else {
        // 15 minutos para tarjeta o Mercado Pago
        reservaExpiraEn = new Date(Date.now() + 15 * 60 * 1000);
      }

      // Generar código de recogida si es para recoger en tienda
      let codigoRecogida: string | null = null;
      if (tipo_entrega === "recoger") {
        codigoRecogida = await generarCodigoRecogida(sucursal_id, conn);
      }

      // Crear pedido con folio
      const [insertOrder]: any = await conn.execute(
        `INSERT INTO pedidos 
         (usuario_id, canal, tipo_entrega, sucursal_id, codigo_recogida,
          envio_calle, envio_numero, envio_colonia, envio_cp, envio_ciudad, envio_estado, envio_referencias, 
          subtotal, descuento, costo_envio, total, metodo_pago, estado, clave_idempotencia, reserva_expira_en, creado_en)
         VALUES (?, 'web', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          session.userId,
          tipo_entrega,
          tipo_entrega === "recoger" ? sucursal_id : null,
          codigoRecogida,
          envioCalle,
          envioNumero,
          envioColonia,
          envioCp,
          envioCiudad,
          envioEstado,
          envioReferencias,
          carrito.subtotal,
          carrito.totalDescuentos,
          costoEnvio,
          totalServidor,
          metodo,
          estadoInicial,
          clave_idempotencia,
          reservaExpiraEn,
        ]
      );

      const pedidoId = insertOrder.insertId;
      const folio = `${PREFIJO_FOLIO || "N"}-${pedidoId}`;
      await conn.execute("UPDATE pedidos SET folio = ? WHERE id = ?", [folio, pedidoId]);

      // Registrar evento inicial del pedido
      await cambiarEstado(pedidoId, estadoInicial, "Creación de pedido en proceso de checkout", conn);

      // Insertar pedido_items
      for (const item of carrito.items) {
        await conn.execute(
          `INSERT INTO pedido_items 
           (pedido_id, producto_id, cantidad, precio_unitario, descuento, grupo_tipo, grupo_clave)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            pedidoId,
            item.producto_id,
            item.cantidad,
            item.precio_vigente,
            0, // Descuento desglosado a nivel grupo
            item.grupo_tipo || null,
            item.grupo_clave || null,
          ]
        );
      }

      // 4. PROCESAR COBRO SEGÚN EL MÉTODO
      const proveedor = getProveedorPagos();

      // Caso A: Pagar en tienda (No cobra en línea, solo aparta)
      if (metodo === "pagar_en_tienda") {
        // Vaciar carrito
        await conn.execute("DELETE FROM carrito_items WHERE carrito_id = ?", [cartId]);
        await conn.commit();

        // Enviar confirmación por correo y registrar notificación
        await enviarConfirmacionPedido({ id: pedidoId, folio });

        // Notificar por WhatsApp si el usuario tiene celular registrado
        const [uRows]: any = await pool.execute(
          "SELECT celular, nombre FROM usuarios WHERE id = ? LIMIT 1",
          [session.userId]
        );
        const [sRows]: any = await pool.execute(
          "SELECT nombre, direccion FROM sucursales WHERE id = ? LIMIT 1",
          [sucursal_id]
        );

        if (uRows?.[0]?.celular) {
          await notificarWhatsAppPedidoListo({
            telefono: uRows[0].celular,
            nombreCliente: uRows[0].nombre || session.nombre,
            folioPedido: folio,
            nombreSucursal: sRows?.[0]?.nombre || "Sucursal",
            direccionSucursal: sRows?.[0]?.direccion || "",
            horaRecogida: "Hoy mismo",
          });
        }

        return NextResponse.json({
          exito: true,
          folio,
          estado: "por_pagar_en_tienda",
        });
      }

      // Caso B: Mercado Pago con Checkout Pro (Redirección)
      if (metodo === "mercado_pago") {
        const appUrl = process.env.APP_URL || "http://localhost:3000";
        const preferencia = await proveedor.crearPreferencia(
          {
            id: pedidoId,
            folio,
            total: totalServidor,
            usuario_id: session.userId,
            usuario_correo: session.correo,
            usuario_nombre: session.nombre,
          },
          {
            success: `${appUrl}/checkout/confirmacion/${folio}`,
            failure: `${appUrl}/checkout?error=pago_rechazado`,
            pending: `${appUrl}/checkout/confirmacion/${folio}?estado=pendiente`,
          }
        );

        await conn.commit();
        return NextResponse.json({
          exito: true,
          folio,
          redirectUrl: preferencia.initPoint,
        });
      }

      // Caso C: Tarjeta Bancaria (Guardada o Nueva Tokenizada)
      let tokenFinal = token_tarjeta;

      if (id_tarjeta_guardada) {
        const [savedRows]: any = await conn.execute(
          "SELECT token_proveedor FROM metodos_pago WHERE id = ? AND usuario_id = ? LIMIT 1",
          [id_tarjeta_guardada, session.userId]
        );

        if (savedRows && savedRows.length > 0) {
          tokenFinal = savedRows[0].token_proveedor;
        } else {
          await conn.rollback();
          return NextResponse.json(
            { error: "Tarjeta guardada no encontrada." },
            { status: 400 }
          );
        }
      }

      if (!tokenFinal) {
        await conn.rollback();
        return NextResponse.json(
          { error: "Token de tarjeta no proporcionado." },
          { status: 400 }
        );
      }

      // Cobrar con el proveedor
      const resultadoCobro = await proveedor.cobrar(
        {
          id: pedidoId,
          folio,
          total: totalServidor,
          usuario_id: session.userId,
          usuario_correo: session.correo,
          usuario_nombre: session.nombre,
        },
        tokenFinal,
        clave_idempotencia
      );

      if (resultadoCobro.aprobado) {
        const nuevoEstado = "pagado";
        await cambiarEstado(
          pedidoId,
          nuevoEstado,
          "Pago con tarjeta aprobado exitosamente",
          conn
        );

        await conn.execute(
          `INSERT INTO pagos (pedido_id, proveedor, referencia_proveedor, estado, monto, detalle_json, creado_en)
           VALUES (?, ?, ?, 'aprobado', ?, ?, NOW())`,
          [
            pedidoId,
            proveedor.nombre,
            resultadoCobro.idTransaccion || null,
            totalServidor,
            JSON.stringify(resultadoCobro.detalleJson || {}),
          ]
        );

        // Guardar tarjeta si el usuario lo solicitó
        if (guardar_tarjeta && datos_tarjeta_nueva) {
          await proveedor.guardarTarjeta(session.userId, tokenFinal, datos_tarjeta_nueva);
        }

        // Vaciar el carrito tras el pago exitoso
        await conn.execute("DELETE FROM carrito_items WHERE carrito_id = ?", [cartId]);

        await conn.commit();

        // Enviar confirmación por correo y registrar notificación
        await enviarConfirmacionPedido({ id: pedidoId, folio });

        return NextResponse.json({
          exito: true,
          folio,
          estado: nuevoEstado,
        });
      } else {
        // Cobro rechazado o fondos insuficientes:
        // Regresar el inventario reservado
        for (const item of carrito.items) {
          await conn.execute(
            `UPDATE inventario 
             SET existencias = existencias + ? 
             WHERE producto_id = ? 
             ORDER BY existencias ASC 
             LIMIT 1`,
            [item.cantidad, item.producto_id]
          );
        }

        await cambiarEstado(
          pedidoId,
          "pago_fallido",
          `Pago rechazado: ${resultadoCobro.mensaje}`,
          conn
        );

        await conn.execute(
          `INSERT INTO pagos (pedido_id, proveedor, referencia_proveedor, estado, monto, detalle_json, creado_en)
           VALUES (?, ?, ?, 'rechazado', ?, ?, NOW())`,
          [
            pedidoId,
            proveedor.nombre,
            resultadoCobro.idTransaccion || null,
            totalServidor,
            JSON.stringify(resultadoCobro.detalleJson || {}),
          ]
        );

        await conn.commit();

        return NextResponse.json(
          {
            exito: false,
            motivo: resultadoCobro.estado,
            mensaje: resultadoCobro.mensaje,
          },
          { status: 400 }
        );
      }
    } catch (dbErr) {
      if (conn) await conn.rollback();
      throw dbErr;
    } finally {
      if (conn) conn.release();
    }
  } catch (err: any) {
    console.error("[POST /api/checkout/pagar Error]:", err);
    return NextResponse.json(
      { error: "Error interno al procesar el pago. Por favor intenta de nuevo." },
      { status: 500 }
    );
  }
}

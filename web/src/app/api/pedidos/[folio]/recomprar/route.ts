import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getAuthUserFromRequest } from "@/lib/session";
import { getDbPool } from "@/lib/db";
import { getOrCreateCart } from "@/lib/carrito";

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
      return NextResponse.json(
        { error: "Folio de pedido no proporcionado" },
        { status: 400 }
      );
    }

    const pool = getDbPool();

    // 1. Verificar existencia del pedido y que pertenezca al usuario en sesión
    const [orderRows]: any = await pool.execute(
      "SELECT id, folio, usuario_id FROM pedidos WHERE folio = ? LIMIT 1",
      [folio]
    );

    if (!orderRows || orderRows.length === 0) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 }
      );
    }

    const order = orderRows[0];
    if (order.usuario_id !== user.userId) {
      return NextResponse.json(
        { error: "No tienes permiso para ver este pedido" },
        { status: 403 }
      );
    }

    // 2. Obtener los ítems originales del pedido con disponibilidad actual e inventario
    const [itemRows]: any = await pool.execute(
      `SELECT 
         pi.id as item_id,
         pi.producto_id,
         pi.cantidad as cantidad_original,
         pi.grupo_tipo,
         pi.grupo_clave,
         p.nombre,
         p.precio,
         p.precio_especial,
         p.activo,
         COALESCE(SUM(i.existencias), 0) as total_stock
       FROM pedido_items pi
       JOIN productos p ON pi.producto_id = p.id
       LEFT JOIN inventario i ON i.producto_id = p.id
       WHERE pi.pedido_id = ?
       GROUP BY pi.id, pi.producto_id`,
      [order.id]
    );

    const items = Array.isArray(itemRows) ? itemRows : [];
    if (items.length === 0) {
      return NextResponse.json(
        { error: "El pedido no contiene productos" },
        { status: 400 }
      );
    }

    // 3. Obtener o crear carrito activo del usuario
    const dummyResponse = NextResponse.json({ ok: true });
    const { cartId } = await getOrCreateCart(req, dummyResponse);

    // 4. Separar por grupos (rutinas/combos) y productos individuales
    const gruposMap: Record<string, any[]> = {};
    const itemsIndividuales: any[] = [];

    for (const item of items) {
      if (item.grupo_tipo && item.grupo_clave) {
        const key = `${item.grupo_tipo}:${item.grupo_clave}`;
        if (!gruposMap[key]) {
          gruposMap[key] = [];
        }
        gruposMap[key].push(item);
      } else {
        itemsIndividuales.push(item);
      }
    }

    const agregados: Array<{ id: number; nombre: string; cantidad: number }> = [];
    const omitidos: Array<{ id: number; nombre: string; motivo: string }> = [];

    // 5. Procesar grupos (rutinas o combos)
    for (const [key, groupItems] of Object.entries(gruposMap)) {
      const [gTipo, gClave] = key.split(":");
      
      let grupoValido = true;
      let descuentoPorcentaje = 0;

      if (gTipo === "rutina") {
        const [plantillaRows]: any = await pool.execute(
          "SELECT id, clave, nombre, descuento_porcentaje FROM plantillas_rutina WHERE clave = ? AND activa = 1 LIMIT 1",
          [gClave]
        );
        if (plantillaRows && plantillaRows.length > 0) {
          descuentoPorcentaje = Number(plantillaRows[0].descuento_porcentaje || 0);
        } else {
          grupoValido = false;
        }
      }

      // Verificar que todos los productos del grupo sigan activos y con stock
      for (const gItem of groupItems) {
        if (!gItem.activo || Number(gItem.total_stock) <= 0) {
          grupoValido = false;
          break;
        }
      }

      if (grupoValido) {
        // Se agregan todos como grupo para que el descuento se aplique
        const nuevoGrupoId = crypto.randomUUID();
        for (const gItem of groupItems) {
          const basePrice = Number(gItem.precio_especial ?? gItem.precio);
          const precioConDescuento = Math.round(basePrice * (1 - descuentoPorcentaje / 100));
          const cantAgregar = Math.min(Number(gItem.cantidad_original) || 1, Number(gItem.total_stock));

          await pool.execute(
            `INSERT INTO carrito_items 
              (carrito_id, producto_id, combo_id, cantidad, precio_unitario_al_agregar, grupo_id, grupo_tipo, grupo_clave, descuento_porcentaje) 
             VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
            [
              cartId,
              gItem.producto_id,
              cantAgregar,
              precioConDescuento,
              nuevoGrupoId,
              gTipo,
              gClave,
              descuentoPorcentaje,
            ]
          );

          agregados.push({
            id: gItem.producto_id,
            nombre: gItem.nombre,
            cantidad: cantAgregar,
          });
        }
      } else {
        // Si falta alguno o la plantilla ya no está activa, los disponibles se agregan sueltos
        for (const gItem of groupItems) {
          if (!gItem.activo || Number(gItem.total_stock) <= 0) {
            omitidos.push({
              id: gItem.producto_id,
              nombre: gItem.nombre,
              motivo: "agotado",
            });
          } else {
            itemsIndividuales.push(gItem);
          }
        }
      }
    }

    // 6. Procesar productos individuales
    for (const item of itemsIndividuales) {
      if (!item.activo || Number(item.total_stock) <= 0) {
        omitidos.push({
          id: item.producto_id,
          nombre: item.nombre,
          motivo: "agotado",
        });
        continue;
      }

      // Validar si ya está en el carrito
      const [existing]: any = await pool.execute(
        "SELECT id, cantidad FROM carrito_items WHERE carrito_id = ? AND producto_id = ? AND grupo_id IS NULL AND eliminado_en IS NULL LIMIT 1",
        [cartId, item.producto_id]
      );

      const cantDeseada = Number(item.cantidad_original) || 1;
      const cantActualEnCarrito = existing && existing.length > 0 ? Number(existing[0].cantidad) : 0;
      const cantMaximaPosible = Math.min(cantActualEnCarrito + cantDeseada, Number(item.total_stock));
      const cantAgregadaEfectiva = cantMaximaPosible - cantActualEnCarrito;

      if (cantAgregadaEfectiva <= 0) {
        omitidos.push({
          id: item.producto_id,
          nombre: item.nombre,
          motivo: "agotado_o_en_carrito",
        });
        continue;
      }

      const precioUnitario = Number(item.precio_especial ?? item.precio);

      if (existing && existing.length > 0) {
        await pool.execute(
          "UPDATE carrito_items SET cantidad = ?, precio_unitario_al_agregar = ? WHERE id = ?",
          [cantMaximaPosible, precioUnitario, existing[0].id]
        );
      } else {
        await pool.execute(
          `INSERT INTO carrito_items 
            (carrito_id, producto_id, combo_id, cantidad, precio_unitario_al_agregar, grupo_id, grupo_tipo, grupo_clave, descuento_porcentaje) 
           VALUES (?, ?, NULL, ?, ?, NULL, NULL, NULL, NULL)`,
          [cartId, item.producto_id, cantAgregadaEfectiva, precioUnitario]
        );
      }

      agregados.push({
        id: item.producto_id,
        nombre: item.nombre,
        cantidad: cantAgregadaEfectiva,
      });
    }

    // 7. Determinar tipo y texto del Toast
    const totalOriginalCount = items.length;
    let toastTipo: "todo" | "parcial" | "nada" = "nada";
    let toastMensaje = "";

    const totalPiezasAgregadas = agregados.reduce((acc, curr) => acc + curr.cantidad, 0);

    if (agregados.length === totalOriginalCount && omitidos.length === 0) {
      toastTipo = "todo";
      toastMensaje = `Agregamos ${totalPiezasAgregadas} ${
        totalPiezasAgregadas === 1 ? "producto" : "productos"
      } a tu bolsa`;
    } else if (agregados.length > 0) {
      toastTipo = "parcial";
      const primerAgotado = omitidos[0]?.nombre || "Un producto";
      toastMensaje = `Agregamos ${agregados.length} de ${totalOriginalCount} productos. ${primerAgotado} está agotado.`;
    } else {
      toastTipo = "nada";
      toastMensaje = "Ninguno de estos productos está disponible por ahora";
    }

    // 8. Consultar nuevo total en carrito
    const [countRows]: any = await pool.execute(
      "SELECT COALESCE(SUM(cantidad), 0) as totalItems FROM carrito_items WHERE carrito_id = ? AND eliminado_en IS NULL",
      [cartId]
    );
    const cartCount = Number(countRows[0]?.totalItems || 0);

    return NextResponse.json({
      success: agregados.length > 0,
      agregados,
      omitidos,
      toastTipo,
      toastMensaje,
      cartCount,
    });
  } catch (error: any) {
    console.error("[API RECOMPRAR PEDIDO ERROR]:", error);
    return NextResponse.json(
      { error: "Error al volver a comprar el pedido", details: error.message },
      { status: 500 }
    );
  }
}

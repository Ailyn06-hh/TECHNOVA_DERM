import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getOrCreateCart } from "@/lib/carrito";
import { getDbPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clave, tipoPiel, productoIds } = body;

    if (!clave || typeof clave !== "string") {
      return NextResponse.json(
        { error: "Debes especificar la clave de la rutina (ej. manana o noche)." },
        { status: 400 }
      );
    }

    if (!Array.isArray(productoIds) || productoIds.length === 0) {
      return NextResponse.json(
        { error: "Debes incluir los IDs de los productos de la rutina." },
        { status: 400 }
      );
    }

    const ids = productoIds.map((id) => Number(id)).filter((id) => !isNaN(id) && id > 0);
    if (ids.length === 0) {
      return NextResponse.json(
        { error: "Lista de productos inválida." },
        { status: 400 }
      );
    }

    const pool = getDbPool();

    // 1. Obtener la plantilla de rutina activa
    const [plantillaRows]: any = await pool.execute(
      "SELECT id, clave, nombre, descuento_porcentaje FROM plantillas_rutina WHERE clave = ? AND activa = 1 LIMIT 1",
      [clave]
    );

    if (!plantillaRows || plantillaRows.length === 0) {
      return NextResponse.json(
        { error: `La plantilla de rutina "${clave}" no existe o no está activa.` },
        { status: 404 }
      );
    }

    const plantilla = plantillaRows[0];
    const descuentoPorcentaje = Number(plantilla.descuento_porcentaje || 0);

    // 2. Obtener pasos definidos para la plantilla
    const [pasoRows]: any = await pool.execute(
      "SELECT orden, tipo_rutina, etiqueta FROM plantilla_pasos WHERE plantilla_id = ? ORDER BY orden ASC",
      [plantilla.id]
    );

    const pasosDefinidos = pasoRows || [];
    if (pasosDefinidos.length !== ids.length) {
      return NextResponse.json(
        {
          error: "Incompatibilidad de pasos",
          message: `La rutina "${plantilla.nombre}" requiere exactamente ${pasosDefinidos.length} productos (uno por paso).`,
        },
        { status: 400 }
      );
    }

    // 3. Validar cada producto: existencia, activo, coincidencia con tipo_rutina del paso y stock > 0
    const productosValidados: Array<{
      id: number;
      nombre: string;
      precioUnitarioFinal: number;
      orden: number;
    }> = [];

    for (let i = 0; i < pasosDefinidos.length; i++) {
      const paso = pasosDefinidos[i];
      const prodId = ids[i];

      const [prodRows]: any = await pool.execute(
        `SELECT 
          p.id, 
          p.nombre, 
          p.tipo_rutina, 
          p.precio, 
          p.precio_especial, 
          p.activo,
          COALESCE(SUM(i.existencias), 0) as total_stock
         FROM productos p
         LEFT JOIN inventario i ON i.producto_id = p.id
         WHERE p.id = ?
         GROUP BY p.id`,
        [prodId]
      );

      if (!prodRows || prodRows.length === 0 || !prodRows[0].activo) {
        return NextResponse.json(
          {
            error: "Producto no disponible",
            message: `El producto para el paso "${paso.etiqueta}" ya no está disponible.`,
            faltantePaso: paso.etiqueta,
            productoId: prodId,
          },
          { status: 400 }
        );
      }

      const p = prodRows[0];

      // Verificar que coincida con el tipo_rutina del paso
      if (p.tipo_rutina !== paso.tipo_rutina) {
        return NextResponse.json(
          {
            error: "Paso incompatible",
            message: `El producto "${p.nombre}" no corresponde al paso "${paso.etiqueta}" (${paso.tipo_rutina}).`,
          },
          { status: 400 }
        );
      }

      // Verificar stock disponible en inventario
      if (Number(p.total_stock) < 1) {
        return NextResponse.json(
          {
            error: "Sin stock suficiente",
            message: `El producto "${p.nombre}" se ha agotado. Actualizando rutinas...`,
            faltantePaso: paso.etiqueta,
            productoId: prodId,
          },
          { status: 400 }
        );
      }

      // Recalcular precio con el descuento oficial de la plantilla en el servidor (nunca fiarse del cliente)
      const basePrice = Number(p.precio_especial ?? p.precio);
      const precioConDescuento = Math.round(basePrice * (1 - descuentoPorcentaje / 100));

      productosValidados.push({
        id: p.id,
        nombre: p.nombre,
        precioUnitarioFinal: precioConDescuento,
        orden: paso.orden,
      });
    }

    // 4. Obtener o crear carrito del usuario/invitado
    const response = NextResponse.json({ ok: true });
    const { cartId, newGuestCookie } = await getOrCreateCart(req, response);

    // 5. Generar identificador de grupo para que el carrito sepa que se agregaron juntos
    const grupoId = crypto.randomUUID();

    // 6. Insertar los productos en carrito_items con las columnas de agrupación
    for (const p of productosValidados) {
      await pool.execute(
        `INSERT INTO carrito_items 
          (carrito_id, producto_id, combo_id, cantidad, precio_unitario_al_agregar, grupo_id, grupo_tipo, grupo_clave, descuento_porcentaje) 
         VALUES (?, ?, NULL, 1, ?, ?, 'rutina', ?, ?)`,
        [cartId, p.id, p.precioUnitarioFinal, grupoId, plantilla.clave, descuentoPorcentaje]
      );
    }

    // 7. Obtener nuevo total de ítems en el carrito
    const [countRows]: any = await pool.execute(
      "SELECT COALESCE(SUM(cantidad), 0) as totalItems FROM carrito_items WHERE carrito_id = ?",
      [cartId]
    );

    const totalItems = Number(countRows[0]?.totalItems || 0);

    const successResponse = NextResponse.json(
      {
        success: true,
        message: "Rutina agregada a tu bolsa",
        totalItems,
        grupoId,
        plantilla: plantilla.nombre,
      },
      { status: 200 }
    );

    if (newGuestCookie) {
      successResponse.cookies.set({
        name: newGuestCookie.name,
        value: newGuestCookie.value,
        maxAge: newGuestCookie.maxAge,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
      });
    }

    return successResponse;
  } catch (error: any) {
    console.error("[CARRITO RUTINA ERROR]:", error);
    return NextResponse.json(
      { error: "Error al agregar rutina al carrito", message: error.message },
      { status: 500 }
    );
  }
}

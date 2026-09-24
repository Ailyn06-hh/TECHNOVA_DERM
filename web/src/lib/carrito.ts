import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { getDbPool } from "./db";
import { getAuthUserFromRequest, getAuthUserServer } from "./session";
import { ENVIO_GRATIS_DESDE } from "./marca";

export const GUEST_CART_COOKIE = "token_invitado";

/**
 * Obtiene o crea el carrito activo para el usuario autenticado o para un invitado
 */
export async function getOrCreateCart(
  req: NextRequest,
  response?: NextResponse
): Promise<{
  cartId: number;
  userId: number | null;
  guestToken: string | null;
  newGuestCookie?: { name: string; value: string; maxAge: number };
}> {
  const pool = getDbPool();
  const session = getAuthUserFromRequest(req);

  // 1. Usuario autenticado
  if (session?.userId) {
    const [rows]: any = await pool.execute(
      "SELECT id FROM carritos WHERE usuario_id = ? LIMIT 1",
      [session.userId]
    );

    if (rows && rows.length > 0) {
      return { cartId: rows[0].id, userId: session.userId, guestToken: null };
    }

    const [insertRes]: any = await pool.execute(
      "INSERT INTO carritos (usuario_id, actualizado_en) VALUES (?, NOW())",
      [session.userId]
    );

    return { cartId: insertRes.insertId, userId: session.userId, guestToken: null };
  }

  // 2. Usuario invitado
  let guestToken = req.cookies.get(GUEST_CART_COOKIE)?.value;
  let isNewGuestToken = false;

  if (!guestToken || guestToken.length < 16) {
    guestToken = crypto.randomBytes(24).toString("hex");
    isNewGuestToken = true;
  }

  const [guestRows]: any = await pool.execute(
    "SELECT id FROM carritos WHERE token_invitado = ? LIMIT 1",
    [guestToken]
  );

  let cartId: number;

  if (guestRows && guestRows.length > 0) {
    cartId = guestRows[0].id;
  } else {
    const [insertRes]: any = await pool.execute(
      "INSERT INTO carritos (token_invitado, actualizado_en) VALUES (?, NOW())",
      [guestToken]
    );
    cartId = insertRes.insertId;
  }

  const cookieData = isNewGuestToken
    ? {
        name: GUEST_CART_COOKIE,
        value: guestToken,
        maxAge: 60 * 60 * 24 * 30, // 30 días
      }
    : undefined;

  if (response && cookieData) {
    response.cookies.set({
      name: cookieData.name,
      value: cookieData.value,
      maxAge: cookieData.maxAge,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
  }

  return {
    cartId,
    userId: null,
    guestToken,
    newGuestCookie: cookieData,
  };
}

/**
 * Obtiene el carrito calculado para componentes de servidor (SSR)
 */
export async function getCartForServer(): Promise<{
  carrito: CarritoCalculado;
  isLoggedIn: boolean;
  cartId: number | null;
  userId: number | null;
}> {
  const session = getAuthUserServer();
  const cookieStore = cookies();
  const pool = getDbPool();

  let cartId: number | null = null;
  const userId = session?.userId ?? null;

  if (userId) {
    const [rows]: any = await pool.execute(
      "SELECT id FROM carritos WHERE usuario_id = ? LIMIT 1",
      [userId]
    );
    if (rows && rows.length > 0) {
      cartId = rows[0].id;
    }
  } else {
    const guestToken = cookieStore.get(GUEST_CART_COOKIE)?.value;
    if (guestToken) {
      const [rows]: any = await pool.execute(
        "SELECT id FROM carritos WHERE token_invitado = ? LIMIT 1",
        [guestToken]
      );
      if (rows && rows.length > 0) {
        cartId = rows[0].id;
      }
    }
  }

  if (!cartId) {
    return {
      carrito: {
        cartId: 0,
        items: [],
        grupos: [],
        otrosItems: [],
        totalItems: 0,
        subtotal: 0,
        totalDescuentos: 0,
        lineasDescuento: [],
        costoEnvioTexto: "Calculando...",
        tieneEnvioGratis: false,
        faltaParaEnvioGratis: ENVIO_GRATIS_DESDE,
        total: 0,
        hayAgotados: false,
        hayInsuficientes: false,
        tieneArticulos: false,
        avisoOmnicanal: userId
          ? undefined
          : {
              tipo: "invitado",
              mensaje: "Inicia sesión para sincronizar tu carrito con la app y tienda física.",
              linkHref: "/login?volver=/carrito",
              linkLabel: "Iniciar sesión",
            },
      },
      isLoggedIn: Boolean(userId),
      cartId: null,
      userId,
    };
  }

  const carrito = await calcularCarrito(cartId, userId ?? undefined);
  return {
    carrito,
    isLoggedIn: Boolean(userId),
    cartId,
    userId,
  };
}

/**
 * Fusiona el carrito del invitado con el del usuario autenticado sumando cantidades
 * sin sobrepasar el stock disponible.
 */
export async function fusionarCarritoInvitado(
  userId: number,
  guestToken: string | undefined
): Promise<void> {
  if (!guestToken) return;

  const pool = getDbPool();
  let connection: any = null;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Buscar carrito de invitado
    const [gCartRows]: any = await connection.execute(
      "SELECT id FROM carritos WHERE token_invitado = ? LIMIT 1",
      [guestToken]
    );

    if (!gCartRows || gCartRows.length === 0) {
      await connection.rollback();
      return;
    }

    const guestCartId = gCartRows[0].id;

    // 2. Obtener o crear carrito del usuario
    let [uCartRows]: any = await connection.execute(
      "SELECT id FROM carritos WHERE usuario_id = ? LIMIT 1",
      [userId]
    );

    let userCartId: number;
    if (uCartRows && uCartRows.length > 0) {
      userCartId = uCartRows[0].id;
    } else {
      const [uInsert]: any = await connection.execute(
        "INSERT INTO carritos (usuario_id, actualizado_en) VALUES (?, NOW())",
        [userId]
      );
      userCartId = uInsert.insertId;
    }

    // 3. Obtener items del carrito de invitado
    const [guestItems]: any = await connection.execute(
      "SELECT producto_id, combo_id, cantidad, precio_unitario_al_agregar, grupo_id, grupo_tipo, grupo_clave, descuento_porcentaje FROM carrito_items WHERE carrito_id = ?",
      [guestCartId]
    );

    for (const item of guestItems) {
      if (item.producto_id) {
        // Consultar stock total
        const [stockRows]: any = await connection.execute(
          "SELECT COALESCE(SUM(existencias), 0) AS total_stock FROM inventario WHERE producto_id = ?",
          [item.producto_id]
        );
        const totalStock = Number(stockRows[0]?.total_stock || 0);

        // Verificar si ya existe en el carrito del usuario (mismo producto y mismo grupo)
        const [existing]: any = await connection.execute(
          "SELECT id, cantidad FROM carrito_items WHERE carrito_id = ? AND producto_id = ? AND (grupo_id <=> ?) LIMIT 1",
          [userCartId, item.producto_id, item.grupo_id]
        );

        if (existing && existing.length > 0) {
          const nuevaCantidad = Math.min(
            totalStock,
            existing[0].cantidad + item.cantidad
          );
          await connection.execute(
            "UPDATE carrito_items SET cantidad = ? WHERE id = ?",
            [nuevaCantidad, existing[0].id]
          );
        } else {
          const cantidadFinal = Math.min(totalStock, item.cantidad);
          if (cantidadFinal > 0) {
            await connection.execute(
              `INSERT INTO carrito_items 
                (carrito_id, producto_id, combo_id, cantidad, precio_unitario_al_agregar, grupo_id, grupo_tipo, grupo_clave, descuento_porcentaje) 
               VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
              [
                userCartId,
                item.producto_id,
                cantidadFinal,
                item.precio_unitario_al_agregar,
                item.grupo_id,
                item.grupo_tipo,
                item.grupo_clave,
                item.descuento_porcentaje,
              ]
            );
          }
        }
      } else if (item.combo_id) {
        // Manejar combo
        const [existing]: any = await connection.execute(
          "SELECT id, cantidad FROM carrito_items WHERE carrito_id = ? AND combo_id = ? AND (grupo_id <=> ?) LIMIT 1",
          [userCartId, item.combo_id, item.grupo_id]
        );

        if (existing && existing.length > 0) {
          await connection.execute(
            "UPDATE carrito_items SET cantidad = cantidad + ? WHERE id = ?",
            [item.cantidad, existing[0].id]
          );
        } else {
          await connection.execute(
            `INSERT INTO carrito_items 
              (carrito_id, producto_id, combo_id, cantidad, precio_unitario_al_agregar, grupo_id, grupo_tipo, grupo_clave, descuento_porcentaje) 
             VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?)`,
            [
              userCartId,
              item.combo_id,
              item.cantidad,
              item.precio_unitario_al_agregar,
              item.grupo_id,
              item.grupo_tipo,
              item.grupo_clave,
              item.descuento_porcentaje,
            ]
          );
        }
      }
    }

    // 4. Eliminar el carrito de invitado y sus items
    await connection.execute("DELETE FROM carritos WHERE id = ?", [guestCartId]);

    await connection.commit();
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("[FUSIONAR CARRITO ERROR]:", error);
  } finally {
    if (connection) connection.release();
  }
}

// =====================================================================
// CÁLCULO Y FUENTE ÚNICA DE VERDAD DEL CARRITO (calcularCarrito)
// =====================================================================

export type EstadoStock = "disponible" | "pocas" | "insuficiente" | "agotado";

export interface CarritoItemCalculado {
  id: number;
  carrito_id: number;
  producto_id: number | null;
  combo_id: number | null;
  cantidad: number;
  precio_unitario_al_agregar: number;
  precio_vigente: number;
  subtotal: number;
  grupo_id: string | null;
  grupo_tipo: "rutina" | "combo" | null;
  grupo_clave: string | null;
  descuento_porcentaje: number | null;
  canal_origen: "web" | "app" | "tienda";
  nombre: string;
  slug: string;
  color_fondo: string;
  color_frasco: string;
  tipo_rutina?: string | null;
  total_stock: number;
  estado_stock: EstadoStock;
  estado_stock_texto: string;
  cambioPrecio?: {
    antes: number;
    ahora: number;
  } | null;
}

export interface LineaDescuento {
  grupo_id: string;
  nombre: string;
  monto: number;
}

export interface CarritoGrupoCalculado {
  grupo_id: string;
  grupo_tipo: "rutina" | "combo";
  grupo_clave: string;
  nombre: string;
  totalPasos?: number;
  descuento_porcentaje: number;
  descuentoAplicado: boolean;
  juegosCompletos: number;
  etiquetaBadge: string;
  mensajeFaltante?: string;
  productoFaltante?: {
    id: number;
    nombre: string;
    slug: string;
  } | null;
  items: CarritoItemCalculado[];
}

export interface CarritoCalculado {
  cartId: number;
  items: CarritoItemCalculado[];
  grupos: CarritoGrupoCalculado[];
  otrosItems: CarritoItemCalculado[];
  totalItems: number;
  subtotal: number;
  totalDescuentos: number;
  lineasDescuento: LineaDescuento[];
  costoEnvioTexto: string;
  tieneEnvioGratis: boolean;
  faltaParaEnvioGratis: number;
  total: number;
  hayAgotados: boolean;
  hayInsuficientes: boolean;
  tieneArticulos: boolean;
  avisoOmnicanal?: {
    tipo: "app" | "tienda" | "web" | "invitado";
    mensaje: string;
    linkHref?: string;
    linkLabel?: string;
  };
}

/**
 * Calcula el estado íntegro y en tiempo real del carrito de compras.
 * Única fuente de verdad de precios vigentes, disponibilidad de inventario,
 * detección de cambio de precios y descuentos de grupos (rutinas/combos).
 */
export async function calcularCarrito(
  carritoId: number,
  userIdOverride?: number | null
): Promise<CarritoCalculado> {
  const pool = getDbPool();

  // 1. Obtener carrito y usuario
  const [cartRows]: any = await pool.execute(
    "SELECT id, usuario_id, token_invitado FROM carritos WHERE id = ? LIMIT 1",
    [carritoId]
  );

  const cart = cartRows?.[0] || null;
  const userId = userIdOverride !== undefined ? userIdOverride : cart?.usuario_id || null;

  // 2. Obtener items activos (no eliminados)
  const [itemRows]: any = await pool.execute(
    `SELECT 
      ci.id,
      ci.carrito_id,
      ci.producto_id,
      ci.combo_id,
      ci.cantidad,
      ci.precio_unitario_al_agregar,
      ci.grupo_id,
      ci.grupo_tipo,
      ci.grupo_clave,
      ci.descuento_porcentaje,
      ci.canal_origen,
      ci.actualizado_en,
      p.nombre as producto_nombre,
      p.slug as producto_slug,
      p.precio as producto_precio,
      p.precio_especial as producto_precio_especial,
      p.color_fondo as producto_color_fondo,
      p.color_frasco as producto_color_frasco,
      p.tipo_rutina as producto_tipo_rutina,
      p.activo as producto_activo,
      cb.nombre as combo_nombre,
      cb.slug as combo_slug,
      cb.color_fondo as combo_color_fondo,
      cb.descuento_porcentaje as combo_descuento_porcentaje,
      cb.activo as combo_activo
     FROM carrito_items ci
     LEFT JOIN productos p ON p.id = ci.producto_id
     LEFT JOIN combos cb ON cb.id = ci.combo_id
     WHERE ci.carrito_id = ? AND ci.eliminado_en IS NULL
     ORDER BY ci.id ASC`,
    [carritoId]
  );

  const itemsRaw: any[] = itemRows || [];

  // 3. Procesar inventario y precios vigentes para cada artículo
  const itemsCalculados: CarritoItemCalculado[] = [];

  for (const row of itemsRaw) {
    let totalStock = 0;
    let nombre = "";
    let slug = "";
    let colorFondo = "#F3E1E4";
    let colorFrasco = "#D08C98";
    let precioVigente = 0;
    let tipoRutina: string | null = null;
    let isActivo = true;

    if (row.producto_id) {
      nombre = row.producto_nombre || "Producto";
      slug = row.producto_slug || "";
      colorFondo = row.producto_color_fondo || "#F3E1E4";
      colorFrasco = row.producto_color_frasco || "#D08C98";
      tipoRutina = row.producto_tipo_rutina || null;
      isActivo = Boolean(row.producto_activo);
      precioVigente = Number(row.producto_precio_especial ?? row.producto_precio ?? 0);

      const [invRows]: any = await pool.execute(
        "SELECT COALESCE(SUM(existencias), 0) as total_stock FROM inventario WHERE producto_id = ?",
        [row.producto_id]
      );
      totalStock = Number(invRows[0]?.total_stock || 0);
    } else if (row.combo_id) {
      nombre = row.combo_nombre || "Combo";
      slug = row.combo_slug || "";
      colorFondo = row.combo_color_fondo || "#FDF2F4";
      colorFrasco = "#6B1F4A";
      isActivo = Boolean(row.combo_activo);

      // Calcular precio vigente y stock del combo consultando sus componentes
      const [cpRows]: any = await pool.execute(
        `SELECT cp.cantidad, p.precio, p.precio_especial,
                COALESCE(SUM(i.existencias), 0) as total_stock
         FROM combo_productos cp
         JOIN productos p ON p.id = cp.producto_id
         LEFT JOIN inventario i ON i.producto_id = cp.producto_id
         WHERE cp.combo_id = ?
         GROUP BY cp.producto_id`,
        [row.combo_id]
      );

      const cpList: any[] = cpRows || [];
      const subtotalProds = cpList.reduce((acc, p) => {
        const pUnit = Number(p.precio_especial ?? p.precio);
        return acc + pUnit * Number(p.cantidad);
      }, 0);

      precioVigente = subtotalProds;
      if (cpList.length > 0) {
        totalStock = Math.min(
          ...cpList.map((p) => Math.floor(Number(p.total_stock) / Number(p.cantidad || 1)))
        );
      } else {
        totalStock = 0;
      }
    }

    // Determinar estado de stock según reglas de negocio
    let estadoStock: EstadoStock = "disponible";
    let estadoStockTexto = "En stock";

    if (totalStock <= 0 || !isActivo) {
      estadoStock = "agotado";
      estadoStockTexto = "Agotado · quítalo para continuar";
    } else if (Number(row.cantidad) > totalStock) {
      estadoStock = "insuficiente";
      estadoStockTexto = `Solo quedan ${totalStock}`;
    } else if (totalStock >= 1 && totalStock <= 5) {
      estadoStock = "pocas";
      estadoStockTexto =
        totalStock === 1
          ? "Última pieza: se aparta al pagar"
          : `Últimas ${totalStock} piezas: se apartan al pagar`;
    } else {
      estadoStock = "disponible";
      estadoStockTexto = "En stock";
    }

    // Detectar cambio de precio frente al precio unitario al agregar
    let cambioPrecio: { antes: number; ahora: number } | null = null;
    const precioAlAgregar = Number(row.precio_unitario_al_agregar || 0);

    if (!row.grupo_id) {
      if (Math.round(precioVigente) !== Math.round(precioAlAgregar)) {
        cambioPrecio = {
          antes: Math.round(precioAlAgregar),
          ahora: Math.round(precioVigente),
        };
      }
    } else {
      // Para grupos con descuento, comparar el precio base equivalente
      const descPct = Number(row.descuento_porcentaje || 0);
      const precioEsperadoConDesc = Math.round(precioVigente * (1 - descPct / 100));
      if (Math.round(precioEsperadoConDesc) !== Math.round(precioAlAgregar)) {
        cambioPrecio = {
          antes: Math.round(precioAlAgregar),
          ahora: Math.round(precioEsperadoConDesc),
        };
      }
    }

    const cantidad = Number(row.cantidad);
    const subtotalItem = estadoStock === "agotado" ? 0 : precioVigente * cantidad;

    itemsCalculados.push({
      id: Number(row.id),
      carrito_id: Number(row.carrito_id),
      producto_id: row.producto_id ? Number(row.producto_id) : null,
      combo_id: row.combo_id ? Number(row.combo_id) : null,
      cantidad,
      precio_unitario_al_agregar: precioAlAgregar,
      precio_vigente: precioVigente,
      subtotal: subtotalItem,
      grupo_id: row.grupo_id || null,
      grupo_tipo: row.grupo_tipo || null,
      grupo_clave: row.grupo_clave || null,
      descuento_porcentaje: row.descuento_porcentaje ? Number(row.descuento_porcentaje) : null,
      canal_origen: row.canal_origen || "web",
      nombre,
      slug,
      color_fondo: colorFondo,
      color_frasco: colorFrasco,
      tipo_rutina: tipoRutina,
      total_stock: totalStock,
      estado_stock: estadoStock,
      estado_stock_texto: estadoStockTexto,
      cambioPrecio,
    });
  }

  // 4. Agrupar artículos por grupo_id y calcular descuentos
  const gruposMap = new Map<string, CarritoItemCalculado[]>();
  const otrosItems: CarritoItemCalculado[] = [];

  for (const item of itemsCalculados) {
    if (item.grupo_id) {
      if (!gruposMap.has(item.grupo_id)) {
        gruposMap.set(item.grupo_id, []);
      }
      gruposMap.get(item.grupo_id)!.push(item);
    } else {
      otrosItems.push(item);
    }
  }

  const gruposCalculados: CarritoGrupoCalculado[] = [];
  const lineasDescuento: LineaDescuento[] = [];

  for (const [grupoId, gItems] of Array.from(gruposMap.entries())) {
    const primerItem = gItems[0];
    const grupoTipo = primerItem.grupo_tipo || "rutina";
    const grupoClave = primerItem.grupo_clave || "";
    let descuentoPct = Number(primerItem.descuento_porcentaje || 10);
    let nombreGrupo = "Rutina completa";
    let totalPasos = gItems.length;
    let descuentoAplicado = false;
    let juegosCompletos = 0;
    let etiquetaBadge = "Descuento no aplicado";
    let mensajeFaltante: string | undefined = undefined;
    let productoFaltante: { id: number; nombre: string; slug: string } | null = null;

    if (grupoTipo === "rutina") {
      // Consultar plantilla y sus pasos oficiales
      const [pRows]: any = await pool.execute(
        "SELECT id, nombre, descuento_porcentaje FROM plantillas_rutina WHERE clave = ? LIMIT 1",
        [grupoClave]
      );

      const plantilla = pRows?.[0] || null;
      if (plantilla) {
        descuentoPct = Number(plantilla.descuento_porcentaje || descuentoPct);
        const [pasoRows]: any = await pool.execute(
          "SELECT orden, tipo_rutina, etiqueta FROM plantilla_pasos WHERE plantilla_id = ? ORDER BY orden ASC",
          [plantilla.id]
        );
        const pasosDefinidos: any[] = pasoRows || [];
        totalPasos = pasosDefinidos.length;
        nombreGrupo = `${plantilla.nombre} · ${totalPasos} pasos`;

        // Verificar que cada paso esté presente y disponible en el grupo
        const tiposPresentes = new Set(
          gItems
            .filter((i) => i.estado_stock !== "agotado" && i.tipo_rutina)
            .map((i) => i.tipo_rutina)
        );

        const pasosFaltantes = pasosDefinidos.filter((p) => !tiposPresentes.has(p.tipo_rutina));

        if (pasosFaltantes.length === 0 && gItems.every((i) => i.estado_stock !== "agotado")) {
          // Rutina completa y disponible
          descuentoAplicado = true;
          juegosCompletos = Math.min(...gItems.map((i) => i.cantidad));
          etiquetaBadge = `Combo · ${descuentoPct}% aplicado`;

          // Descuento aplica sobre juegos completos: suma de los precios de 1 juego completo
          const precioUnJuego = gItems.reduce((acc, i) => acc + i.precio_vigente, 0);
          const montoDescuento = Math.round(precioUnJuego * juegosCompletos * (descuentoPct / 100));

          if (montoDescuento > 0) {
            lineasDescuento.push({
              grupo_id: grupoId,
              nombre: "Descuento combo rutina",
              monto: montoDescuento,
            });
          }
        } else {
          // Falta al menos un paso o hay algún producto agotado
          descuentoAplicado = false;
          etiquetaBadge = "Descuento no aplicado";

          const primerPasoFaltante = pasosFaltantes[0] || pasosDefinidos[0];
          if (primerPasoFaltante) {
            // Buscar un producto candidato para recomendar reincorporar
            const [candRows]: any = await pool.execute(
              `SELECT p.id, p.nombre, p.slug 
               FROM productos p
               JOIN inventario i ON i.producto_id = p.id
               WHERE p.tipo_rutina = ? AND p.activo = 1
               GROUP BY p.id
               HAVING SUM(i.existencias) > 0
               LIMIT 1`,
              [primerPasoFaltante.tipo_rutina]
            );

            if (candRows && candRows.length > 0) {
              productoFaltante = {
                id: Number(candRows[0].id),
                nombre: candRows[0].nombre,
                slug: candRows[0].slug,
              };
              mensajeFaltante = `Agrega ${candRows[0].nombre} para recuperar el ${descuentoPct}%`;
            } else {
              mensajeFaltante = `Agrega un ${primerPasoFaltante.etiqueta.toLowerCase()} para recuperar el ${descuentoPct}%`;
            }
          }
        }
      }
    } else if (grupoTipo === "combo") {
      // Consultar combo en la tabla de combos
      const [cbRows]: any = await pool.execute(
        "SELECT id, nombre, descuento_porcentaje FROM combos WHERE slug = ? OR id = ? LIMIT 1",
        [grupoClave, grupoClave]
      );
      const combo = cbRows?.[0] || null;

      if (combo) {
        descuentoPct = Number(combo.descuento_porcentaje || descuentoPct);
        nombreGrupo = combo.nombre;

        const [cpRows]: any = await pool.execute(
          "SELECT producto_id, cantidad FROM combo_productos WHERE combo_id = ?",
          [combo.id]
        );
        const requeridos: any[] = cpRows || [];
        totalPasos = requeridos.length;

        const idsPresentes = new Set(
          gItems.filter((i) => i.estado_stock !== "agotado").map((i) => i.producto_id)
        );
        const faltantes = requeridos.filter((r) => !idsPresentes.has(r.producto_id));

        if (faltantes.length === 0 && gItems.every((i) => i.estado_stock !== "agotado")) {
          descuentoAplicado = true;
          juegosCompletos = Math.min(...gItems.map((i) => i.cantidad));
          etiquetaBadge = `Combo · ${descuentoPct}% aplicado`;

          const precioUnJuego = gItems.reduce((acc, i) => acc + i.precio_vigente, 0);
          const montoDescuento = Math.round(precioUnJuego * juegosCompletos * (descuentoPct / 100));

          if (montoDescuento > 0) {
            lineasDescuento.push({
              grupo_id: grupoId,
              nombre: `Descuento ${combo.nombre}`,
              monto: montoDescuento,
            });
          }
        } else {
          descuentoAplicado = false;
          etiquetaBadge = "Descuento no aplicado";

          if (faltantes.length > 0) {
            const [fProdRows]: any = await pool.execute(
              "SELECT id, nombre, slug FROM productos WHERE id = ? LIMIT 1",
              [faltantes[0].producto_id]
            );
            if (fProdRows && fProdRows.length > 0) {
              productoFaltante = {
                id: Number(fProdRows[0].id),
                nombre: fProdRows[0].nombre,
                slug: fProdRows[0].slug,
              };
              mensajeFaltante = `Agrega ${fProdRows[0].nombre} para recuperar el ${descuentoPct}%`;
            }
          }
        }
      }
    }

    gruposCalculados.push({
      grupo_id: grupoId,
      grupo_tipo: grupoTipo,
      grupo_clave: grupoClave,
      nombre: nombreGrupo,
      totalPasos,
      descuento_porcentaje: descuentoPct,
      descuentoAplicado,
      juegosCompletos,
      etiquetaBadge,
      mensajeFaltante,
      productoFaltante,
      items: gItems,
    });
  }

  // 5. Totales y Reglas de Envío
  const rawSubtotal = itemsCalculados
    .filter((i) => i.estado_stock !== "agotado")
    .reduce((acc, i) => acc + i.subtotal, 0);

  const rawTotalDescuentos = lineasDescuento.reduce((acc, l) => acc + l.monto, 0);

  const subtotal = Math.round(rawSubtotal);
  const totalDescuentos = Math.round(rawTotalDescuentos);
  const total = Math.max(0, Math.round(subtotal - totalDescuentos));

  const tieneEnvioGratis = total >= ENVIO_GRATIS_DESDE;
  const faltaParaEnvioGratis = tieneEnvioGratis ? 0 : ENVIO_GRATIS_DESDE - total;

  const totalItems = itemsCalculados.reduce((acc, i) => acc + i.cantidad, 0);
  const hayAgotados = itemsCalculados.some((i) => i.estado_stock === "agotado");
  const hayInsuficientes = itemsCalculados.some((i) => i.estado_stock === "insuficiente");
  const tieneArticulos = itemsCalculados.length > 0;

  // 6. Aviso omnicanal según canal_origen y sesión
  let avisoOmnicanal: CarritoCalculado["avisoOmnicanal"];

  if (userId) {
    const canales = new Set(itemsCalculados.map((i) => i.canal_origen));
    if (canales.has("app")) {
      avisoOmnicanal = {
        tipo: "app",
        mensaje: "Tu carrito se guarda en tu cuenta: lo empezaste en el celular y lo puedes terminar aquí.",
      };
    } else if (canales.has("tienda")) {
      avisoOmnicanal = {
        tipo: "tienda",
        mensaje: "Tu carrito se guarda en tu cuenta: lo empezaste en tienda y lo puedes terminar aquí.",
      };
    } else {
      avisoOmnicanal = {
        tipo: "web",
        mensaje: "Tu carrito se guarda en tu cuenta y lo puedes terminar desde cualquier dispositivo.",
      };
    }
  } else {
    avisoOmnicanal = {
      tipo: "invitado",
      mensaje: "Inicia sesión para guardar tu carrito y terminarlo desde cualquier dispositivo.",
      linkHref: "/login?volver=/carrito",
      linkLabel: "Iniciar sesión",
    };
  }

  return {
    cartId: carritoId,
    items: itemsCalculados,
    grupos: gruposCalculados,
    otrosItems,
    totalItems,
    subtotal,
    totalDescuentos,
    lineasDescuento,
    costoEnvioTexto: "Se calcula al pagar",
    tieneEnvioGratis,
    faltaParaEnvioGratis,
    total,
    hayAgotados,
    hayInsuficientes,
    tieneArticulos,
    avisoOmnicanal,
  };
}

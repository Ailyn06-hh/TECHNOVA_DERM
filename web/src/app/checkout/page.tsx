import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthUserServer } from "@/lib/session";
import { getCartForServer } from "@/lib/carrito";
import { getDbPool } from "@/lib/db";
import { NOMBRE_MARCA } from "@/lib/marca";
import CheckoutLayout from "@/components/checkout/CheckoutLayout";
import CheckoutPageClient from "@/components/checkout/CheckoutPageClient";
import type { SucursalCalculada } from "@/components/checkout/StoreSelectModal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Entrega y Pago | ${NOMBRE_MARCA}`,
  description: `Completa tu orden de compra en ${NOMBRE_MARCA} de forma segura.`,
};

export default async function CheckoutRoute() {
  // 1. Proteger ruta con sesión de usuario
  const user = getAuthUserServer();
  if (!user?.userId) {
    redirect("/login?volver=/checkout");
  }

  // 2. Obtener y validar el carrito del usuario
  const { carrito, cartId } = await getCartForServer();

  if (!carrito.tieneArticulos || carrito.totalItems === 0) {
    redirect("/carrito");
  }

  if (carrito.hayAgotados || carrito.hayInsuficientes) {
    redirect("/carrito?error=articulos_sin_stock");
  }

  const pool = getDbPool();

  // 3. Consultar direcciones guardadas
  const [dirRows]: any = await pool.execute(
    `SELECT id, usuario_id, alias, calle_y_numero, calle, numero_exterior, numero_interior, colonia, 
            codigo_postal, ciudad, estado, referencias, predeterminada 
     FROM direcciones 
     WHERE usuario_id = ? 
     ORDER BY predeterminada DESC, id DESC`,
    [user.userId]
  );

  const direccionesNormalizadas = (dirRows || []).map((r: any) => ({
    ...r,
    calle_y_numero: r.calle_y_numero || `${r.calle || ""} ${r.numero_exterior || ""}`.trim(),
  }));

  // 4. Consultar métodos de pago guardados (solo vigentes para checkout)
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;

  const [cardRows]: any = await pool.execute(
    `SELECT id, proveedor, marca, ultimos4, titular, mes_vencimiento, anio_vencimiento, predeterminado 
     FROM metodos_pago 
     WHERE usuario_id = ?
       AND (anio_vencimiento > ? OR (anio_vencimiento = ? AND mes_vencimiento >= ?))
     ORDER BY predeterminado DESC, id DESC`,
    [user.userId, curYear, curYear, curMonth]
  );

  // 5. Consultar cuenta vinculada de Mercado Pago si existe
  const [vincRows]: any = await pool.execute(
    "SELECT cuenta_mascara FROM cuentas_vinculadas WHERE usuario_id = ? AND proveedor = 'mercadopago' LIMIT 1",
    [user.userId]
  );
  const cuentaMascaraMP = vincRows && vincRows.length > 0 ? vincRows[0].cuenta_mascara : undefined;

  // 6. Consultar sucursales activas y calcular existencias de la orden
  const [sucRows]: any = await pool.execute(
    `SELECT id, nombre, direccion, direccion_corta, hora_apertura, hora_cierre, minutos_preparacion 
     FROM sucursales 
     WHERE activa = 1 
     ORDER BY id ASC`
  );

  const distinctProductIds = Array.from(
    new Set(carrito.items.map((i) => i.producto_id).filter(Boolean))
  );

  const sucursalesCalculadas: SucursalCalculada[] = await Promise.all(
    (sucRows || []).map(async (suc: any) => {
      let productosDisponibles = 0;

      if (distinctProductIds.length > 0) {
        const placeholders = distinctProductIds.map(() => "?").join(",");
        const [invRows]: any = await pool.execute(
          `SELECT producto_id, existencias 
           FROM inventario 
           WHERE sucursal_id = ? AND producto_id IN (${placeholders})`,
          [suc.id, ...distinctProductIds]
        );

        const invMap = new Map<number, number>();
        for (const row of invRows || []) {
          invMap.set(Number(row.producto_id), Number(row.existencias || 0));
        }

        for (const cItem of carrito.items) {
          const stock = invMap.get(Number(cItem.producto_id)) || 0;
          if (stock >= cItem.cantidad) {
            productosDisponibles++;
          }
        }
      }

      const tieneTodo = productosDisponibles === carrito.items.length;
      const faltanN = carrito.items.length - productosDisponibles;

      const minutosPrep = Number(suc.minutos_preparacion || 120);
      const [cierreH, cierreM] = (suc.hora_cierre || "20:00:00").split(":").map(Number);
      const [aperturaH, aperturaM] = (suc.hora_apertura || "10:00:00").split(":").map(Number);

      const readyDate = new Date(now.getTime() + minutosPrep * 60 * 1000);
      if (readyDate.getMinutes() > 0 || readyDate.getSeconds() > 0) {
        readyDate.setHours(readyDate.getHours() + 1);
        readyDate.setMinutes(0, 0, 0);
      }

      const cierreDate = new Date(now);
      cierreDate.setHours(cierreH, cierreM, 0, 0);

      let puedeRecogerHoy = false;
      let horaEstimadaTexto = "";

      if (readyDate.getTime() <= cierreDate.getTime() && now.getHours() < cierreH) {
        puedeRecogerHoy = true;
        const hh = String(readyDate.getHours()).padStart(2, "0");
        const mm = String(readyDate.getMinutes()).padStart(2, "0");
        horaEstimadaTexto = `Hoy desde ${hh}:${mm}`;
      } else {
        const mañanaReadyH = aperturaH + Math.floor(minutosPrep / 60);
        const mañanaReadyM = aperturaM + (minutosPrep % 60);
        const hh = String(mañanaReadyH).padStart(2, "0");
        const mm = String(mañanaReadyM).padStart(2, "0");
        horaEstimadaTexto = `Mañana desde ${hh}:${mm}`;
      }

      return {
        id: Number(suc.id),
        nombre: suc.nombre.startsWith(NOMBRE_MARCA)
          ? suc.nombre
          : `${NOMBRE_MARCA} ${suc.nombre}`,
        nombreCorto: suc.nombre,
        direccion: suc.direccion,
        direccion_corta: suc.direccion_corta || suc.direccion.split(",")[0],
        hora_apertura: suc.hora_apertura,
        hora_cierre: suc.hora_cierre,
        minutos_preparacion: minutosPrep,
        totalProductos: carrito.items.length,
        productosDisponibles,
        faltanN: Math.max(0, faltanN),
        tieneTodo,
        puedeRecogerHoy,
        horaEstimadaTexto,
      };
    })
  );

  // Consultar sucursal preferida del usuario
  const [userProfile]: any = await pool.execute(
    "SELECT sucursal_preferida_id FROM usuarios WHERE id = ? LIMIT 1",
    [user.userId]
  );
  const sucursalPreferidaId = userProfile?.[0]?.sucursal_preferida_id || null;

  return (
    <CheckoutLayout>
      <CheckoutPageClient
        initialCarrito={carrito}
        initialSucursales={sucursalesCalculadas}
        initialDirecciones={direccionesNormalizadas}
        initialMetodosPago={cardRows || []}
        sucursalPreferidaId={sucursalPreferidaId}
        cuentaMascaraMP={cuentaMascaraMP}
      />
    </CheckoutLayout>
  );
}

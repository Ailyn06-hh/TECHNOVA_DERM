import { NextRequest, NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { getAuthUserFromRequest } from "@/lib/session";
import { getOrCreateCart } from "@/lib/carrito";
import { NOMBRE_MARCA } from "@/lib/marca";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const pool = getDbPool();
    const session = getAuthUserFromRequest(req);

    // 1. Obtener items del carrito actual
    const { cartId } = await getOrCreateCart(req);
    const [cartItems]: any = await pool.execute(
      `SELECT producto_id, cantidad 
       FROM carrito_items 
       WHERE carrito_id = ? AND eliminado_en IS NULL`,
      [cartId]
    );

    const distinctProductIds: number[] = Array.from(
      new Set((cartItems || []).map((i: any) => Number(i.producto_id)).filter(Boolean))
    );

    // 2. Obtener sucursales activas
    const [sucRows]: any = await pool.execute(
      `SELECT id, nombre, direccion, direccion_corta, hora_apertura, hora_cierre, minutos_preparacion 
       FROM sucursales 
       WHERE activa = 1 
       ORDER BY id ASC`
    );

    const totalProductosEnCarrito = distinctProductIds.length;
    const now = new Date();

    const sucursalesCalculadas = await Promise.all(
      (sucRows || []).map(async (suc: any) => {
        let productosDisponibles = 0;

        if (totalProductosEnCarrito > 0) {
          // Consultar existencias de cada producto en esta sucursal
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

          for (const cItem of cartItems || []) {
            const stock = invMap.get(Number(cItem.producto_id)) || 0;
            if (stock >= Number(cItem.cantidad)) {
              productosDisponibles++;
            }
          }
        }

        const tieneTodo =
          totalProductosEnCarrito > 0 &&
          productosDisponibles === (cartItems || []).length;
        const faltanN = (cartItems || []).length - productosDisponibles;

        // Cálculo de hora estimada
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
          totalProductos: (cartItems || []).length,
          productosDisponibles,
          faltanN: Math.max(0, faltanN),
          tieneTodo,
          puedeRecogerHoy,
          horaEstimadaTexto,
        };
      })
    );

    // Obtener sucursal preferida del usuario si tiene sesión
    let sucursalPreferidaId: number | null = null;
    if (session?.userId) {
      const [uRows]: any = await pool.execute(
        "SELECT sucursal_preferida_id FROM usuarios WHERE id = ? LIMIT 1",
        [session.userId]
      );
      sucursalPreferidaId = uRows?.[0]?.sucursal_preferida_id || null;
    }

    return NextResponse.json({
      sucursales: sucursalesCalculadas,
      sucursalPreferidaId,
    });
  } catch (err: any) {
    console.error("[GET /api/sucursales Error]:", err);
    return NextResponse.json({ error: "Error al consultar sucursales" }, { status: 500 });
  }
}

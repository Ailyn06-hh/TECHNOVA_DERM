import { getDbPool } from "./db";
import { getSucursalRecogerHoy } from "./sucursal";
import { NOMBRE_MARCA, TIEMPO_ENVIO_DOMICILIO } from "./marca";
import { NextRequest } from "next/server";

export interface DisponibilidadProducto {
  totalStock: number;
  isOutOfStock: boolean;
  sucursal: {
    id: number;
    nombre: string;
  };
  stockEnSucursal: number;
  lineaDisponibilidad: string; // ej: "Disponible: 3 piezas en línea y en tienda"
  lineaRecogida: string;       // ej: "Recoge hoy en Technova-Derm Centro desde las 17:00"
  lineaEnvio: string;          // ej: "Envío a domicilio en 2 a 3 días"
  puedeRecogerHoy: boolean;
}

/**
 * Calcula la disponibilidad omnicanal en tiempo real para un producto.
 * Reutilizable en ficha de producto, carrito y checkout.
 */
export async function calcularDisponibilidad(
  productoId: number,
  req?: NextRequest
): Promise<DisponibilidadProducto> {
  const pool = getDbPool();

  // 1. Obtener sucursal activa
  const sucursalInfo = await getSucursalRecogerHoy(req);

  // 2. Consultar inventario por sucursal y total
  const [invRows]: any = await pool.execute(
    `SELECT 
      i.sucursal_id, 
      i.existencias, 
      s.hora_apertura, 
      s.hora_cierre, 
      s.minutos_preparacion
     FROM inventario i
     JOIN sucursales s ON s.id = i.sucursal_id
     WHERE i.producto_id = ? AND s.activa = 1`,
    [productoId]
  );

  let totalStock = 0;
  let stockEnSucursal = 0;
  let horaApertura = "10:00:00";
  let horaCierre = "20:00:00";
  let minutosPrep = 120;

  for (const row of invRows || []) {
    const qty = Number(row.existencias || 0);
    totalStock += qty;
    if (Number(row.sucursal_id) === sucursalInfo.id) {
      stockEnSucursal = qty;
      horaApertura = row.hora_apertura || horaApertura;
      horaCierre = row.hora_cierre || horaCierre;
      minutosPrep = Number(row.minutos_preparacion || minutosPrep);
    }
  }

  const isOutOfStock = totalStock <= 0;

  // 3. Formatear línea 1: Disponibilidad general
  let lineaDisponibilidad = "";
  if (isOutOfStock) {
    lineaDisponibilidad = "Agotado en línea y en tienda";
  } else if (totalStock > 10) {
    lineaDisponibilidad = "Disponible en línea y en tienda";
  } else {
    lineaDisponibilidad = `Disponible: ${totalStock} ${totalStock === 1 ? "pieza" : "piezas"} en línea y en tienda`;
  }

  // 4. Formatear línea 2: Recogida en tienda
  let lineaRecogida = "";
  let puedeRecogerHoy = false;

  if (isOutOfStock) {
    lineaRecogida = "No disponible para recolección";
  } else if (stockEnSucursal <= 0) {
    // No hay en esta sucursal pero sí en otra
    // TODO: Permitir al usuario cambiar de sucursal para encontrar inventario físico
    lineaRecogida = `No disponible para recoger en ${sucursalInfo.nombre} hoy`;
  } else {
    // Hay existencias en la sucursal seleccionada. Calcular hora estimada:
    // Ahora + minutos de preparación, redondeada a la siguiente hora en punto
    const now = new Date();
    const readyDate = new Date(now.getTime() + minutosPrep * 60 * 1000);

    // Redondear a la siguiente hora completa (ej. 14:15 -> 15:00 o 16:15 -> 17:00)
    if (readyDate.getMinutes() > 0 || readyDate.getSeconds() > 0) {
      readyDate.setHours(readyDate.getHours() + 1);
      readyDate.setMinutes(0, 0, 0);
    }

    const [cierreHoras, cierreMins] = horaCierre.split(":").map(Number);
    const cierreDate = new Date(now);
    cierreDate.setHours(cierreHoras, cierreMins, 0, 0);

    const [aperturaHoras, aperturaMins] = horaApertura.split(":").map(Number);

    if (readyDate.getTime() <= cierreDate.getTime() && now.getHours() < cierreHoras) {
      puedeRecogerHoy = true;
      const hh = String(readyDate.getHours()).padStart(2, "0");
      const mm = String(readyDate.getMinutes()).padStart(2, "0");
      lineaRecogida = `Recoge hoy en ${NOMBRE_MARCA} ${sucursalInfo.nombre} desde las ${hh}:${mm}`;
    } else {
      // Queda después de la hora de cierre, se recoge al día siguiente:
      // Apertura + minutos de preparación
      const mañanaReadyH = aperturaHoras + Math.floor(minutosPrep / 60);
      const mañanaReadyM = aperturaMins + (minutosPrep % 60);
      const hh = String(mañanaReadyH).padStart(2, "0");
      const mm = String(mañanaReadyM).padStart(2, "0");
      lineaRecogida = `Recoge mañana desde las ${hh}:${mm}`;
    }
  }

  // 5. Formatear línea 3: Envío a domicilio
  const lineaEnvio = isOutOfStock
    ? "Envío no disponible temporalmente"
    : `Envío a domicilio en ${TIEMPO_ENVIO_DOMICILIO}`;

  return {
    totalStock,
    isOutOfStock,
    sucursal: {
      id: sucursalInfo.id,
      nombre: sucursalInfo.nombre,
    },
    stockEnSucursal,
    lineaDisponibilidad,
    lineaRecogida,
    lineaEnvio,
    puedeRecogerHoy,
  };
}

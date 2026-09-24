import crypto from "crypto";
import { getDbPool } from "./db";

export interface PasoSeguimiento {
  id: string;
  nombre: string;
  estado: "completado" | "actual" | "pendiente";
  hora?: string; // Ej: "16:02"
  descripcionAccesible: string;
}

/**
 * Genera un código de recogida de 4 dígitos con crypto.
 * Garantiza que sea único entre los pedidos activos de la misma sucursal.
 */
export async function generarCodigoRecogida(
  sucursalId: number,
  connOrPool?: any
): Promise<string> {
  const db = connOrPool || getDbPool();

  for (let i = 0; i < 20; i++) {
    const candidate = crypto.randomInt(0, 10000).toString().padStart(4, "0");

    const [rows]: any = await db.execute(
      `SELECT id FROM pedidos 
       WHERE sucursal_id = ? 
         AND codigo_recogida = ? 
         AND estado IN ('por_pagar_en_tienda', 'pagado', 'preparando', 'listo_para_recoger') 
       LIMIT 1`,
      [sucursalId, candidate]
    );

    if (!rows || rows.length === 0) {
      return candidate;
    }
  }

  // Fallback seguro en caso extremo de colisiones
  return crypto.randomInt(0, 10000).toString().padStart(4, "0");
}

/**
 * Cambia el estado de un pedido y registra siempre el evento en `pedido_eventos`.
 */
export async function cambiarEstado(
  pedidoId: number,
  nuevoEstado: string,
  nota?: string | null,
  connOrPool?: any
): Promise<boolean> {
  const db = connOrPool || getDbPool();

  // Si el nuevo estado es definitivo o no requiere reserva, limpiamos reserva_expira_en
  const estadosLimpiarReserva = [
    "pagado",
    "preparando",
    "listo_para_recoger",
    "enviado",
    "entregado",
    "cancelado",
    "expirado",
    "pago_fallido",
  ];

  if (estadosLimpiarReserva.includes(nuevoEstado)) {
    await db.execute(
      "UPDATE pedidos SET estado = ?, reserva_expira_en = NULL WHERE id = ?",
      [nuevoEstado, pedidoId]
    );
  } else {
    await db.execute("UPDATE pedidos SET estado = ? WHERE id = ?", [
      nuevoEstado,
      pedidoId,
    ]);
  }

  // Insertar evento en el historial
  await db.execute(
    `INSERT INTO pedido_eventos (pedido_id, estado, nota, creado_en)
     VALUES (?, ?, ?, NOW())`,
    [pedidoId, nuevoEstado, nota || null]
  );

  return true;
}

/**
 * Valida un código de recogida en caja (POS) para un folio dado.
 * Implementa límite de 5 intentos fallidos por pedido.
 */
export async function validarCodigoRecogida(
  folio: string,
  codigo: string
): Promise<{
  valido: boolean;
  error?: string;
  intentosRestantes?: number;
  pedido?: any;
}> {
  const pool = getDbPool();

  const [rows]: any = await pool.execute(
    `SELECT id, folio, usuario_id, sucursal_id, estado, tipo_entrega, total, 
            codigo_recogida, intentos_codigo_recogida 
     FROM pedidos 
     WHERE folio = ? LIMIT 1`,
    [folio]
  );

  if (!rows || rows.length === 0) {
    return { valido: false, error: "Pedido no encontrado." };
  }

  const pedido = rows[0];

  if (pedido.tipo_entrega !== "recoger") {
    return {
      valido: false,
      error: "Este pedido tiene método de envío a domicilio, no recolección en tienda.",
    };
  }

  const intentosActuales = Number(pedido.intentos_codigo_recogida) || 0;
  if (intentosActuales >= 5) {
    return {
      valido: false,
      error: "Límite de intentos superado (5/5). Contacta al supervisor.",
      intentosRestantes: 0,
    };
  }

  if (pedido.codigo_recogida !== codigo) {
    const nuevosIntentos = intentosActuales + 1;
    await pool.execute(
      "UPDATE pedidos SET intentos_codigo_recogida = ? WHERE id = ?",
      [nuevosIntentos, pedido.id]
    );

    const restantes = Math.max(0, 5 - nuevosIntentos);
    return {
      valido: false,
      error: `Código de recogida incorrecto. ${restantes} ${
        restantes === 1 ? "intento restante" : "intentos restantes"
      }.`,
      intentosRestantes: restantes,
    };
  }

  // Código correcto: resetear contador de intentos fallidos
  await pool.execute(
    "UPDATE pedidos SET intentos_codigo_recogida = 0 WHERE id = ?",
    [pedido.id]
  );

  return {
    valido: true,
    pedido,
  };
}

/**
 * Formatea una fecha/hora SQL a HH:MM (ej. "16:02")
 */
function extraerHora(fecha: any): string | undefined {
  if (!fecha) return undefined;
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return undefined;
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Mapeo de estados del pedido a los 4 pasos visuales de seguimiento.
 * Reutilizable en /checkout/confirmacion/[folio] y /cuenta/pedidos/[folio].
 */
export function pasosSeguimiento(pedido: any, eventos: any[] = []): PasoSeguimiento[] {
  const tipoEntrega = pedido.tipo_entrega;
  const estado = pedido.estado;

  // Mapa de evento -> hora
  const horasPorEstado: Record<string, string> = {};
  for (const ev of eventos) {
    if (!horasPorEstado[ev.estado] && ev.creado_en) {
      horasPorEstado[ev.estado] = extraerHora(ev.creado_en) || "";
    }
  }

  // Hora de creación como fallback para el primer evento
  const horaInicial =
    horasPorEstado["pagado"] ||
    horasPorEstado["por_pagar_en_tienda"] ||
    extraerHora(pedido.creado_en) ||
    "";

  // VARIANTE A: Por pagar en tienda (Apartado)
  if (estado === "por_pagar_en_tienda" || pedido.metodo_pago === "pagar_en_tienda") {
    const p1Hora = horasPorEstado["por_pagar_en_tienda"] || horaInicial;
    const p2Hora = horasPorEstado["preparando"];
    const p3Hora = horasPorEstado["listo_para_recoger"];
    const p4Hora = horasPorEstado["entregado"] || horasPorEstado["pagado"];

    let s1: "completado" | "actual" | "pendiente" = "completado";
    let s2: "completado" | "actual" | "pendiente" = "pendiente";
    let s3: "completado" | "actual" | "pendiente" = "pendiente";
    let s4: "completado" | "actual" | "pendiente" = "pendiente";

    if (estado === "por_pagar_en_tienda") {
      s1 = "completado";
      s2 = "actual";
    } else if (estado === "preparando") {
      s1 = "completado";
      s2 = "actual";
    } else if (estado === "listo_para_recoger") {
      s1 = "completado";
      s2 = "completado";
      s3 = "actual";
    } else if (estado === "entregado") {
      s1 = "completado";
      s2 = "completado";
      s3 = "completado";
      s4 = "completado";
    }

    return [
      {
        id: "apartado",
        nombre: "Apartado",
        estado: s1,
        hora: s1 === "completado" ? p1Hora : undefined,
        descripcionAccesible: `Apartado, ${s1 === "completado" ? `completado a las ${p1Hora}` : s1}`,
      },
      {
        id: "preparando",
        nombre: "Preparando",
        estado: s2,
        hora: s2 === "completado" ? p2Hora : undefined,
        descripcionAccesible: `Preparando, ${s2 === "completado" && p2Hora ? `completado a las ${p2Hora}` : s2}`,
      },
      {
        id: "listo",
        nombre: "Listo para recoger",
        estado: s3,
        hora: s3 === "completado" ? p3Hora : undefined,
        descripcionAccesible: `Listo para recoger, ${s3 === "completado" && p3Hora ? `completado a las ${p3Hora}` : s3}`,
      },
      {
        id: "entregado",
        nombre: "Pagado y entregado",
        estado: s4,
        hora: s4 === "completado" ? p4Hora : undefined,
        descripcionAccesible: `Pagado y entregado, ${s4 === "completado" && p4Hora ? `completado a las ${p4Hora}` : s4}`,
      },
    ];
  }

  // VARIANTE B: Envío a domicilio
  if (tipoEntrega === "envio") {
    const p1Hora = horasPorEstado["pagado"] || horaInicial;
    const p2Hora = horasPorEstado["preparando"];
    const p3Hora = horasPorEstado["enviado"];
    const p4Hora = horasPorEstado["entregado"];

    let s1: "completado" | "actual" | "pendiente" = "pendiente";
    let s2: "completado" | "actual" | "pendiente" = "pendiente";
    let s3: "completado" | "actual" | "pendiente" = "pendiente";
    let s4: "completado" | "actual" | "pendiente" = "pendiente";

    if (estado === "pagado") {
      s1 = "completado";
      s2 = "actual";
    } else if (estado === "preparando") {
      s1 = "completado";
      s2 = "actual";
    } else if (estado === "enviado") {
      s1 = "completado";
      s2 = "completado";
      s3 = "actual";
    } else if (estado === "entregado") {
      s1 = "completado";
      s2 = "completado";
      s3 = "completado";
      s4 = "completado";
    }

    return [
      {
        id: "pagado",
        nombre: "Pagado",
        estado: s1,
        hora: s1 === "completado" ? p1Hora : undefined,
        descripcionAccesible: `Pagado, ${s1 === "completado" ? `completado a las ${p1Hora}` : s1}`,
      },
      {
        id: "preparando",
        nombre: "Preparando",
        estado: s2,
        hora: s2 === "completado" ? p2Hora : undefined,
        descripcionAccesible: `Preparando, ${s2 === "completado" && p2Hora ? `completado a las ${p2Hora}` : s2}`,
      },
      {
        id: "enviado",
        nombre: "Enviado",
        estado: s3,
        hora: s3 === "completado" ? p3Hora : undefined,
        descripcionAccesible: `Enviado, ${s3 === "completado" && p3Hora ? `completado a las ${p3Hora}` : s3}`,
      },
      {
        id: "entregado",
        nombre: "Entregado",
        estado: s4,
        hora: s4 === "completado" ? p4Hora : undefined,
        descripcionAccesible: `Entregado, ${s4 === "completado" && p4Hora ? `completado a las ${p4Hora}` : s4}`,
      },
    ];
  }

  // VARIANTE C: Pagado + Recoger en tienda (El del mockup estándar)
  const p1Hora = horasPorEstado["pagado"] || horaInicial;
  const p2Hora = horasPorEstado["preparando"];
  const p3Hora = horasPorEstado["listo_para_recoger"];
  const p4Hora = horasPorEstado["entregado"];

  let s1: "completado" | "actual" | "pendiente" = "pendiente";
  let s2: "completado" | "actual" | "pendiente" = "pendiente";
  let s3: "completado" | "actual" | "pendiente" = "pendiente";
  let s4: "completado" | "actual" | "pendiente" = "pendiente";

  if (estado === "pagado") {
    s1 = "completado";
    s2 = "actual";
  } else if (estado === "preparando") {
    s1 = "completado";
    s2 = "actual";
  } else if (estado === "listo_para_recoger") {
    s1 = "completado";
    s2 = "completado";
    s3 = "actual";
  } else if (estado === "entregado") {
    s1 = "completado";
    s2 = "completado";
    s3 = "completado";
    s4 = "completado";
  }

  return [
    {
      id: "pagado",
      nombre: "Pagado",
      estado: s1,
      hora: s1 === "completado" ? p1Hora : undefined,
      descripcionAccesible: `Pagado, ${s1 === "completado" ? `completado a las ${p1Hora}` : s1}`,
    },
    {
      id: "preparando",
      nombre: "Preparando",
      estado: s2,
      hora: s2 === "completado" ? p2Hora : undefined,
      descripcionAccesible: `Preparando, ${s2 === "completado" && p2Hora ? `completado a las ${p2Hora}` : s2}`,
    },
    {
      id: "listo",
      nombre: "Listo para recoger",
      estado: s3,
      hora: s3 === "completado" ? p3Hora : undefined,
      descripcionAccesible: `Listo para recoger, ${s3 === "completado" && p3Hora ? `completado a las ${p3Hora}` : s3}`,
    },
    {
      id: "entregado",
      nombre: "Entregado",
      estado: s4,
      hora: s4 === "completado" ? p4Hora : undefined,
      descripcionAccesible: `Entregado, ${s4 === "completado" && p4Hora ? `completado a las ${p4Hora}` : s4}`,
    },
  ];
}

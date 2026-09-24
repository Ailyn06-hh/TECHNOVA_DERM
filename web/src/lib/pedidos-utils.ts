import { NOMBRE_MARCA } from "./marca";

/**
 * Grupos de estado para filtrado en Mis Pedidos
 */
export const GRUPOS_ESTADO: Record<string, string[]> = {
  todos: [],
  en_curso: [
    "pendiente_pago",
    "pagado",
    "por_pagar_en_tienda",
    "listo_para_recoger",
    "enviado",
  ],
  entregados: ["entregado"],
  cancelados: ["cancelado", "expirado", "pago_fallido"],
};

/**
 * Devuelve la etiqueta y clases CSS de color para cada canal omnicanal
 */
export function etiquetaCanal(canal: string, sucursalNombre?: string | null) {
  switch (canal) {
    case "app":
      return {
        texto: "App",
        label: "App",
        className: "bg-[#F5F0FB] text-[#6B3BA7] border-[#E3D4F5]",
      };
    case "whatsapp":
      return {
        texto: "WhatsApp",
        label: "WhatsApp",
        className: "bg-[#EBF7EE] text-[#1E7E34] border-[#C8E6C9]",
      };
    case "marketplace":
      return {
        texto: "Marketplace",
        label: "Marketplace",
        className: "bg-[#FEF9E7] text-[#9A7B0C] border-[#FCE8B2]",
      };
    case "tienda":
      return {
        texto: sucursalNombre ? `Tienda ${sucursalNombre}` : "Tienda",
        label: sucursalNombre ? `Tienda ${sucursalNombre}` : "Tienda",
        className: "bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]",
      };
    case "web":
    default:
      return {
        texto: "Web",
        label: "Web",
        className: "bg-[#FDF2F4] text-[#9E2A5D] border-[#F8D2DD]",
      };
  }
}

/**
 * Genera el texto legible del tipo de entrega respetando NOMBRE_MARCA
 */
export function textoEntrega(tipoEntrega: string, sucursalNombre?: string | null) {
  if (tipoEntrega === "envio") {
    return "Envío a domicilio";
  }
  if (tipoEntrega === "mostrador") {
    return "Compra en mostrador";
  }
  return `Recoger en ${NOMBRE_MARCA} ${sucursalNombre || "Centro"}`;
}

/**
 * Formatea fechas estilo "23 sep 2026" sin punto en el mes
 */
export function formatearFechaPedido(fecha: Date | string): string {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
    .format(d)
    .replace(/\./g, "");
}

/**
 * Extrae la hora formateada a HH:MM (ej: "16:02")
 */
export function extraerHora(fecha: any): string | undefined {
  if (!fecha) return undefined;
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  if (isNaN(d.getTime())) return undefined;
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export interface PasoSeguimiento {
  id: string;
  nombre: string;
  estado: "completado" | "actual" | "pendiente" | "cancelado";
  fecha?: string;
  hora?: string;
  fechaHoraTexto?: string;
  nota?: string;
  pista?: string;
  paqueteria?: string;
  numeroGuia?: string;
  urlRastreo?: string;
  descripcionAccesible: string;
}

/**
 * Genera la línea de tiempo completa para un pedido según su canal, tipo de entrega y eventos
 */
export function pasosSeguimiento(
  pedido: any,
  eventos: any[] = []
): PasoSeguimiento[] {
  const tipoEntrega = pedido.tipo_entrega || "recoger";
  const estado = pedido.estado;
  const esCancelado = ["cancelado", "expirado", "pago_fallido"].includes(estado);

  // Mapear eventos por estado
  const eventosPorEstado: Record<string, { fecha: string; hora: string; texto: string; nota?: string }> = {};
  for (const ev of eventos) {
    if (ev.creado_en) {
      const hora = extraerHora(ev.creado_en) || "";
      const fecha = formatearFechaPedido(ev.creado_en);
      eventosPorEstado[ev.estado] = {
        fecha,
        hora,
        texto: `${fecha} · ${hora}`,
        nota: ev.nota || undefined,
      };
    }
  }

  // Fallback fecha inicial del pedido
  const horaInicial = extraerHora(pedido.creado_en) || "";
  const fechaInicial = formatearFechaPedido(pedido.creado_en);
  const textoInicial = `${fechaInicial} · ${horaInicial}`;

  // 1. CASO COMPRA EN MOSTRADOR (Tienda física directa)
  if (tipoEntrega === "mostrador") {
    const evData = eventosPorEstado["entregado"] || {
      fecha: fechaInicial,
      hora: horaInicial,
      texto: textoInicial,
    };
    return [
      {
        id: "mostrador",
        nombre: "Comprado y entregado en tienda",
        estado: "completado",
        fecha: evData.fecha,
        hora: evData.hora,
        fechaHoraTexto: evData.texto,
        descripcionAccesible: `Comprado y entregado en tienda el ${evData.texto}`,
      },
    ];
  }

  // 2. CASO POR PAGAR EN TIENDA (Apartado)
  if (pedido.metodo_pago === "pagar_en_tienda" || estado === "por_pagar_en_tienda") {
    const evApartado = eventosPorEstado["por_pagar_en_tienda"] || {
      fecha: fechaInicial,
      hora: horaInicial,
      texto: textoInicial,
    };
    const evPrep = eventosPorEstado["preparando"];
    const evListo = eventosPorEstado["listo_para_recoger"];
    const evEntregado = eventosPorEstado["entregado"] || eventosPorEstado["pagado"];

    let notaApartado = "";
    if (pedido.reserva_expira_en) {
      const expD = new Date(pedido.reserva_expira_en);
      notaApartado = `Apartado hasta el ${formatearFechaPedido(expD)} a las ${extraerHora(expD)}`;
    }

    const pasos: PasoSeguimiento[] = [
      {
        id: "apartado",
        nombre: "Apartado",
        estado: "completado",
        fecha: evApartado.fecha,
        hora: evApartado.hora,
        fechaHoraTexto: evApartado.texto,
        nota: notaApartado || undefined,
        descripcionAccesible: `Apartado completado el ${evApartado.texto}`,
      },
      {
        id: "preparando",
        nombre: "Preparando tu pedido",
        estado:
          estado === "por_pagar_en_tienda"
            ? "actual"
            : evPrep || ["listo_para_recoger", "entregado"].includes(estado)
            ? "completado"
            : "pendiente",
        fecha: evPrep?.fecha,
        hora: evPrep?.hora,
        fechaHoraTexto: evPrep?.texto,
        pista: "En la sucursal",
        descripcionAccesible: "Preparando tu pedido en sucursal",
      },
      {
        id: "listo",
        nombre: "Listo para recoger",
        estado:
          estado === "listo_para_recoger"
            ? "actual"
            : evListo || estado === "entregado"
            ? "completado"
            : "pendiente",
        fecha: evListo?.fecha,
        hora: evListo?.hora,
        fechaHoraTexto: evListo?.texto,
        nota:
          estado === "listo_para_recoger" && (evListo?.nota || pedido.confirmacion_enviada)
            ? "Te avisamos por WhatsApp"
            : undefined,
        pista: "Te avisaremos cuando esté listo",
        descripcionAccesible: "Listo para recoger en sucursal",
      },
      {
        id: "entregado",
        nombre: "Pagado y entregado",
        estado: estado === "entregado" ? "completado" : "pendiente",
        fecha: evEntregado?.fecha,
        hora: evEntregado?.hora,
        fechaHoraTexto: evEntregado?.texto,
        pista: "Cuando pases a la tienda",
        descripcionAccesible: "Pagado y entregado en tienda",
      },
    ];

    if (esCancelado) {
      return ajustarPasosParaCancelado(pasos, pedido, eventosPorEstado);
    }
    return pasos;
  }

  // 3. CASO ENVÍO A DOMICILIO
  if (tipoEntrega === "envio") {
    const evPagado = eventosPorEstado["pagado"] || {
      fecha: fechaInicial,
      hora: horaInicial,
      texto: textoInicial,
    };
    const evPrep = eventosPorEstado["preparando"];
    const evEnviado = eventosPorEstado["enviado"];
    const evEntregado = eventosPorEstado["entregado"];

    const pasos: PasoSeguimiento[] = [
      {
        id: "pagado",
        nombre: "Pagado",
        estado: "completado",
        fecha: evPagado.fecha,
        hora: evPagado.hora,
        fechaHoraTexto: evPagado.texto,
        descripcionAccesible: `Pagado el ${evPagado.texto}`,
      },
      {
        id: "preparando",
        nombre: "Preparando tu pedido",
        estado:
          estado === "pagado"
            ? "actual"
            : evPrep || ["enviado", "entregado"].includes(estado)
            ? "completado"
            : "pendiente",
        fecha: evPrep?.fecha,
        hora: evPrep?.hora,
        fechaHoraTexto: evPrep?.texto,
        pista: "Empacando productos",
        descripcionAccesible: "Preparando tu pedido",
      },
      {
        id: "enviado",
        nombre: "Enviado",
        estado:
          estado === "enviado"
            ? "actual"
            : evEnviado || estado === "entregado"
            ? "completado"
            : "pendiente",
        fecha: evEnviado?.fecha,
        hora: evEnviado?.hora,
        fechaHoraTexto: evEnviado?.texto,
        paqueteria: pedido.paqueteria || undefined,
        numeroGuia: pedido.numero_guia || undefined,
        urlRastreo: pedido.url_rastreo || undefined,
        pista: pedido.numero_guia
          ? `Guía: ${pedido.numero_guia}`
          : "Te compartiremos tu número de guía",
        descripcionAccesible: `Enviado con ${pedido.paqueteria || "paquetería"}`,
      },
      {
        id: "entregado",
        nombre: "Entregado",
        estado: estado === "entregado" ? "completado" : "pendiente",
        fecha: evEntregado?.fecha,
        hora: evEntregado?.hora,
        fechaHoraTexto: evEntregado?.texto,
        pista: "2 a 3 días hábiles en tu domicilio",
        descripcionAccesible: "Entregado en tu domicilio",
      },
    ];

    if (esCancelado) {
      return ajustarPasosParaCancelado(pasos, pedido, eventosPorEstado);
    }
    return pasos;
  }

  // 4. CASO ESTÁNDAR: PAGADO Y RECOGER EN TIENDA
  const evPagado = eventosPorEstado["pagado"] || {
    fecha: fechaInicial,
    hora: horaInicial,
    texto: textoInicial,
  };
  const evPrep = eventosPorEstado["preparando"];
  const evListo = eventosPorEstado["listo_para_recoger"];
  const evEntregado = eventosPorEstado["entregado"];

  const pasos: PasoSeguimiento[] = [
    {
      id: "pagado",
      nombre: "Pagado",
      estado: "completado",
      fecha: evPagado.fecha,
      hora: evPagado.hora,
      fechaHoraTexto: evPagado.texto,
      descripcionAccesible: `Pagado el ${evPagado.texto}`,
    },
    {
      id: "preparando",
      nombre: "Preparando tu pedido",
      estado:
        estado === "pagado"
          ? "actual"
          : evPrep || ["listo_para_recoger", "entregado"].includes(estado)
          ? "completado"
          : "pendiente",
      fecha: evPrep?.fecha,
      hora: evPrep?.hora,
      fechaHoraTexto: evPrep?.texto,
      pista: "En sucursal",
      descripcionAccesible: "Preparando tu pedido en sucursal",
    },
    {
      id: "listo",
      nombre: "Listo para recoger",
      estado:
        estado === "listo_para_recoger"
          ? "actual"
          : evListo || estado === "entregado"
          ? "completado"
          : "pendiente",
      fecha: evListo?.fecha,
      hora: evListo?.hora,
      fechaHoraTexto: evListo?.texto,
      nota:
        estado === "listo_para_recoger" &&
        (evListo?.nota?.toLowerCase().includes("whatsapp") || pedido.confirmacion_enviada)
          ? "Te avisamos por WhatsApp"
          : undefined,
      pista: "Te avisaremos cuando esté listo",
      descripcionAccesible: "Listo para recoger",
    },
    {
      id: "entregado",
      nombre: "Entregado",
      estado: estado === "entregado" ? "completado" : "pendiente",
      fecha: evEntregado?.fecha,
      hora: evEntregado?.hora,
      fechaHoraTexto: evEntregado?.texto,
      pista: "Cuando pases a la tienda",
      descripcionAccesible: "Entregado",
    },
  ];

  if (esCancelado) {
    return ajustarPasosParaCancelado(pasos, pedido, eventosPorEstado);
  }

  return pasos;
}

/**
 * Ajusta la lista de pasos para pedidos cancelados, expirados o con pago fallido
 */
function ajustarPasosParaCancelado(
  pasosOriginales: PasoSeguimiento[],
  pedido: any,
  eventosPorEstado: Record<string, { fecha: string; hora: string; texto: string; nota?: string }>
): PasoSeguimiento[] {
  const estado = pedido.estado;
  const evCancel = eventosPorEstado[estado] || {
    fecha: formatearFechaPedido(pedido.creado_en),
    hora: extraerHora(pedido.creado_en) || "",
    texto: `${formatearFechaPedido(pedido.creado_en)} · ${extraerHora(pedido.creado_en)}`,
    nota: "Pedido no completado",
  };

  // Mantener solo los pasos que alcanzaron a completarse
  const pasosCompletados = pasosOriginales.filter((p) => p.estado === "completado");

  let tituloPaso = "Pedido cancelado";
  if (estado === "expirado") {
    tituloPaso = "Apartado vencido";
  } else if (estado === "pago_fallido") {
    tituloPaso = "Pago no completado";
  }

  pasosCompletados.push({
    id: "cancelado",
    nombre: tituloPaso,
    estado: "cancelado",
    fecha: evCancel.fecha,
    hora: evCancel.hora,
    fechaHoraTexto: evCancel.texto,
    nota: evCancel.nota || (estado === "expirado" ? "Tiempo límite de apartado superado" : undefined),
    descripcionAccesible: `${tituloPaso} el ${evCancel.texto}`,
  });

  return pasosCompletados;
}


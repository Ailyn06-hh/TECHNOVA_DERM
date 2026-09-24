"use client";

import React, { useState, useEffect, useRef } from "react";
import ConfirmationHeader from "./ConfirmationHeader";
import OrderFacts from "./OrderFacts";
import OrderProgress from "./OrderProgress";
import PickupCode from "./PickupCode";
import ShippingInfo from "./ShippingInfo";
import OrderItemsCollapsible from "./OrderItemsCollapsible";
import ConfirmationActions from "./ConfirmationActions";
import { PasoSeguimiento } from "@/lib/pedidos";

export interface ConfirmationPageProps {
  initialData: {
    pedido: {
      id: number;
      folio: string;
      canal: string;
      tipo_entrega: "recoger" | "envio";
      sucursal?: {
        id: number;
        nombre: string;
        direccion: string;
        direccion_corta?: string;
        horario?: string | null;
      } | null;
      envio?: {
        calle: string;
        numero: string;
        colonia: string;
        cp: string;
        ciudad: string;
        estado: string;
        referencias?: string;
        direccionCompleta: string;
      } | null;
      totales: {
        subtotal: number;
        descuento: number;
        costo_envio: number;
        total: number;
      };
      metodo_pago: string;
      estado: string;
      codigo_recogida?: string | null;
      reserva_expira_en?: string | null;
      creado_en: string;
    };
    cliente: {
      nombre: string;
      correo: string;
    };
    items: Array<{
      id: number;
      producto_id: number;
      nombre: string;
      cantidad: number;
      precio_unitario: number;
      descuento?: number;
      grupo_tipo?: string;
    }>;
    eventos: Array<{
      id: number;
      estado: string;
      nota?: string;
      creado_en: string;
    }>;
    pasos: PasoSeguimiento[];
  };
}

export default function ConfirmationPage({ initialData }: ConfirmationPageProps) {
  const [data, setData] = useState(initialData);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const [tiempoPendiente, setTiempoPendiente] = useState(60);
  const h1Ref = useRef<HTMLHeadingElement>(null);
  const prevEstadoRef = useRef(initialData.pedido.estado);

  const { pedido, cliente, items, pasos } = data;

  // 1. Título de la pestaña accesible e intuitivo
  useEffect(() => {
    const folioFormat = pedido.folio.startsWith("#") ? pedido.folio : `#${pedido.folio}`;
    document.title = `Pedido ${folioFormat} confirmado · Technova-Derm`;
  }, [pedido.folio]);

  // 2. Al cargar, el foco va al título (h1)
  useEffect(() => {
    if (h1Ref.current) {
      h1Ref.current.focus();
    }
  }, []);

  // Función para re-consultar el estado del pedido
  const refrescarPedido = async () => {
    try {
      const res = await fetch(`/api/pedidos/${pedido.folio}/resumen`, {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.pedido) {
          if (json.pedido.estado !== prevEstadoRef.current) {
            setLiveAnnouncement(
              `El estado de tu pedido ha cambiado a: ${json.pedido.estado.replace(/_/g, " ")}`
            );
            prevEstadoRef.current = json.pedido.estado;
          }
          setData(json);
        }
      }
    } catch (err) {
      console.error("[Polling Confirmación Error]:", err);
    }
  };

  // 3. Polling especial para pagos pendientes (Mercado Pago): cada 3 segundos hasta 60 segundos
  useEffect(() => {
    if (pedido.estado !== "pendiente_pago") return;

    const interval = setInterval(() => {
      setTiempoPendiente((prev) => {
        if (prev <= 3) {
          clearInterval(interval);
          return 0;
        }
        return prev - 3;
      });

      refrescarPedido();
    }, 3000);

    return () => clearInterval(interval);
  }, [pedido.estado, pedido.folio]);

  // 4. Polling continuo cada 30 segundos mientras la pestaña esté visible
  useEffect(() => {
    // Si ya está terminado o fallido, no es necesario hacer polling agresivo
    if (["entregado", "cancelado", "expirado", "pago_fallido"].includes(pedido.estado)) {
      return;
    }

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        refrescarPedido();
      }
    }, 30000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refrescarPedido();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pedido.estado, pedido.folio]);

  // 5. Cálculos de fechas y textos complementarios
  const entregaTexto =
    pedido.tipo_entrega === "recoger"
      ? pedido.sucursal?.nombre || "Technova-Derm Centro"
      : "Envío a domicilio";

  // Fecha estimada para domicilio
  const calcularRangoEntrega = (): string => {
    const hoy = new Date();
    const d1 = new Date(hoy);
    d1.setDate(d1.getDate() + 2);
    const d2 = new Date(hoy);
    d2.setDate(d2.getDate() + 4);

    const opciones: Intl.DateTimeFormatOptions = {
      weekday: "long",
      day: "numeric",
    };
    const f1 = d1.toLocaleDateString("es-MX", opciones);
    const f2 = d2.toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    return `Llega entre el ${f1} y el ${f2}`;
  };

  // Disponibilidad de recolección en tienda
  const calcularDisponibilidad = (): string => {
    const fecha = pedido.creado_en ? new Date(pedido.creado_en) : new Date();
    const hora = fecha.getHours();
    const sucursalLugar =
      pedido.sucursal?.direccion_corta || pedido.sucursal?.nombre || "tienda física";

    if (hora < 18) {
      const horaListo = Math.min(20, hora + 2);
      return `Disponible desde hoy a las ${String(horaListo).padStart(2, "0")}:00 en ${sucursalLugar}`;
    }
    return `Disponible desde mañana a las 11:00 en ${sucursalLugar}`;
  };

  // Información de apartado para 'por_pagar_en_tienda'
  const infoApartado =
    pedido.estado === "por_pagar_en_tienda"
      ? {
          fecha: "mañana",
          hora: "20:00",
          total: `$${Number(pedido.totales.total).toLocaleString("es-MX", {
            maximumFractionDigits: 0,
          })}`,
        }
      : undefined;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6">
      {/* Región accesible aria-live para anunciar cambios de estado en tiempo real */}
      <div className="sr-only" aria-live="polite" role="status">
        {liveAnnouncement}
      </div>

      {/* Cabecera de Confirmación */}
      <ConfirmationHeader
        nombre={cliente?.nombre || ""}
        estado={pedido.estado}
        tipoEntrega={pedido.tipo_entrega}
        tiempoRestantePendiente={tiempoPendiente}
        infoApartado={infoApartado}
        h1Ref={h1Ref}
      />

      {/* Tarjeta blanca con esquinas redondeadas y sombra suave */}
      <div className="bg-white rounded-3xl p-6 sm:p-9 border border-slate-100/80 shadow-sm text-center">
        {/* Fila de 4 datos */}
        <OrderFacts
          folio={pedido.folio}
          canal={pedido.canal}
          entrega={entregaTexto}
          total={pedido.totales.total}
        />

        {/* Barra de seguimiento de 4 pasos */}
        {!["pago_fallido", "expirado", "cancelado"].includes(pedido.estado) && (
          <OrderProgress pasos={pasos} />
        )}

        {/* Recuadro de Código de Recogida (Recoger en tienda) */}
        {pedido.tipo_entrega === "recoger" && (
          <PickupCode
            codigo={pedido.codigo_recogida}
            sucursalNombre={pedido.sucursal?.nombre}
            direccionCorta={pedido.sucursal?.direccion_corta}
            disponibilidadTexto={calcularDisponibilidad()}
          />
        )}

        {/* Recuadro de Dirección y Rango de Entrega (Envío a domicilio) */}
        {pedido.tipo_entrega === "envio" && (
          <ShippingInfo
            direccionCompleta={pedido.envio?.direccionCompleta}
            referencias={pedido.envio?.referencias}
            rangoEntrega={calcularRangoEntrega()}
          />
        )}

        {/* Desplegable de productos */}
        <OrderItemsCollapsible items={items} totales={pedido.totales} />
      </div>

      {/* Botones de acción */}
      <ConfirmationActions folio={pedido.folio} estado={pedido.estado} />
    </div>
  );
}

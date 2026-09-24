"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  RotateCcw,
  Download,
  AlertCircle,
  HelpCircle,
  FileCheck2,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { useCarrito } from "@/contexts/CarritoContext";
import OrderHeader from "./OrderHeader";
import OrderTimeline, { PasoSeguimiento } from "./OrderTimeline";
import PickupCard from "./PickupCard";
import ShippingCard from "./ShippingCard";
import InStoreCard from "./InStoreCard";
import OrderItemsCard, { OrderItemDetail } from "./OrderItemsCard";
import InvoiceRequestModal from "./InvoiceRequestModal";
import ReturnRequestModal from "./ReturnRequestModal";
import ReorderButton from "@/components/orders/ReorderButton";

export interface OrderDetailData {
  pedido: {
    id: number;
    folio: string;
    canal: string;
    canalEtiqueta: string;
    tipoEntrega: string;
    sucursalId?: number | null;
    codigoRecogida?: string;
    estado: string;
    subtotal: number;
    descuento: number;
    costoEnvio: number;
    total: number;
    totalFormateado: string;
    fechaFormateada: string;
    creadoEn: string;
    entregadoEn?: string | null;
    formaPagoTexto: string;
    metodoPago?: string;
    pagoMarca?: string;
    pagoUltimos4?: string;
    paqueteria?: string;
    numeroGuia?: string;
    urlRastreo?: string;
    envio?: {
      calle?: string;
      numero?: string;
      colonia?: string;
      cp?: string;
      ciudad?: string;
      estado?: string;
      referencias?: string;
    };
  };
  sucursal: {
    id: number;
    nombre: string;
    direccion: string;
    direccionCorta?: string;
    ciudad: string;
    latitud: number;
    longitud: number;
    horarioTexto: string;
  } | null;
  items: OrderItemDetail[];
  lineaTiempo: PasoSeguimiento[];
  factura: {
    id: number;
    rfc: string;
    razon_social: string;
    regimen_fiscal: string;
    codigo_postal_fiscal: string;
    uso_cfdi: string;
    correo: string;
    estado: "solicitada" | "emitida" | "rechazada";
    pdf_url?: string;
    xml_url?: string;
    creado_en: string;
  } | null;
  datosFiscalesPrevios?: any;
  facturaDisponible: boolean;
  facturaFueraDePlazo: boolean;
  diasParaFacturar: number;
  devolucion: {
    id: number;
    motivo: string;
    comentario?: string;
    metodo: string;
    estado: string;
    creado_en: string;
  } | null;
  devolucionDisponible: boolean;
  devolucionEnCurso: boolean;
  devolucionFueraDePlazo: boolean;
  diasDevolucion: number;
}

interface OrderDetailPageProps {
  initialData: OrderDetailData;
  folio: string;
}

export default function OrderDetailPage({
  initialData,
  folio,
}: OrderDetailPageProps) {
  const [data, setData] = useState<OrderDetailData>(initialData);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  const { showToast } = useCarrito();

  // Función para refrescar datos del pedido
  const fetchOrderData = useCallback(async () => {
    try {
      const res = await fetch(`/api/cuenta/pedidos/${encodeURIComponent(folio)}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastRefreshed(new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }));
      }
    } catch (err) {
      console.error("[POLLING ERROR]:", err);
    }
  }, [folio]);

  // Polling cada 30 segundos mientras la página esté visible y el pedido esté en un estado activo
  useEffect(() => {
    const estadosActivos = [
      "pendiente_pago",
      "pagado",
      "preparando",
      "por_pagar_en_tienda",
      "listo_para_recoger",
      "enviado",
    ];

    if (!estadosActivos.includes(data.pedido.estado)) {
      return;
    }

    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchOrderData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [data.pedido.estado, fetchOrderData]);

  const { pedido, sucursal, items, lineaTiempo, factura, devolucion } = data;

  const handleInvoiceSuccess = (invoiceRes: any) => {
    fetchOrderData();
  };

  const handleReturnSuccess = (returnRes: any) => {
    fetchOrderData();
  };

  const devolucionCodigo = devolucion
    ? `DEV-${String(devolucion.id).padStart(4, "0")}`
    : null;

  return (
    <div className="w-full">
      {/* 1. Header del pedido */}
      <OrderHeader pedido={pedido} />

      {/* 2. Dos columnas: Seguimiento a la izquierda, Entrega a la derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8 items-start">
        {/* Columna Izquierda: Línea de Tiempo */}
        <div className="lg:col-span-7 xl:col-span-8">
          <OrderTimeline pasos={lineaTiempo} ultimaActualizacion={lastRefreshed} />
        </div>

        {/* Columna Derecha: Tarjeta de Entrega / Sucursal / Paquetería */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          {pedido.tipoEntrega === "recoger" && (
            <PickupCard
              codigoRecogida={pedido.codigoRecogida}
              sucursal={sucursal}
              estado={pedido.estado}
            />
          )}

          {pedido.tipoEntrega === "envio" && (
            <ShippingCard
              envio={pedido.envio}
              paqueteria={pedido.paqueteria}
              numeroGuia={pedido.numeroGuia}
              urlRastreo={pedido.urlRastreo}
              estado={pedido.estado}
            />
          )}

          {pedido.tipoEntrega === "mostrador" && (
            <InStoreCard
              sucursal={sucursal}
              fechaFormateada={pedido.fechaFormateada}
            />
          )}

          {/* Aviso contextual cuando el pedido esté listo para recoger */}
          {pedido.estado === "listo_para_recoger" && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 text-xs text-emerald-950 shadow-2xs">
              <div className="flex items-center gap-2 font-semibold text-emerald-900 mb-1">
                <FileCheck2 className="w-4 h-4 text-emerald-700" />
                <span>¡Tu pedido te espera!</span>
              </div>
              <p className="leading-relaxed font-light text-emerald-800">
                Tu rutina ha sido cuidadosamente preparada. Acércate a la sucursal con tu código de recogida cuando gustes.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 3. Tarjeta de Productos en el pedido y desglose */}
      <div className="mb-8">
        <OrderItemsCard
          items={items}
          subtotal={pedido.subtotal}
          descuento={pedido.descuento}
          costoEnvio={pedido.costoEnvio}
          total={pedido.total}
          totalFormateado={pedido.totalFormateado}
          tipoEntrega={pedido.tipoEntrega}
        />
      </div>

      {/* 4. Barra de Acciones del Pedido */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Comprobante de compra (PDF nativo del servidor) */}
          <a
            href={`/api/cuenta/pedidos/${encodeURIComponent(pedido.folio)}/comprobante`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 rounded-full text-xs font-semibold bg-stone-50 border border-stone-300 text-stone-700 hover:bg-stone-100 hover:border-stone-400 active:scale-[0.98] transition-all shadow-2xs inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B122C]"
            aria-label="Descargar comprobante de compra en PDF"
          >
            <Download className="w-3.5 h-3.5 text-stone-500" />
            <span>Descargar comprobante</span>
          </a>

          {/* Facturación Electrónica */}
          {factura?.estado === "emitida" ? (
            <div className="inline-flex items-center gap-2">
              {factura.pdf_url && (
                <a
                  href={factura.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-full text-xs font-semibold bg-purple-50 border border-purple-200 text-[#5B122C] hover:bg-purple-100 transition-all inline-flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Factura (PDF)</span>
                </a>
              )}
              {factura.xml_url && (
                <a
                  href={factura.xml_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-full text-xs font-semibold bg-stone-50 border border-stone-300 text-stone-700 hover:bg-stone-100 transition-all inline-flex items-center gap-1.5"
                >
                  <span>XML</span>
                </a>
              )}
            </div>
          ) : factura?.estado === "solicitada" ? (
            <div
              className="px-4 py-2.5 rounded-full text-xs font-medium bg-amber-50 border border-amber-200 text-amber-900 inline-flex items-center gap-1.5"
              title="Tu factura está en proceso de generación y timbrado"
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Factura solicitada</span>
            </div>
          ) : data.facturaDisponible ? (
            <button
              type="button"
              onClick={() => setIsInvoiceModalOpen(true)}
              className="px-4 py-2.5 rounded-full text-xs font-semibold bg-stone-50 border border-stone-300 text-stone-700 hover:bg-stone-100 hover:border-stone-400 active:scale-[0.98] transition-all shadow-2xs inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B122C]"
            >
              <FileText className="w-3.5 h-3.5 text-stone-500" />
              <span>Solicitar factura</span>
            </button>
          ) : data.facturaFueraDePlazo ? (
            <span
              className="px-4 py-2.5 rounded-full text-xs font-medium bg-stone-100 border border-stone-200 text-stone-400 inline-flex items-center gap-1.5 cursor-not-allowed"
              title={`El plazo máximo para facturar es de ${data.diasParaFacturar} días naturales tras la compra.`}
            >
              <FileText className="w-3.5 h-3.5 opacity-50" />
              <span>Plazo de factura vencido</span>
            </span>
          ) : null}

          {/* Devoluciones */}
          {data.devolucionEnCurso ? (
            <div
              className="px-4 py-2.5 rounded-full text-xs font-medium bg-purple-50 border border-purple-200 text-[#5B122C] inline-flex items-center gap-1.5"
              title="Tu solicitud de devolución se encuentra en revisión"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#5B122C]" />
              <span>Devolución en curso: {devolucionCodigo}</span>
            </div>
          ) : data.devolucionDisponible ? (
            <button
              type="button"
              onClick={() => setIsReturnModalOpen(true)}
              className="px-4 py-2.5 rounded-full text-xs font-semibold bg-stone-50 border border-stone-300 text-stone-700 hover:bg-stone-100 hover:border-stone-400 active:scale-[0.98] transition-all shadow-2xs inline-flex items-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B122C]"
            >
              <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
              <span>Solicitar devolución</span>
            </button>
          ) : data.devolucionFueraDePlazo ? (
            <span
              className="px-4 py-2.5 rounded-full text-xs font-medium bg-stone-100 border border-stone-200 text-stone-400 inline-flex items-center gap-1.5 cursor-not-allowed"
              title={`El plazo de devolución concluyó a los ${data.diasDevolucion} días de la entrega.`}
            >
              <RotateCcw className="w-3.5 h-3.5 opacity-50" />
              <span>Plazo de devolución vencido</span>
            </span>
          ) : pedido.estado !== "entregado" ? (
            <span
              className="px-4 py-2.5 rounded-full text-xs font-medium bg-stone-100 border border-stone-200 text-stone-400 inline-flex items-center gap-1.5 cursor-not-allowed"
              title="Solo podrás solicitar devolución una vez entregado el pedido."
            >
              <RotateCcw className="w-3.5 h-3.5 opacity-50" />
              <span>Devolución disponible tras entrega</span>
            </span>
          ) : null}
        </div>

        {/* Botón Recomprar */}
        <div className="w-full sm:w-auto">
          <ReorderButton folio={pedido.folio} className="w-full sm:w-auto px-5 py-2.5 text-xs" />
        </div>
      </div>

      {/* Modal de Solicitud de Factura */}
      <InvoiceRequestModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        folio={pedido.folio}
        initialData={data.datosFiscalesPrevios}
        onSuccess={handleInvoiceSuccess}
        showToast={showToast}
      />

      {/* Modal de Solicitud de Devolución */}
      <ReturnRequestModal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        folio={pedido.folio}
        items={items}
        onSuccess={handleReturnSuccess}
        showToast={showToast}
      />
    </div>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, CreditCard, Store, Truck } from "lucide-react";
import OrderStatusBadge from "@/components/account/OrderStatusBadge";

interface OrderHeaderProps {
  pedido: {
    folio: string;
    canal: string;
    canalEtiqueta: string;
    tipoEntrega: string;
    estado: string;
    fechaFormateada: string;
    formaPagoTexto: string;
    metodoPago?: string;
    pagoMarca?: string;
    pagoUltimos4?: string;
  };
}

export default function OrderHeader({ pedido }: OrderHeaderProps) {
  const router = useRouter();

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/cuenta/pedidos");
    }
  };

  const folioText = pedido.folio.startsWith("#") ? pedido.folio : `#${pedido.folio}`;

  return (
    <div className="mb-8">
      {/* Botón Volver */}
      <div className="mb-4">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-stone-600 hover:text-[#5B122C] transition-colors group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B122C] rounded-md px-1 py-0.5"
          aria-label="Volver al listado de pedidos"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5 text-stone-500 group-hover:text-[#5B122C]" />
          <span>Volver a mis pedidos</span>
        </button>
      </div>

      {/* Cabecera con Folio y Estado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-2xl sm:text-3xl font-medium text-stone-900 tracking-tight">
              Pedido {folioText}
            </h1>
            <OrderStatusBadge
              estado={pedido.estado}
              tipoEntrega={pedido.tipoEntrega}
              className="text-xs px-2.5 py-0.5 shadow-2xs"
            />
          </div>

          {/* Subtítulo con metadata omnicanal */}
          <div className="mt-2 flex flex-wrap items-center gap-y-1.5 gap-x-2 text-xs text-stone-600 font-light">
            <span className="flex items-center gap-1.5 text-stone-800 font-normal">
              {pedido.tipoEntrega === "recoger" ? (
                <Store className="w-3.5 h-3.5 text-[#5B122C]" />
              ) : pedido.tipoEntrega === "envio" ? (
                <Truck className="w-3.5 h-3.5 text-[#5B122C]" />
              ) : (
                <Store className="w-3.5 h-3.5 text-[#5B122C]" />
              )}
              {pedido.canalEtiqueta}
            </span>

            <span className="text-stone-300" aria-hidden="true">·</span>

            <span className="flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-stone-400" />
              {pedido.formaPagoTexto}
            </span>

            <span className="text-stone-300" aria-hidden="true">·</span>

            <span className="flex items-center gap-1.5 text-stone-500">
              <Clock className="w-3.5 h-3.5 text-stone-400" />
              {pedido.fechaFormateada}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

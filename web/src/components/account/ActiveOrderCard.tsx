"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Package, Sparkles } from "lucide-react";
import OrderStatusBadge from "./OrderStatusBadge";
import { formatearPrecio } from "@/lib/formato";

export interface ActiveOrderData {
  id: number;
  folio: string;
  estado: string;
  tipo_entrega: "recoger" | "envio" | string;
  total: number;
  itemsCount: number;
  canalTexto: string;
  codigoRecogida?: string | null;
  sucursalTexto?: string | null;
  reservaExpiraEn?: string | null;
  direccionCorta?: string | null;
}

interface ActiveOrderCardProps {
  pedido: ActiveOrderData | null;
  otrosCount?: number;
}

export default function ActiveOrderCard({
  pedido,
  otrosCount = 0,
}: ActiveOrderCardProps) {
  // Sin pedidos en curso
  if (!pedido) {
    return (
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-xs flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl sm:text-2xl font-medium text-slate-900">
              Pedido en curso
            </h2>
          </div>
          <div className="py-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#FAF8F5] text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-800">
              No tienes pedidos en curso
            </p>
            <p className="text-xs text-slate-500 font-light mt-1 max-w-xs mx-auto">
              Cuando realices una compra en línea o apartes una rutina en tienda, podrás seguirla aquí.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <Link
            href="/rutinas"
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-full bg-[#1A1715] hover:bg-[#2C2724] text-white text-xs sm:text-sm font-medium transition shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-rose-300" />
            <span>Ver rutinas</span>
          </Link>
        </div>
      </div>
    );
  }

  // Desglosar código para anunciarlo dígito por dígito a lectores de pantalla
  const codigo = pedido.codigoRecogida || "";
  const codigoAccesible = codigo ? codigo.split("").join(", ") : "";

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-xs flex flex-col justify-between h-full">
      <div>
        {/* Encabezado: Folio y Badge */}
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <h2 className="font-serif text-xl sm:text-2xl font-medium text-slate-900 tracking-tight">
            Pedido #{pedido.folio}
          </h2>
          <OrderStatusBadge
            estado={pedido.estado}
            tipoEntrega={pedido.tipo_entrega}
          />
        </div>

        {/* Subtítulo: Hecho en... */}
        <p className="text-xs text-slate-500 font-light mb-5">
          {pedido.canalTexto}
        </p>

        {/* Recuadro crema informativo: Código de recogida o Entrega a domicilio */}
        {pedido.tipo_entrega === "recoger" && pedido.codigoRecogida ? (
          <div className="bg-[#FAF8F5] rounded-2xl p-4 sm:p-5 border border-[#F3EFEA] mb-5 text-center sm:text-left">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium block mb-1">
              Código de recogida
            </span>
            <div
              className="font-serif text-3xl sm:text-4xl font-semibold text-slate-900 tracking-widest my-1"
              aria-label={`Código de recogida: ${codigoAccesible}`}
            >
              {pedido.codigoRecogida}
            </div>
            <p className="text-xs text-slate-600 font-light mt-1.5 truncate">
              {pedido.sucursalTexto}
            </p>
          </div>
        ) : pedido.estado === "por_pagar_en_tienda" ? (
          <div className="bg-[#FAF8F5] rounded-2xl p-4 sm:p-5 border border-[#F3EFEA] mb-5">
            <span className="text-[11px] uppercase tracking-wider text-[#6B1F4A] font-medium block mb-1">
              Apartado en tienda
            </span>
            <p className="text-sm font-medium text-slate-800">
              Pagas {formatearPrecio(pedido.total)} al recoger en caja
            </p>
            <p className="text-xs text-slate-500 font-light mt-1">
              {pedido.sucursalTexto}
            </p>
          </div>
        ) : (
          <div className="bg-[#FAF8F5] rounded-2xl p-4 sm:p-5 border border-[#F3EFEA] mb-5">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium block mb-1">
              Envío a domicilio
            </span>
            <p className="text-sm font-medium text-slate-800">
              Llega en 2 a 3 días hábiles
            </p>
            {pedido.direccionCorta && (
              <p className="text-xs text-slate-500 font-light mt-1 truncate">
                {pedido.direccionCorta}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Pie: Botón Ver seguimiento y enlace a otros pedidos */}
      <div className="pt-2">
        <Link
          href={`/cuenta/pedidos/${pedido.folio}`}
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-full bg-[#1A1715] hover:bg-[#2C2724] text-white text-xs sm:text-sm font-medium transition shadow-xs"
        >
          <span>Ver seguimiento</span>
          <ArrowRight className="w-4 h-4" />
        </Link>

        {otrosCount > 0 && (
          <div className="text-center mt-3">
            <Link
              href="/cuenta/pedidos"
              className="text-xs font-medium text-[#6B1F4A] hover:underline"
            >
              +{otrosCount} {otrosCount === 1 ? "pedido más" : "pedidos más"} en curso
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

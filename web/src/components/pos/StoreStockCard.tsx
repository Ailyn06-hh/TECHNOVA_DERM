"use client";

import React from "react";
import { Store, Building2, PackageCheck } from "lucide-react";

export interface TiendaStockInfo {
  id: number;
  nombre: string;
  nombreCompleto: string;
  tipo: "tienda" | "bodega";
  esBodega: boolean;
  esTiendaActual: boolean;
  disponibles: number;
  apartadas: number;
  pedidosApartados?: string[];
  direccionCorta?: string;
}

interface StoreStockCardProps {
  tienda: TiendaStockInfo;
}

export default function StoreStockCard({ tienda }: StoreStockCardProps) {
  const { esTiendaActual, esBodega, disponibles, apartadas, pedidosApartados } = tienda;

  const tieneStock = disponibles > 0;
  const tieneApartadas = apartadas > 0;

  let pedidoTexto = "";
  if (tieneApartadas) {
    if (pedidosApartados && pedidosApartados.length > 0) {
      pedidoTexto = `${apartadas} apartada (${pedidosApartados.join(", ")})`;
    } else {
      pedidoTexto = `${apartadas} ${apartadas === 1 ? "apartada" : "apartadas"}`;
    }
  }

  return (
    <div
      className={`p-3.5 rounded-2xl border transition-all ${
        esTiendaActual
          ? "bg-amber-50/30 border-amber-200/90 shadow-xs"
          : "bg-white border-stone-200/90 shadow-2xs"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
              esTiendaActual
                ? "bg-[#2A2320] text-white"
                : esBodega
                ? "bg-stone-100 text-stone-600"
                : "bg-stone-100 text-stone-700"
            }`}
          >
            {esBodega ? <Building2 className="w-3.5 h-3.5" /> : <Store className="w-3.5 h-3.5" />}
          </div>

          <div className="min-w-0">
            <h5 className="text-xs font-semibold text-stone-900 truncate">
              {tienda.nombreCompleto}
            </h5>
            {tienda.direccionCorta && (
              <p className="text-[10px] text-stone-400 font-light truncate">
                {tienda.direccionCorta}
              </p>
            )}
          </div>
        </div>

        <div>
          {esTiendaActual ? (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100/80 text-amber-900 border border-amber-200">
              Esta tienda
            </span>
          ) : esBodega ? (
            <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 border border-stone-200/70">
              Almacén central
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-baseline justify-between pt-1">
        <div>
          <span
            className={`text-2xl font-bold tracking-tight ${
              disponibles === 0
                ? "text-stone-300"
                : esTiendaActual
                ? "text-stone-900"
                : "text-stone-700"
            }`}
          >
            {disponibles}
          </span>
          <span className="text-xs text-stone-500 font-light ml-1.5">
            {disponibles === 1 ? "disponible" : "disponibles"}
          </span>
        </div>

        {tieneApartadas && (
          <div className="text-right">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/60">
              <PackageCheck className="w-3 h-3 text-amber-600" />
              <span>{pedidoTexto}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

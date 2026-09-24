"use client";

import React from "react";
import { Truck, Calendar, Package } from "lucide-react";

interface RestockBadgeProps {
  orden: {
    folio: string;
    proveedor: string;
    cantidad: number;
    llegadaTexto: string;
  };
}

export default function RestockBadge({ orden }: RestockBadgeProps) {
  return (
    <div className="p-3.5 rounded-2xl bg-sky-50/80 border border-sky-200/90 text-sky-950 space-y-1.5 shadow-2xs">
      <div className="flex items-center gap-2 text-sky-800 text-xs font-semibold">
        <Truck className="w-4 h-4 text-sky-600 shrink-0" />
        <span>Reabastecimiento en camino</span>
        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-sky-100 text-sky-800 ml-auto">
          {orden.folio}
        </span>
      </div>

      <p className="text-xs text-sky-900 leading-relaxed font-light">
        <strong className="font-semibold">{orden.cantidad} piezas</strong> del proveedor{" "}
        <span className="font-medium">{orden.proveedor}</span>
      </p>

      <div className="flex items-center gap-1.5 text-[11px] text-sky-700 pt-0.5">
        <Calendar className="w-3.5 h-3.5 text-sky-600" />
        <span>Llegada estimada: {orden.llegadaTexto}</span>
      </div>
    </div>
  );
}

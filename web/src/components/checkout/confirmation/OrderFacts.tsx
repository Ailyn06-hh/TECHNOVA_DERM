"use client";

import React from "react";
import { formatearPrecio } from "@/lib/formato";

export interface OrderFactsProps {
  folio: string;
  canal: string;
  entrega: string;
  total: number;
}

export default function OrderFacts({
  folio,
  canal,
  entrega,
  total,
}: OrderFactsProps) {
  // Aseguramos formato con '#' delante: #N-1042
  const folioConHash = folio.startsWith("#") ? folio : `#${folio}`;

  return (
    <div className="border-b border-slate-100 pb-6 mb-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 text-left">
        {/* PEDIDO */}
        <div>
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Pedido
          </span>
          <p className="text-sm sm:text-base font-bold text-slate-900 font-mono tracking-tight">
            {folioConHash}
          </p>
        </div>

        {/* CANAL */}
        <div>
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Canal
          </span>
          <p className="text-sm sm:text-base font-bold text-slate-900">
            {canal || "Web"}
          </p>
        </div>

        {/* ENTREGA */}
        <div>
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Entrega
          </span>
          <p className="text-sm sm:text-base font-bold text-slate-900 truncate" title={entrega}>
            {entrega}
          </p>
        </div>

        {/* TOTAL */}
        <div>
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Total
          </span>
          <p className="text-sm sm:text-base font-bold text-slate-900">
            {formatearPrecio(total)}
          </p>
        </div>
      </div>
    </div>
  );
}

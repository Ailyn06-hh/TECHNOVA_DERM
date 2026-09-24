"use client";

import React from "react";
import type { PosLineaDescuento } from "@/lib/pos/ventas";
import { Tag } from "lucide-react";

interface TicketTotalsProps {
  subtotal: number;
  totalDescuento: number;
  total: number;
  lineasDescuento: PosLineaDescuento[];
}

export default function TicketTotals({
  subtotal,
  totalDescuento,
  total,
  lineasDescuento,
}: TicketTotalsProps) {
  return (
    <div className="space-y-2 pt-3 border-t border-stone-200">
      {/* Subtotal */}
      <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
        <span>Subtotal</span>
        <span>${subtotal.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>

      {/* Líneas de Descuento en Color Vino */}
      {lineasDescuento.map((desc) => (
        <div
          key={desc.id}
          className="flex items-center justify-between text-xs text-[#5B122C] font-semibold"
        >
          <span className="flex items-center gap-1 truncate max-w-[200px]">
            <Tag className="w-3 h-3 shrink-0" />
            <span className="truncate">{desc.concepto}</span>
          </span>
          <span>
            -${desc.monto.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      ))}

      {/* Total Grande */}
      <div
        aria-live="polite"
        className="pt-2 border-t border-stone-200/80 flex items-baseline justify-between"
      >
        <span className="font-serif text-lg font-medium text-stone-900">Total</span>
        <span className="font-serif text-2xl font-bold text-stone-900 tracking-tight">
          ${total.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
}

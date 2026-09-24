"use client";

import React, { useState } from "react";
import { X, Minus, Plus } from "lucide-react";
import type { PosTicketItem } from "@/lib/pos/ventas";

interface TicketLineProps {
  item: PosTicketItem;
  onUpdateQty: (itemId: number, delta: number) => void;
  onRemoveItem: (itemId: number) => void;
  isHighlighted?: boolean;
  disabled?: boolean;
}

export default function TicketLine({
  item,
  onUpdateQty,
  onRemoveItem,
  isHighlighted = false,
  disabled = false,
}: TicketLineProps) {
  const [showQtySelector, setShowQtySelector] = useState(false);

  const isCombo = item.grupo_tipo === "combo";
  const stockMax = item.stock_tienda;

  return (
    <div
      className={`group rounded-2xl p-2.5 sm:p-3 border transition-all ${
        isHighlighted
          ? "bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200"
          : "bg-white border-stone-100 hover:border-stone-200 hover:bg-stone-50/50"
      }`}
    >
      <div className="flex items-center justify-between gap-2.5">
        {/* Miniatura representativa del frasco */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: item.color_fondo || "#F3E1E4" }}
        >
          <div
            className="w-3.5 h-6 rounded-xs shadow-2xs border border-black/10 flex items-center justify-center"
            style={{ backgroundColor: item.color_frasco || "#D08C98" }}
          >
            <span className="text-[6px] text-white font-bold">N</span>
          </div>
        </div>

        {/* Nombre y Cantidad x Precio */}
        <div
          onClick={() => !disabled && setShowQtySelector(!showQtySelector)}
          className="flex-1 cursor-pointer select-none"
        >
          <p className="text-xs font-semibold text-stone-900 line-clamp-1 leading-snug">
            {item.nombre}
          </p>

          <p className="text-[11px] text-stone-500 font-light mt-0.5">
            <span className="font-semibold text-stone-800">{item.cantidad}</span> × $
            {item.precio_lista.toLocaleString("es-MX", { minimumFractionDigits: 0 })}
            {isCombo && (
              <span className="ml-1.5 text-[10px] text-[#5B122C] font-medium bg-[#FAF3F6] px-1.5 py-0.2 rounded-xs">
                Combo
              </span>
            )}
          </p>
        </div>

        {/* Importe a la derecha */}
        <div className="text-right shrink-0">
          <span className="text-xs sm:text-sm font-bold text-stone-900">
            ${item.subtotal.toLocaleString("es-MX", { minimumFractionDigits: 0 })}
          </span>
        </div>

        {/* Botón X para quitar */}
        <button
          type="button"
          onClick={() => !disabled && onRemoveItem(item.id)}
          disabled={disabled}
          className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 active:scale-90"
          title="Quitar de la venta"
          aria-label={`Quitar ${item.nombre}`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Selector de cantidad interactivo (- N +) desplegable */}
      {showQtySelector && (
        <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between animate-fade-in text-xs">
          <span className="text-[11px] text-stone-400 font-light">
            Stock en tienda: <strong>{stockMax}</strong>
          </span>

          <div className="flex items-center gap-2 bg-stone-100/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => onUpdateQty(item.id, -1)}
              disabled={disabled}
              className="w-7 h-7 rounded-lg bg-white text-stone-700 font-bold flex items-center justify-center shadow-2xs hover:bg-stone-50 active:scale-95"
              aria-label="Restar una unidad"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <span className="w-6 text-center font-bold text-stone-900 text-xs">
              {item.cantidad}
            </span>

            <button
              type="button"
              onClick={() => onUpdateQty(item.id, 1)}
              disabled={disabled || item.cantidad >= stockMax}
              className="w-7 h-7 rounded-lg bg-white text-stone-700 font-bold flex items-center justify-center shadow-2xs hover:bg-stone-50 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Sumar una unidad"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

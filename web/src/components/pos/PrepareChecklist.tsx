"use client";

import React from "react";
import { Check } from "lucide-react";

export interface ItemChecklist {
  id: number;
  nombre: string;
  sku: string;
  cantidad: number;
}

interface PrepareChecklistProps {
  items: ItemChecklist[];
  checkedIds: Set<number>;
  onToggleItem: (id: number) => void;
  disabled?: boolean;
}

export default function PrepareChecklist({
  items,
  checkedIds,
  onToggleItem,
  disabled = false,
}: PrepareChecklistProps) {
  return (
    <div className="space-y-2 py-3">
      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">
        <span>Lista de empaque ({checkedIds.size}/{items.length})</span>
        <span>Tomado</span>
      </div>

      <div className="space-y-1.5">
        {items.map((it) => {
          const isChecked = checkedIds.has(it.id);
          return (
            <label
              key={it.id}
              className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                isChecked
                  ? "bg-emerald-50/60 border-emerald-200 text-stone-900"
                  : "bg-stone-50 border-stone-200/80 text-stone-700 hover:bg-stone-100/70"
              } ${disabled ? "opacity-60 pointer-events-none" : ""}`}
            >
              <div className="min-w-0 pr-3">
                <span className="text-xs font-semibold block truncate">
                  {it.nombre}
                </span>
                <span className="text-[11px] text-stone-400">
                  {it.cantidad} {it.cantidad === 1 ? "pieza" : "piezas"} · SKU: {it.sku}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggleItem(it.id)}
                  disabled={disabled}
                  className="sr-only"
                />
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                    isChecked
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "bg-white border-stone-300 text-transparent"
                  }`}
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

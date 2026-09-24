"use client";

import React from "react";
import { Check } from "lucide-react";
import { formatearPrecio } from "@/lib/formato";
import { RoutineStepProduct } from "@/lib/recomendaciones";

interface RoutineItemCardProps {
  product: RoutineStepProduct;
  stepLabel: string; // ej: "LIMPIADOR", "SÉRUM", "PROTECTOR SOLAR"
  isSelected: boolean;
  onToggle: () => void;
}

export default function RoutineItemCard({
  product,
  stepLabel,
  isSelected,
  onToggle,
}: RoutineItemCardProps) {
  const precioEfectivo = product.precio_especial ?? product.precio;

  return (
    <label
      onClick={onToggle}
      className={`relative flex items-center gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer select-none bg-white ${
        isSelected
          ? "border-[#6B1F4A] ring-1 ring-[#6B1F4A]/30 shadow-xs"
          : "border-slate-200/80 hover:border-slate-300 opacity-80"
      }`}
    >
      {/* Checkbox estilo marca */}
      <span className="relative flex items-center justify-center shrink-0 w-4 h-4">
        <span
          className={`w-4 h-4 rounded-md flex items-center justify-center transition-colors ${
            isSelected
              ? "bg-[#6B1F4A] text-white shadow-2xs"
              : "border border-slate-300 bg-white"
          }`}
        >
          {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
        </span>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="sr-only"
          aria-label={`Incluir ${product.nombre}, ${formatearPrecio(precioEfectivo)}`}
        />
      </span>

      {/* Miniatura con color de fondo y silueta del frasco */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs"
        style={{ backgroundColor: product.color_fondo || "#F3E1E4" }}
      >
        <div
          className="w-3.5 h-6 rounded-xs shadow-2xs"
          style={{ backgroundColor: product.color_frasco || "#D08C98" }}
        />
      </div>

      {/* Datos del producto */}
      <div className="flex-1 min-w-0">
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 leading-tight">
          {stepLabel}
        </span>
        <p className="text-xs font-medium text-slate-800 truncate leading-snug">
          {product.nombre}
        </p>
        <p className="text-xs font-semibold text-slate-900 mt-0.5">
          {formatearPrecio(precioEfectivo)}
        </p>
      </div>
    </label>
  );
}

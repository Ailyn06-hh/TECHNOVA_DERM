"use client";

import React from "react";
import { Sparkles, RotateCcw, XCircle } from "lucide-react";
import { LastFilterAction } from "@/hooks/useCatalogFilters";

interface EmptyStateProps {
  lastFilter?: LastFilterAction | null;
  onRemoveLastFilter?: () => void;
  onClearAll: () => void;
}

export default function EmptyState({
  lastFilter,
  onRemoveLastFilter,
  onClearAll,
}: EmptyStateProps) {
  return (
    <div className="bg-white rounded-3xl p-10 border border-slate-100 shadow-2xs text-center flex flex-col items-center justify-center my-6">
      <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center text-[#6B1F4A] mb-4">
        <Sparkles className="w-6 h-6 stroke-[1.5]" />
      </div>

      <h3 className="font-serif text-xl font-medium text-slate-900 mb-2">
        No encontramos productos con esos filtros
      </h3>

      <p className="text-xs text-slate-500 font-light max-w-md leading-relaxed mb-6">
        Intenta combinar diferentes opciones de categorías, tipos de piel o presupuesto para encontrar fórmulas dermatológicas disponibles.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {lastFilter && onRemoveLastFilter && (
          <button
            type="button"
            onClick={onRemoveLastFilter}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-medium bg-rose-50 hover:bg-rose-100 text-[#6B1F4A] border border-rose-200 transition-colors shadow-2xs cursor-pointer"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Quitar {lastFilter.label || lastFilter.value}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors shadow-2xs cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Limpiar filtros</span>
        </button>
      </div>
    </div>
  );
}

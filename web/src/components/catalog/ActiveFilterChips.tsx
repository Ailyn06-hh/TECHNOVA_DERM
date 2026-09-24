"use client";

import React from "react";
import { X } from "lucide-react";
import { NOMBRE_MARCA } from "@/lib/marca";

export interface ChipItem {
  id: string;
  group: "categoria" | "tipo_piel" | "precio" | "disponibilidad" | "q";
  label: string;
  value: string;
}

interface ActiveFilterChipsProps {
  chips: ChipItem[];
  onRemoveChip: (group: "categoria" | "tipo_piel" | "precio" | "disponibilidad" | "q", value: string) => void;
  onClearAll: () => void;
}

export default function ActiveFilterChips({
  chips,
  onRemoveChip,
  onClearAll,
}: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6" aria-label="Filtros activos">
      {chips.map((chip) => (
        <span
          key={`${chip.group}-${chip.value}`}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-rose-50 border border-rose-200/60 text-[#6B1F4A] shadow-2xs animate-fade-in"
        >
          <span>{chip.label}</span>
          <button
            type="button"
            onClick={() => onRemoveChip(chip.group, chip.value)}
            aria-label={`Quitar filtro ${chip.label}`}
            className="p-0.5 hover:bg-rose-100/80 rounded-full transition-colors cursor-pointer text-[#6B1F4A]/80 hover:text-[#6B1F4A]"
          >
            <X className="w-3 h-3 stroke-[2.5]" />
          </button>
        </span>
      ))}

      {chips.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs text-slate-500 hover:text-[#6B1F4A] underline underline-offset-4 ml-1 transition-colors cursor-pointer"
        >
          Borrar todos
        </button>
      )}
    </div>
  );
}

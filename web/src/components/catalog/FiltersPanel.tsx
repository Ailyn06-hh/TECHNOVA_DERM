"use client";

import React from "react";
import { SlidersHorizontal, RotateCcw } from "lucide-react";
import FilterGroup, { FilterOption } from "./FilterGroup";
import { NOMBRE_MARCA } from "@/lib/marca";
import { TIPOS_PIEL, PRESUPUESTOS } from "@/lib/perfilPiel";

export interface FacetCounts {
  categorias: Record<string, number>;
  tipos_piel: Record<string, number>;
  precios: Record<string, number>;
  disponibilidad: Record<string, number>;
}

interface FiltersPanelProps {
  selectedCategorias: string[];
  selectedTiposPiel: string[];
  selectedPrecios: string[];
  selectedDisponibilidad: string[];
  counts?: FacetCounts;
  sucursalNombre?: string;
  onToggleFilter: (
    group: "categoria" | "tipo_piel" | "precio" | "disponibilidad",
    value: string,
    label: string
  ) => void;
  onClearAll: () => void;
  hasActiveFilters: boolean;
}

export default function FiltersPanel({
  selectedCategorias,
  selectedTiposPiel,
  selectedPrecios,
  selectedDisponibilidad,
  counts,
  sucursalNombre = "Centro",
  onToggleFilter,
  onClearAll,
  hasActiveFilters,
}: FiltersPanelProps) {
  // 1. Opciones de Categoría principales
  const categoriaOptions: FilterOption[] = [
    { id: "limpieza", label: "Limpieza", count: counts?.categorias?.["limpieza"] },
    { id: "tonico", label: "Tónicos", count: counts?.categorias?.["tonico"] },
    { id: "serum", label: "Sérums", count: counts?.categorias?.["serum"] },
    { id: "hidratacion", label: "Hidratantes", count: counts?.categorias?.["hidratacion"] },
    { id: "proteccion-solar", label: "Protección solar", count: counts?.categorias?.["proteccion-solar"] },
  ];

  // 2. Opciones de Tipo de Piel (los 5 de lib/perfilPiel)
  const pielOptions: FilterOption[] = TIPOS_PIEL.map((t) => ({
    id: t.id,
    label: t.label,
    count: counts?.tipos_piel?.[t.id],
  }));

  // 3. Opciones de Precio (3 rangos de perfilPiel)
  const precioOptions: FilterOption[] = PRESUPUESTOS.map((p) => ({
    id: p.id,
    label: p.label,
    count: counts?.precios?.[p.id],
  }));

  // 4. Opciones de Disponibilidad
  const dispOptions: FilterOption[] = [
    {
      id: "recoger",
      label: `Recoger hoy en ${NOMBRE_MARCA} ${sucursalNombre}`,
      count: counts?.disponibilidad?.["recoger"],
    },
    {
      id: "envio",
      label: "Disponible para envío",
      count: counts?.disponibilidad?.["envio"],
    },
  ];

  return (
    <aside
      aria-label="Panel de filtros"
      className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs h-fit"
    >
      {/* Encabezado del panel */}
      <div className="flex items-center gap-2 pb-3 mb-2 border-b border-slate-100">
        <SlidersHorizontal className="w-4 h-4 text-[#6B1F4A]" />
        <h2 className="font-semibold text-sm text-slate-900 tracking-tight">
          Filtros
        </h2>
      </div>

      {/* Grupos de filtros */}
      <div className="divide-y divide-slate-100">
        <FilterGroup
          groupName="categoria"
          title="Categoría"
          options={categoriaOptions}
          selectedValues={selectedCategorias}
          onToggle={(val, lbl) => onToggleFilter("categoria", val, lbl)}
        />

        <FilterGroup
          groupName="tipo_piel"
          title="Tipo de piel"
          options={pielOptions}
          selectedValues={selectedTiposPiel}
          onToggle={(val, lbl) => onToggleFilter("tipo_piel", val, lbl)}
        />

        <FilterGroup
          groupName="precio"
          title="Precio"
          options={precioOptions}
          selectedValues={selectedPrecios}
          onToggle={(val, lbl) => onToggleFilter("precio", val, lbl)}
        />

        <FilterGroup
          groupName="disponibilidad"
          title="Disponibilidad"
          options={dispOptions}
          selectedValues={selectedDisponibilidad}
          onToggle={(val, lbl) => onToggleFilter("disponibilidad", val, lbl)}
        />
      </div>

      {/* Botón píldora con contorno: Limpiar filtros */}
      <div className="pt-5 mt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={onClearAll}
          disabled={!hasActiveFilters}
          className={`w-full py-2.5 px-4 rounded-full text-xs font-medium border transition-all text-center flex items-center justify-center gap-2 ${
            hasActiveFilters
              ? "border-slate-300 text-slate-700 hover:bg-slate-50 active:scale-[0.99] shadow-xs cursor-pointer"
              : "border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50/50"
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Limpiar filtros</span>
        </button>
      </div>
    </aside>
  );
}

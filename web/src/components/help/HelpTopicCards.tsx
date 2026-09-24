"use client";

import React from "react";
import { Truck, Store, RotateCcw, FileText } from "lucide-react";

export interface HelpTopic {
  id: number;
  slug: string;
  nombre: string;
  descripcion: string;
  icono: string;
  orden?: number;
}

interface HelpTopicCardsProps {
  temas: HelpTopic[];
  temaActivo: string | null;
  onSelectTema: (slug: string) => void;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  truck: Truck,
  store: Store,
  undo: RotateCcw,
  receipt: FileText,
};

export default function HelpTopicCards({
  temas,
  temaActivo,
  onSelectTema,
}: HelpTopicCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      {temas.map((tema) => {
        const isSelected = temaActivo === tema.slug;
        const IconComponent = ICON_MAP[tema.icono] || FileText;

        return (
          <button
            key={tema.slug}
            type="button"
            onClick={() => onSelectTema(tema.slug)}
            className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white border text-left transition-all cursor-pointer flex flex-col justify-between ${
              isSelected
                ? "border-[#5B122C] ring-2 ring-[#5B122C]/15 shadow-sm bg-[#FAF3F6]/20"
                : "border-stone-200 hover:border-stone-300 shadow-2xs hover:shadow-xs"
            }`}
          >
            {/* Ícono en cuadro rosa claro */}
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#FAF3F6] text-[#5B122C] flex items-center justify-center mb-3 shrink-0">
              <IconComponent className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[1.8]" />
            </div>

            <div>
              <h3 className="font-semibold text-stone-900 text-sm sm:text-base leading-snug mb-1">
                {tema.nombre}
              </h3>
              <p className="text-xs text-stone-500 font-light line-clamp-2 leading-relaxed">
                {tema.descripcion}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

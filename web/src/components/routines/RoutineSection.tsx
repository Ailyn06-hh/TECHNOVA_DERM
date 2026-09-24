"use client";

import React from "react";
import RoutineCard from "./RoutineCard";
import type { SeccionRutina } from "@/lib/recomendaciones";

export interface RoutineSectionProps {
  seccion: SeccionRutina;
  onRefresh?: () => void;
  onAnnounce?: (message: string) => void;
}

export default function RoutineSection({
  seccion,
  onRefresh,
  onAnnounce,
}: RoutineSectionProps) {
  const { tipoPiel, label, rutinas } = seccion;

  const tituloSeccion = label.toLowerCase().startsWith("piel")
    ? `Rutinas para ${label.toLowerCase()}`
    : `Rutinas para piel ${label.toLowerCase()}`;

  return (
    <section className="mb-14 sm:mb-16">
      {/* Encabezado de la Sección */}
      <div className="mb-6">
        <h2 className="font-serif text-2xl sm:text-3xl font-medium text-slate-900 tracking-tight">
          {tituloSeccion}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 font-light mt-1">
          Paso a paso equilibrado y formulado específicamente para las necesidades de esta piel.
        </p>
      </div>

      {/* Grid de 2 Tarjetas Lado a Lado (Mañana y Noche) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        {rutinas.map((rutina) => (
          <RoutineCard
            key={`${tipoPiel}-${rutina.clave}`}
            rutina={rutina}
            tipoPielLabel={label}
            onRefresh={onRefresh}
            onAnnounce={onAnnounce}
          />
        ))}
      </div>
    </section>
  );
}

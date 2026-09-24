"use client";

import React, { useEffect } from "react";
import ComboCard from "@/components/home/ComboCard";
import type { ComboRutinasItem } from "@/lib/recomendaciones";

export interface CombosSectionProps {
  combos: ComboRutinasItem[];
  isLoading?: boolean;
}

export default function CombosSection({
  combos,
  isLoading = false,
}: CombosSectionProps) {
  // Al llegar con #combos, hacer scroll suave a la sección después de montar
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#combos") {
      const el = document.getElementById("combos");
      if (el) {
        const timer = setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 180);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  if (!isLoading && combos.length === 0) {
    return null;
  }

  return (
    <section id="combos" className="scroll-mt-24 pt-6 pb-12 border-t border-slate-200/60">
      {/* Encabezado: Título serif y a la derecha texto gris en cursiva */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-3">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-medium text-slate-900 tracking-tight">
            Combos de la semana
          </h2>
        </div>
        <span className="text-xs sm:text-sm text-slate-500 italic">
          Precios especiales por tiempo limitado
        </span>
      </div>

      {/* Grid de 3 Tarjetas de Combo */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="animate-pulse bg-white/70 rounded-3xl p-6 h-96 flex flex-col justify-between border border-slate-100"
            >
              <div className="space-y-3">
                <div className="h-5 bg-slate-200/60 rounded w-1/3" />
                <div className="h-4 bg-slate-200/60 rounded w-1/2" />
                <div className="h-7 bg-slate-200/60 rounded w-3/4 mt-4" />
                <div className="h-16 bg-slate-200/60 rounded-2xl mt-4" />
              </div>
              <div className="h-12 bg-slate-200/60 rounded-full mt-6" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {combos.map((combo) => (
            <ComboCard
              key={combo.id}
              id={combo.id}
              nombre={combo.nombre}
              slug={combo.slug}
              descripcion_corta={combo.descripcion_corta}
              descuento_porcentaje={combo.descuento_porcentaje}
              color_fondo={combo.color_fondo}
              precio_original={combo.precio_original}
              precio_final={combo.precio_final}
              agotado={combo.agotado}
              vigencia_texto={combo.vigencia_texto}
              esIdealParaTuPiel={combo.esIdealParaTuPiel}
              productos={combo.productos}
            />
          ))}
        </div>
      )}
    </section>
  );
}

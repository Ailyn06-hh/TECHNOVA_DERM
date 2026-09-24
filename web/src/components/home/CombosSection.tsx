"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import ComboCard, { ComboCardProps } from "./ComboCard";

export default function CombosSection() {
  const [combos, setCombos] = useState<ComboCardProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCombos() {
      try {
        const res = await fetch("/api/combos/semana");
        if (res.ok) {
          const data = await res.json();
          setCombos(data.combos || []);
        }
      } catch (err) {
        console.error("Error al cargar combos de la semana:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadCombos();
  }, []);

  if (!isLoading && combos.length === 0) {
    return null;
  }

  return (
    <section id="combos" className="py-12 sm:py-16 bg-[#FAFAF9] border-b border-gray-100 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Encabezado de la sección */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-[#6B1F4A] text-xs font-medium border border-rose-100 mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-[#6B1F4A]" />
              <span>Edición limitada</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-medium text-slate-900 tracking-tight">
              Combos de la semana
            </h2>
            <p className="text-sm text-slate-500 font-light mt-1">
              Rutinas completas con descuento exclusivo para resultados sinérgicos en tu piel.
            </p>
          </div>

          <Link
            href="/combos"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B1F4A] hover:text-[#531839] group transition-colors shrink-0"
          >
            <span>Ver todos los combos</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Grid de Combos */}
        {isLoading && combos.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-white rounded-3xl p-6 border border-slate-100 h-96 flex flex-col justify-between">
                <div className="h-40 bg-slate-100 rounded-2xl" />
                <div className="space-y-3 mt-4">
                  <div className="h-5 bg-slate-100 rounded w-3/4" />
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                </div>
                <div className="h-10 bg-slate-100 rounded-full mt-6" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                productos={combo.productos}
              />
            ))}
          </div>
        )}

      </div>
    </section>
  );
}

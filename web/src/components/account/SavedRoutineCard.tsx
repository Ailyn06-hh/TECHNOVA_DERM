import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

export interface RoutineItemMini {
  id: number;
  nombre: string;
  slug: string;
  color_fondo?: string;
  color_frasco?: string;
}

export interface SavedRoutineData {
  hasRoutine: boolean;
  titulo?: string;
  esComprada?: boolean;
  plantillaClave?: string;
  subtitulo?: string;
  productos?: RoutineItemMini[];
}

interface SavedRoutineCardProps {
  rutina: SavedRoutineData | null;
}

export default function SavedRoutineCard({ rutina }: SavedRoutineCardProps) {
  if (!rutina || !rutina.hasRoutine || !rutina.productos || rutina.productos.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-xs flex flex-col justify-between h-full">
        <div>
          <h2 className="font-serif text-xl sm:text-2xl font-medium text-slate-900 mb-2">
            Mi rutina guardada
          </h2>
          <p className="text-xs text-slate-500 font-light leading-relaxed mb-6">
            Aún no guardas una rutina. Descubre tu combinación ideal de 3 pasos para el día o la noche.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/rutinas"
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-full bg-[#1A1715] hover:bg-[#2C2724] text-white text-xs sm:text-sm font-medium transition shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-rose-300" />
            <span>Armar mi rutina</span>
          </Link>
        </div>
      </div>
    );
  }

  const titulo = rutina.titulo || "Mi rutina guardada";

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-xs flex flex-col justify-between h-full">
      <div>
        {/* Encabezado: Título y Ver */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-serif text-xl sm:text-2xl font-medium text-slate-900">
            {titulo}
          </h2>
          <Link
            href="/cuenta/rutina"
            className="text-xs font-semibold text-[#6B1F4A] hover:underline"
          >
            Ver
          </Link>
        </div>

        {/* Fila de miniaturas de productos */}
        <div className="flex items-center gap-3 mb-4">
          {rutina.productos.map((prod, idx) => (
            <div
              key={prod.id || idx}
              title={prod.nombre}
              className="w-12 h-14 rounded-xl border border-slate-200/80 flex items-center justify-center shadow-2xs relative overflow-hidden"
              style={{ backgroundColor: prod.color_fondo || "#FAF8F5" }}
            >
              <div
                className="w-5 h-8 rounded-sm shadow-2xs"
                style={{ backgroundColor: prod.color_frasco || "#6B1F4A" }}
              />
              <span className="absolute bottom-0.5 right-1 text-[9px] font-bold text-slate-500/70">
                {idx + 1}
              </span>
            </div>
          ))}
        </div>

        {/* Subtítulo: {N} pasos · mañana/noche */}
        <p className="text-xs text-slate-500 font-light">
          {rutina.subtitulo || `${rutina.productos.length} pasos · mañana`}
        </p>
      </div>

      <div className="pt-4 border-t border-slate-100">
        <Link
          href="/cuenta/rutina"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B1F4A] hover:underline"
        >
          <span>Ver pasos y productos</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

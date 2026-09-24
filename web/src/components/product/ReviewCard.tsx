import React from "react";
import { Star, ShieldCheck } from "lucide-react";

export interface ReviewItem {
  id: number;
  calificacion: number;
  titulo: string;
  texto: string;
  autor: string;
  creado_en?: string;
  compraVerificada?: boolean;
}

interface ReviewCardProps {
  review: ReviewItem;
}

export default function ReviewCard({ review }: ReviewCardProps) {
  const { calificacion, titulo, texto, autor, compraVerificada = true } = review;

  return (
    <article className="bg-white rounded-3xl p-6 border border-slate-100 shadow-2xs flex flex-col justify-between h-full">
      <div>
        {/* Estrellas */}
        <div className="flex items-center text-amber-400 gap-0.5 mb-3" aria-label={`${calificacion} de 5 estrellas`}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-3.5 h-3.5 ${
                star <= calificacion
                  ? "fill-amber-400 text-amber-400"
                  : "fill-slate-100 text-slate-300"
              }`}
            />
          ))}
        </div>

        {/* Título en negritas */}
        <h3 className="font-semibold text-sm text-slate-900 leading-snug mb-2">
          {titulo}
        </h3>

        {/* Texto de la reseña */}
        <p className="text-xs text-slate-600 font-light leading-relaxed mb-4">
          {texto}
        </p>
      </div>

      {/* Pie: Autor y Badge Compra Verificada */}
      <div className="flex items-center gap-1.5 pt-3 border-t border-slate-50 text-[11px] text-slate-500 font-light">
        <span className="font-medium text-slate-700">{autor}</span>
        {compraVerificada && (
          <span className="inline-flex items-center gap-1 text-emerald-700 font-normal">
            <span>·</span>
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Compra verificada</span>
          </span>
        )}
      </div>
    </article>
  );
}

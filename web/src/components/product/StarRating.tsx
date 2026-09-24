"use client";

import React from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  promedio: number;
  totalResenas: number;
  showLink?: boolean;
}

export default function StarRating({
  promedio,
  totalResenas,
  showLink = true,
}: StarRatingProps) {
  const roundedPromedio = Math.round(promedio * 10) / 10;

  return (
    <div className="flex items-center gap-2" aria-label={`${roundedPromedio} de 5 estrellas`}>
      {/* 5 Estrellas */}
      <div className="flex items-center text-amber-400" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= Math.round(promedio);
          return (
            <Star
              key={star}
              className={`w-4 h-4 ${
                isFilled
                  ? "fill-amber-400 text-amber-400"
                  : "fill-slate-100 text-slate-300"
              }`}
            />
          );
        })}
      </div>

      {/* Promedio y Total de Reseñas */}
      {totalResenas > 0 ? (
        showLink ? (
          <a
            href="#resenas"
            className="text-xs text-slate-600 hover:text-[#6B1F4A] hover:underline underline-offset-2 transition-colors font-light"
          >
            <span className="font-semibold text-slate-800">{roundedPromedio}</span> · {totalResenas}{" "}
            {totalResenas === 1 ? "reseña" : "reseñas"}
          </a>
        ) : (
          <span className="text-xs text-slate-600 font-light">
            <span className="font-semibold text-slate-800">{roundedPromedio}</span> · {totalResenas}{" "}
            {totalResenas === 1 ? "reseña" : "reseñas"}
          </span>
        )
      ) : (
        <span className="text-xs text-slate-400 font-light">Sin reseñas todavía</span>
      )}
    </div>
  );
}

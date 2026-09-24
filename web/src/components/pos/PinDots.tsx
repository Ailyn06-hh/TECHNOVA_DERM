"use client";

import React from "react";

interface PinDotsProps {
  pinLength: number;
  totalDigits?: number;
  isError?: boolean;
}

export default function PinDots({
  pinLength,
  totalDigits = 4,
  isError = false,
}: PinDotsProps) {
  const dots = Array.from({ length: totalDigits });

  return (
    <div className="flex flex-col items-center">
      {/* Indicador sonoro para lectores de pantalla */}
      <span className="sr-only" aria-live="polite">
        {pinLength === 0
          ? "Sin dígitos ingresados"
          : `${pinLength} de ${totalDigits} dígitos ingresados`}
      </span>

      <div
        className={`flex items-center justify-center gap-3.5 my-3 transition-transform duration-300 ${
          isError ? "animate-[pos-shake_0.4s_ease-in-out]" : ""
        }`}
      >
        <style jsx>{`
          @keyframes pos-shake {
            0%,
            100% {
              transform: translateX(0);
            }
            20%,
            60% {
              transform: translateX(-8px);
            }
            40%,
            80% {
              transform: translateX(8px);
            }
          }
        `}</style>

        {dots.map((_, index) => {
          const isFilled = index < pinLength;

          return (
            <div
              key={index}
              className={`w-4 h-4 rounded-full transition-all duration-200 ${
                isError
                  ? "bg-rose-500 border-rose-500 scale-105"
                  : isFilled
                  ? "bg-[#1A1715] scale-105"
                  : "bg-transparent border-2 border-stone-300"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}

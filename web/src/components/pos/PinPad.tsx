"use client";

import React from "react";
import { Delete, LogIn, Loader2 } from "lucide-react";

interface PinPadProps {
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
  disabled?: boolean;
  isLoading?: boolean;
}

export default function PinPad({
  onDigit,
  onDelete,
  onSubmit,
  canSubmit,
  disabled = false,
  isLoading = false,
}: PinPadProps) {
  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <div className="grid grid-cols-3 gap-2.5 sm:gap-3 w-full max-w-xs mx-auto">
      {/* Botones 1 al 9 */}
      {digits.map((d) => (
        <button
          key={d}
          type="button"
          disabled={disabled || isLoading}
          onClick={() => onDigit(d)}
          aria-label={`Dígito ${d}`}
          className="h-14 sm:h-15 rounded-2xl bg-white border border-stone-200/90 text-stone-900 font-serif text-2xl font-medium shadow-2xs hover:bg-stone-50 hover:border-stone-300 active:scale-95 transition-all flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
        >
          {d}
        </button>
      ))}

      {/* Botón Borrar */}
      <button
        type="button"
        disabled={disabled || isLoading}
        onClick={onDelete}
        aria-label="Borrar último dígito"
        className="h-14 sm:h-15 rounded-2xl bg-stone-50 border border-stone-200/90 text-stone-600 font-medium text-xs sm:text-sm shadow-2xs hover:bg-stone-100 hover:text-stone-900 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
      >
        <Delete className="w-4 h-4 stroke-[1.8]" />
        <span>Borrar</span>
      </button>

      {/* Botón 0 */}
      <button
        type="button"
        disabled={disabled || isLoading}
        onClick={() => onDigit("0")}
        aria-label="Dígito 0"
        className="h-14 sm:h-15 rounded-2xl bg-white border border-stone-200/90 text-stone-900 font-serif text-2xl font-medium shadow-2xs hover:bg-stone-50 hover:border-stone-300 active:scale-95 transition-all flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
      >
        0
      </button>

      {/* Botón Entrar (fondo vino, texto blanco) */}
      <button
        type="button"
        disabled={disabled || !canSubmit || isLoading}
        onClick={onSubmit}
        aria-label="Iniciar turno"
        className="h-14 sm:h-15 rounded-2xl bg-[#5B122C] text-white font-medium text-xs sm:text-sm shadow-xs hover:bg-[#480E23] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <LogIn className="w-4 h-4 stroke-[2]" />
            <span>Entrar</span>
          </>
        )}
      </button>
    </div>
  );
}

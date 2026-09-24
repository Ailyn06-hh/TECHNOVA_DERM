"use client";

import React, { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

interface HelpSearchBarProps {
  value: string;
  onChange: (val: string) => void;
  onClear: () => void;
  placeholder?: string;
}

export default function HelpSearchBar({
  value,
  onChange,
  onClear,
  placeholder = "Busca: envíos, devoluciones, factura…",
}: HelpSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Atajo de teclado: Escape limpia la búsqueda
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && value) {
        onClear();
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [value, onClear]);

  return (
    <div className="relative w-full">
      <div className="absolute inset-y-0 left-0 pl-4 sm:pl-5 flex items-center pointer-events-none text-stone-400">
        <Search className="w-5 h-5" />
      </div>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Buscar en centro de ayuda"
        className="w-full pl-12 sm:pl-13 pr-10 sm:pr-12 py-3.5 sm:py-4 bg-white border border-stone-200 rounded-2xl sm:rounded-3xl shadow-xs text-sm sm:text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#5B122C]/20 focus:border-[#5B122C] transition-all"
      />

      {value && (
        <button
          type="button"
          onClick={() => {
            onClear();
            inputRef.current?.focus();
          }}
          className="absolute inset-y-0 right-0 pr-4 sm:pr-5 flex items-center text-stone-400 hover:text-stone-700 cursor-pointer"
          aria-label="Limpiar búsqueda"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

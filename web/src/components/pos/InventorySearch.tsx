"use client";

import React, { useRef, useEffect } from "react";
import { Search, Scan, X } from "lucide-react";

interface InventorySearchProps {
  value: string;
  onChange: (val: string) => void;
  onClear: () => void;
  placeholder?: string;
}

export default function InventorySearch({
  value,
  onChange,
  onClear,
  placeholder = "Buscar por nombre, SKU o código de barras (F2)",
}: InventorySearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Atajo de teclado F2 para enfocar el buscador
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="relative flex-1 max-w-md">
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
        <Search className="w-4 h-4" />
      </div>

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Buscar producto en inventario por nombre, SKU o código de barras"
        className="w-full pl-10 pr-20 py-2.5 bg-white border border-stone-200/90 rounded-2xl text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#5B122C]/20 focus:border-[#5B122C] transition-all shadow-2xs font-light"
      />

      <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1.5">
        {value ? (
          <button
            type="button"
            onClick={onClear}
            className="p-1 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100 transition-colors"
            title="Limpiar búsqueda"
            aria-label="Limpiar búsqueda"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}

        <div
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-stone-100/80 text-[10px] font-mono text-stone-500 border border-stone-200/80"
          title="Escáner listo / Presiona F2"
        >
          <Scan className="w-3 h-3 text-stone-600" />
          <span className="hidden sm:inline">F2</span>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useRef, useEffect } from "react";
import { Search, X } from "lucide-react";

interface PickupSearchProps {
  value: string;
  onChange: (val: string) => void;
  onClear?: () => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export default function PickupSearch({
  value,
  onChange,
  onClear,
  inputRef,
}: PickupSearchProps) {
  const localRef = useRef<HTMLInputElement>(null);
  const ref = inputRef || localRef;

  return (
    <div className="relative w-full max-w-xs">
      <label htmlFor="pickup-search-input" className="sr-only">
        Buscar por código o nombre
      </label>
      <div className="relative flex items-center">
        <input
          id="pickup-search-input"
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Código o nombre"
          autoComplete="off"
          className="w-full bg-white text-stone-900 placeholder-stone-400 text-sm pl-4 pr-10 py-2.5 rounded-2xl border border-stone-200/90 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-[#8B2844]/30 focus:border-[#8B2844] transition-all"
        />
        {value ? (
          <button
            type="button"
            onClick={() => {
              onChange("");
              if (onClear) onClear();
              ref.current?.focus();
            }}
            aria-label="Limpiar búsqueda"
            className="absolute right-3 p-1 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <div className="absolute right-3.5 pointer-events-none text-stone-400">
            <Search className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  );
}

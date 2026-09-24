"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface SortOption {
  id: string;
  label: string;
}

export const SORT_OPTIONS: SortOption[] = [
  { id: "mas_vendidos", label: "Más vendidos" },
  { id: "recomendados", label: "Recomendados para ti" },
  { id: "precio_asc", label: "Precio: menor a mayor" },
  { id: "precio_desc", label: "Precio: mayor a menor" },
  { id: "novedades", label: "Novedades" },
];

interface SortMenuProps {
  currentSort: string;
  onSelectSort: (id: string) => void;
}

export default function SortMenu({ currentSort, onSelectSort }: SortMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption =
    SORT_OPTIONS.find((opt) => opt.id === currentSort) || SORT_OPTIONS[0];

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setIsOpen(true);
        setFocusedIndex(SORT_OPTIONS.findIndex((o) => o.id === selectedOption.id));
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev < SORT_OPTIONS.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : SORT_OPTIONS.length - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < SORT_OPTIONS.length) {
        onSelectSort(SORT_OPTIONS[focusedIndex].id);
        setIsOpen(false);
      }
    }
  };

  return (
    <div ref={containerRef} className="relative inline-block text-left shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Ordenar productos, opción actual: ${selectedOption.label}`}
        className="inline-flex items-center justify-between gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-medium text-slate-800 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer min-w-[190px]"
      >
        <span className="truncate">
          <span className="text-slate-400 font-light mr-1">Ordenar:</span>
          {selectedOption.label}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-1.5 w-56 rounded-2xl bg-white border border-slate-100 shadow-lg py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100"
        >
          {SORT_OPTIONS.map((opt, idx) => {
            const isSelected = opt.id === selectedOption.id;
            const isFocused = idx === focusedIndex;

            return (
              <button
                key={opt.id}
                role="menuitemradio"
                aria-checked={isSelected}
                onClick={() => {
                  onSelectSort(opt.id);
                  setIsOpen(false);
                }}
                onMouseEnter={() => setFocusedIndex(idx)}
                className={`w-full text-left px-4 py-2 text-xs flex items-center justify-between transition-colors ${
                  isSelected
                    ? "text-[#6B1F4A] font-semibold bg-rose-50/60"
                    : isFocused
                    ? "text-slate-900 bg-slate-50"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-[#6B1F4A]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

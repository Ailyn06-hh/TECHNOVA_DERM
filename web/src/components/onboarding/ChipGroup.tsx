"use client";

import React, { useRef } from "react";
import { AlertCircle } from "lucide-react";

export interface ChipOption {
  id: string;
  label: string;
}

interface ChipGroupProps {
  id: string;
  label: string;
  options: readonly ChipOption[];
  mode: "single" | "multiple";
  value: string | string[]; // string si mode="single", string[] si mode="multiple"
  onChange: (value: any) => void;
  error?: string | null;
  disabled?: boolean;
}

export default function ChipGroup({
  id,
  label,
  options,
  mode,
  value,
  onChange,
  error = null,
  disabled = false,
}: ChipGroupProps) {
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const isSelected = (optId: string): boolean => {
    if (mode === "single") {
      return value === optId;
    }
    return Array.isArray(value) && value.includes(optId);
  };

  const handleSelect = (optId: string) => {
    if (disabled) return;

    if (mode === "single") {
      onChange(optId);
    } else {
      const currentList = Array.isArray(value) ? [...value] : [];
      const exists = currentList.includes(optId);
      if (exists) {
        onChange(currentList.filter((item) => item !== optId));
      } else {
        onChange([...currentList, optId]);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (mode !== "single") return;

    let targetIndex = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      targetIndex = (index + 1) % options.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      targetIndex = (index - 1 + options.length) % options.length;
    }

    if (targetIndex >= 0) {
      const targetOption = options[targetIndex];
      onChange(targetOption.id);
      itemRefs.current[targetIndex]?.focus();
    }
  };

  const labelId = `${id}-label`;
  const errorId = `${id}-error`;

  return (
    <div className="w-full">
      {/* Pregunta / Etiqueta del grupo */}
      <h3
        id={labelId}
        className={`text-sm sm:text-base font-semibold text-[#1A1715] mb-3 transition-colors ${
          error ? "text-rose-700" : ""
        }`}
      >
        {label}
      </h3>

      {/* Contenedor de Chips Píldora */}
      <div
        role={mode === "single" ? "radiogroup" : "group"}
        aria-labelledby={labelId}
        aria-describedby={error ? errorId : undefined}
        className="flex flex-wrap items-center gap-2.5 sm:gap-3"
      >
        {options.map((option, index) => {
          const selected = isSelected(option.id);

          return (
            <button
              key={option.id}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              type="button"
              role={mode === "single" ? "radio" : "button"}
              aria-checked={mode === "single" ? selected : undefined}
              aria-pressed={mode === "multiple" ? selected : undefined}
              tabIndex={mode === "single" ? (selected || (!value && index === 0) ? 0 : -1) : 0}
              disabled={disabled}
              onClick={() => handleSelect(option.id)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className={`py-2 px-5 sm:py-2.5 sm:px-6 rounded-full text-xs sm:text-sm font-medium transition-all shadow-2xs select-none focus:outline-none focus:ring-2 focus:ring-[#6B1F4A]/30 focus:ring-offset-1 ${
                selected
                  ? "bg-[#F3E1E4] border border-[#6B1F4A] text-[#6B1F4A] shadow-xs"
                  : "bg-white border border-gray-200/90 text-gray-800 hover:border-gray-400 hover:bg-gray-50/50"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Mensaje de error para el grupo */}
      {error && (
        <p
          id={errorId}
          role="alert"
          aria-live="polite"
          className="mt-2 text-[11px] sm:text-xs text-rose-600 flex items-center gap-1 font-light animate-fade-in"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

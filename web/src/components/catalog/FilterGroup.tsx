"use client";

import React from "react";
import { Check } from "lucide-react";

export interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

interface FilterGroupProps {
  title: string;
  options: FilterOption[];
  selectedValues: string[];
  onToggle: (id: string, label: string) => void;
  groupName: string;
}

export default function FilterGroup({
  title,
  options,
  selectedValues,
  onToggle,
  groupName,
}: FilterGroupProps) {
  return (
    <fieldset className="py-4 border-b border-slate-100 last:border-b-0">
      <legend className="text-xs font-semibold text-slate-800 tracking-wide uppercase mb-3">
        {title}
      </legend>
      
      <div className="space-y-2">
        {options.map((opt) => {
          const isChecked = selectedValues.includes(opt.id);
          const count = typeof opt.count === "number" ? opt.count : undefined;
          const isDisabled = count === 0 && !isChecked;

          return (
            <label
              key={opt.id}
              className={`flex items-center justify-between group cursor-pointer text-xs select-none transition-colors ${
                isDisabled
                  ? "opacity-35 cursor-not-allowed pointer-events-none"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Visual Checkbox fiel al mockup:
                    - Si está seleccionado: cuadrado redondeado en tono vino con palomita blanca.
                    - Si no está seleccionado: línea corta horizontal gris a la izquierda. */}
                <span className="relative flex items-center justify-center shrink-0 w-4 h-4">
                  {isChecked ? (
                    <span className="w-4 h-4 rounded-md bg-[#6B1F4A] flex items-center justify-center text-white shadow-xs transition-transform scale-100">
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    </span>
                  ) : (
                    <span className="w-2.5 h-[1.5px] bg-slate-300 group-hover:bg-slate-400 transition-colors" />
                  )}
                  <input
                    type="checkbox"
                    name={`${groupName}-${opt.id}`}
                    checked={isChecked}
                    disabled={isDisabled}
                    onChange={() => onToggle(opt.id, opt.label)}
                    className="sr-only"
                    aria-label={`${opt.label} (${count ?? 0} disponibles)`}
                  />
                </span>

                <span
                  className={`truncate leading-snug ${
                    isChecked ? "font-medium text-[#6B1F4A]" : "font-light"
                  }`}
                >
                  {opt.label}
                </span>
              </div>

              {count !== undefined && (
                <span className="text-[11px] text-slate-400 font-light ml-2 shrink-0">
                  {count}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

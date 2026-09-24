"use client";

import React from "react";
import { Minus, Plus } from "lucide-react";

interface QuantitySelectorProps {
  quantity: number;
  max: number;
  min?: number;
  onChange: (newQuantity: number) => void;
  disabled?: boolean;
  ariaLabel?: string;
}

export default function QuantitySelector({
  quantity,
  max,
  min = 1,
  onChange,
  disabled = false,
  ariaLabel,
}: QuantitySelectorProps) {
  const handleDecrement = () => {
    if (quantity > min && !disabled) {
      onChange(quantity - 1);
    }
  };

  const handleIncrement = () => {
    if (quantity < max && !disabled) {
      onChange(quantity + 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      if (val < min) onChange(min);
      else if (val > max) onChange(max);
      else onChange(val);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < min) {
      onChange(min);
    } else if (val > max) {
      onChange(max);
    }
  };

  return (
    <div
      role="group"
      aria-label="Selector de cantidad"
      className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-1 shadow-2xs"
    >
      <button
        type="button"
        onClick={handleDecrement}
        disabled={disabled || quantity <= min}
        aria-label="Disminuir cantidad"
        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>

      <input
        type="number"
        value={quantity}
        onChange={handleInputChange}
        onBlur={handleBlur}
        min={min}
        max={max}
        disabled={disabled}
        aria-label={ariaLabel || "Cantidad seleccionada"}
        className="w-10 text-center text-xs font-semibold text-slate-800 bg-transparent focus:outline-none [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-inner-spin-button]:appearance-none"
      />

      <button
        type="button"
        onClick={handleIncrement}
        disabled={disabled || quantity >= max}
        aria-label="Aumentar cantidad"
        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

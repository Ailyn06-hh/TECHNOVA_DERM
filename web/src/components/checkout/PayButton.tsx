"use client";

import React from "react";
import { Lock, Loader2 } from "lucide-react";
import { formatearPrecio } from "@/lib/formato";

export interface PayButtonProps {
  total: number;
  isPagarEnTienda: boolean;
  isProcessing: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export default function PayButton({
  total,
  isPagarEnTienda,
  isProcessing,
  disabled,
  onClick,
}: PayButtonProps) {
  const isDisabled = disabled || isProcessing;

  const label = isPagarEnTienda
    ? "Apartar pedido"
    : `Pagar ${formatearPrecio(total)}`;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={`w-full py-4 px-6 rounded-full text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-sm ${
        isDisabled
          ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
          : "bg-[#6B1F4A] hover:bg-[#531839] text-white hover:shadow-md active:scale-[0.98] cursor-pointer"
      }`}
    >
      {isProcessing ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Procesando pago...</span>
        </>
      ) : (
        <>
          <Lock className="w-4 h-4" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

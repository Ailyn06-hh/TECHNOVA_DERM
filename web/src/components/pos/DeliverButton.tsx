"use client";

import React from "react";
import { CheckCircle2, ShoppingBag, Loader2, ArrowRight } from "lucide-react";
import { formatearPrecio } from "@/lib/formato";

interface DeliverButtonProps {
  estado: string;
  total?: number;
  isCodeVerified?: boolean;
  allChecked?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export default function DeliverButton({
  estado,
  total = 0,
  isCodeVerified = false,
  allChecked = false,
  isLoading = false,
  disabled = false,
  onClick,
}: DeliverButtonProps) {
  let label = "Marcar como entregado";
  let isEnabled = false;
  let icon = <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />;

  if (estado === "pagado") {
    label = "Empezar a preparar";
    isEnabled = true;
    icon = <ArrowRight className="w-4 h-4 stroke-[2.5]" />;
  } else if (estado === "preparando") {
    label = "Marcar como listo";
    isEnabled = allChecked;
    icon = <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />;
  } else if (estado === "por_pagar_en_tienda") {
    label = `Cobrar ${formatearPrecio(total)} y entregar`;
    isEnabled = isCodeVerified;
    icon = <ShoppingBag className="w-4 h-4 stroke-[2.5]" />;
  } else if (estado === "listo_para_recoger") {
    label = "Marcar como entregado";
    isEnabled = isCodeVerified;
    icon = <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />;
  }

  const isDisabled = disabled || !isEnabled || isLoading;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-sm font-semibold transition-all shadow-xs ${
        isDisabled
          ? "bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed"
          : "bg-[#8B2844] text-white hover:bg-[#701c34] active:scale-[0.99] cursor-pointer"
      }`}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Procesando...</span>
        </>
      ) : (
        <>
          {icon}
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

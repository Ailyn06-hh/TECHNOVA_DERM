"use client";

import React from "react";
import { Banknote, CreditCard, Split, Building2, MessageSquare, Loader2 } from "lucide-react";

export type MetodoPagoPos = "efectivo" | "tarjeta_terminal" | "mixto" | "transferencia";

interface PaymentMethodSelectorProps {
  metodo: MetodoPagoPos;
  onSelectMetodo: (m: MetodoPagoPos) => void;
  sendWhatsApp: boolean;
  onToggleWhatsApp: (val: boolean) => void;
  total: number;
  onCobrar: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export default function PaymentMethodSelector({
  metodo,
  onSelectMetodo,
  sendWhatsApp,
  onToggleWhatsApp,
  total,
  onCobrar,
  disabled = false,
  isLoading = false,
}: PaymentMethodSelectorProps) {
  const options: { id: MetodoPagoPos; label: string; icon: React.ElementType }[] = [
    { id: "efectivo", label: "Efectivo", icon: Banknote },
    { id: "tarjeta_terminal", label: "Tarjeta", icon: CreditCard },
    { id: "transferencia", label: "Transferencia", icon: Building2 },
    { id: "mixto", label: "Mixto", icon: Split },
  ];

  return (
    <div className="space-y-3.5 pt-3">
      {/* Selector de Método de Pago con Radiogroup */}
      <div>
        <p className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-2">
          Método de pago
        </p>

        <div
          role="radiogroup"
          aria-label="Método de pago"
          className="grid grid-cols-2 sm:grid-cols-4 gap-2"
        >
          {options.map((opt) => {
            const isSelected = metodo === opt.id;
            const Icon = opt.icon;

            return (
              <button
                key={opt.id}
                role="radio"
                type="button"
                aria-checked={isSelected}
                onClick={() => onSelectMetodo(opt.id)}
                disabled={disabled}
                className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border text-xs font-semibold transition-all min-h-[52px] active:scale-95 cursor-pointer ${
                  isSelected
                    ? "border-[#5B122C] bg-[#FAF3F6] text-[#5B122C] ring-2 ring-[#5B122C]/10 shadow-xs"
                    : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50"
                }`}
              >
                <Icon className="w-4 h-4 mb-1" />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Opción Enviar ticket por WhatsApp */}
      <label className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-stone-50 border border-stone-200/80 cursor-pointer select-none text-xs text-stone-700 hover:bg-stone-100/70 transition-colors">
        <input
          type="checkbox"
          checked={sendWhatsApp}
          onChange={(e) => onToggleWhatsApp(e.target.checked)}
          disabled={disabled}
          className="rounded border-stone-300 text-[#5B122C] focus:ring-[#5B122C] w-4 h-4"
        />
        <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
        <span className="font-medium text-[11px] sm:text-xs">
          Enviar ticket por WhatsApp
        </span>
      </label>

      {/* Botón Vino Ancho "Cobrar ${total}" */}
      <button
        type="button"
        onClick={onCobrar}
        disabled={disabled || total <= 0 || isLoading}
        className="w-full py-4 rounded-2xl bg-[#5B122C] text-white font-serif text-lg font-medium shadow-md hover:bg-[#4A0E24] active:bg-[#3D0B1D] active:scale-[0.99] transition-all flex items-center justify-center gap-2 min-h-[56px] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Procesando...</span>
          </>
        ) : (
          <span>
            Cobrar ${total.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        )}
      </button>
    </div>
  );
}

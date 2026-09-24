"use client";

import React, { useState, useEffect, useRef } from "react";
import { Banknote, X, Check, AlertCircle, Loader2 } from "lucide-react";

interface CashPaymentModalProps {
  isOpen: boolean;
  total: number;
  onClose: () => void;
  onConfirm: (efectivoRecibido: number) => Promise<void>;
  isLoading?: boolean;
}

export default function CashPaymentModal({
  isOpen,
  total,
  onClose,
  onConfirm,
  isLoading = false,
}: CashPaymentModalProps) {
  const [recibido, setRecibido] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setRecibido(String(Math.ceil(total)));
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 80);
    }
  }, [isOpen, total]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isLoading]);

  if (!isOpen) return null;

  const recibidoNum = parseFloat(recibido) || 0;
  const cambio = Math.round((recibidoNum - total) * 100) / 100;
  const esValido = recibidoNum >= total;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!esValido || isLoading) return;
    await onConfirm(recibidoNum);
  };

  const handleQuickAdd = (monto: number) => {
    setRecibido(String(monto));
    inputRef.current?.focus();
  };

  const quickButtons = [
    { label: "Exacto", value: total },
    { label: "$200", value: 200 },
    { label: "$500", value: 500 },
    { label: "$1,000", value: 1000 },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cash-modal-title"
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-stone-200 animate-scale-in"
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 id="cash-modal-title" className="font-serif text-xl font-medium text-stone-900">
                Cobro en Efectivo
              </h3>
              <p className="text-xs text-stone-400 font-light">
                Ingresa el efectivo recibido para calcular el cambio
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Monto Total */}
        <div className="bg-stone-50 rounded-2xl p-4 text-center border border-stone-200/80 mb-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 block mb-1">
            Total a cobrar
          </span>
          <span className="font-serif text-3xl font-bold text-stone-900">
            ${total.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Campo Recibido */}
          <div>
            <label htmlFor="input-recibido" className="block text-xs font-semibold text-stone-700 mb-1.5">
              Efectivo recibido
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-stone-400 font-bold text-base">
                $
              </span>
              <input
                id="input-recibido"
                ref={inputRef}
                type="number"
                step="0.50"
                min={total}
                value={recibido}
                onChange={(e) => setRecibido(e.target.value)}
                disabled={isLoading}
                className="w-full pl-8 pr-4 py-3 rounded-2xl border border-stone-300 bg-white text-stone-900 text-lg font-bold outline-none focus:border-[#5B122C] focus:ring-2 focus:ring-[#5B122C]/10"
              />
            </div>
          </div>

          {/* Botones rápidos */}
          <div className="grid grid-cols-4 gap-2">
            {quickButtons.map((btn) => (
              <button
                key={btn.label}
                type="button"
                onClick={() => handleQuickAdd(btn.value)}
                disabled={isLoading}
                className="py-2.5 px-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 active:bg-stone-100 text-xs font-semibold text-stone-800 transition min-h-[44px]"
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* Cambio en Grande */}
          <div
            className={`p-4 rounded-2xl text-center border transition-all ${
              esValido
                ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                : "bg-rose-50/70 border-rose-200 text-rose-900"
            }`}
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider block mb-0.5">
              {esValido ? "Cambio a entregar" : "Monto insuficiente"}
            </span>

            {esValido ? (
              <span className="font-serif text-3xl font-extrabold text-emerald-800 block">
                ${cambio.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            ) : (
              <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-rose-700 mt-1">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Faltan ${(total - recibidoNum).toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Botón de Confirmación */}
          <button
            type="submit"
            disabled={!esValido || isLoading}
            className="w-full py-4 rounded-2xl bg-[#5B122C] text-white font-serif text-base font-semibold shadow-md hover:bg-[#4A0E24] active:bg-[#3D0B1D] transition-all flex items-center justify-center gap-2 min-h-[54px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Registrando cobro...</span>
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                <span>Confirmar cobro en efectivo</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

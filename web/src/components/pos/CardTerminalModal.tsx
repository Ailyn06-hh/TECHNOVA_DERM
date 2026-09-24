"use client";

import React, { useState, useEffect } from "react";
import { CreditCard, X, Check, Loader2, ShieldCheck } from "lucide-react";

interface CardTerminalModalProps {
  isOpen: boolean;
  total: number;
  onClose: () => void;
  onConfirm: (autorizacion: string) => Promise<void>;
  isLoading?: boolean;
}

export default function CardTerminalModal({
  isOpen,
  total,
  onClose,
  onConfirm,
  isLoading = false,
}: CardTerminalModalProps) {
  const [autorizacion, setAutorizacion] = useState("");

  useEffect(() => {
    if (isOpen) {
      setAutorizacion("");
    }
  }, [isOpen]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    await onConfirm(autorizacion.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-modal-title"
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-stone-200 animate-scale-in"
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 id="card-modal-title" className="font-serif text-xl font-medium text-stone-900">
                Cobro con Tarjeta
              </h3>
              <p className="text-xs text-stone-400 font-light">
                Terminal bancaria en mostrador
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

        {/* Instrucción y Total */}
        <div className="bg-stone-50 rounded-2xl p-5 text-center border border-stone-200/80 mb-5">
          <p className="text-xs text-stone-500 font-medium mb-1">
            Cobra el siguiente monto en la terminal física:
          </p>
          <span className="font-serif text-3xl font-bold text-stone-900 block my-1">
            ${total.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <p className="text-[11px] text-stone-400 font-light mt-1 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Modo simulado / terminal integrada</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Campo opcional de autorización */}
          <div>
            <label
              htmlFor="input-auth"
              className="block text-xs font-semibold text-stone-700 mb-1"
            >
              Número de autorización / Voucher (opcional)
            </label>
            <input
              id="input-auth"
              type="text"
              maxLength={20}
              value={autorizacion}
              onChange={(e) => setAutorizacion(e.target.value)}
              disabled={isLoading}
              placeholder="Ej. AUT-89421"
              className="w-full px-4 py-3 rounded-2xl border border-stone-300 bg-white text-stone-900 text-sm font-medium outline-none focus:border-[#5B122C] focus:ring-2 focus:ring-[#5B122C]/10"
            />
          </div>

          {/* TODO: Integración con terminal física vía webhook o USB */}
          <p className="text-[10px] text-stone-400 text-center font-light">
            TODO: Conexión SDK directa con terminal física inteligente (Clip/Mercado Pago Point).
          </p>

          {/* Botón de Confirmación */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 rounded-2xl bg-[#5B122C] text-white font-serif text-base font-semibold shadow-md hover:bg-[#4A0E24] active:bg-[#3D0B1D] transition-all flex items-center justify-center gap-2 min-h-[54px] cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Registrando cobro...</span>
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                <span>Pago aprobado</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

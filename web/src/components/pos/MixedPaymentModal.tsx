"use client";

import React, { useState, useEffect } from "react";
import { Split, Banknote, CreditCard, X, Check, Loader2, AlertCircle } from "lucide-react";

interface MixedPaymentModalProps {
  isOpen: boolean;
  total: number;
  onClose: () => void;
  onConfirm: (montoEfectivo: number, montoTarjeta: number, efectivoRecibido: number, autorizacion: string) => Promise<void>;
  isLoading?: boolean;
}

export default function MixedPaymentModal({
  isOpen,
  total,
  onClose,
  onConfirm,
  isLoading = false,
}: MixedPaymentModalProps) {
  const mitad = Math.round((total / 2) * 100) / 100;
  const [montoEfectivo, setMontoEfectivo] = useState<string>(String(mitad));
  const [efectivoRecibido, setEfectivoRecibido] = useState<string>(String(Math.ceil(mitad)));
  const [autorizacion, setAutorizacion] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      const half = Math.round((total / 2) * 100) / 100;
      setMontoEfectivo(String(half));
      setEfectivoRecibido(String(Math.ceil(half)));
      setAutorizacion("");
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

  const efecNum = parseFloat(montoEfectivo) || 0;
  const tarjNum = Math.max(0, Math.round((total - efecNum) * 100) / 100);
  const efecRecibidoNum = parseFloat(efectivoRecibido) || 0;

  const cambio = Math.max(0, Math.round((efecRecibidoNum - efecNum) * 100) / 100);
  const esValido = efecNum >= 0 && efecNum <= total && efecRecibidoNum >= efecNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!esValido || isLoading) return;
    await onConfirm(efecNum, tarjNum, efecRecibidoNum, autorizacion.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mixed-modal-title"
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-stone-200 animate-scale-in"
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Split className="w-5 h-5" />
            </div>
            <div>
              <h3 id="mixed-modal-title" className="font-serif text-xl font-medium text-stone-900">
                Pago Mixto
              </h3>
              <p className="text-xs text-stone-400 font-light">
                Combina pago en efectivo y tarjeta
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

        {/* Total a pagar */}
        <div className="bg-stone-50 rounded-2xl p-3.5 text-center border border-stone-200/80 mb-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 block mb-0.5">
            Total del ticket
          </span>
          <span className="font-serif text-2xl font-bold text-stone-900">
            ${total.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Parte en Efectivo */}
          <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-emerald-950 flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-emerald-700" />
                Monto en Efectivo
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-stone-500 font-medium mb-1">
                  A cobrar en efectivo
                </label>
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  max={total}
                  value={montoEfectivo}
                  onChange={(e) => {
                    setMontoEfectivo(e.target.value);
                    setEfectivoRecibido(e.target.value);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-bold text-sm text-stone-900 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] text-stone-500 font-medium mb-1">
                  Efectivo recibido
                </label>
                <input
                  type="number"
                  step="0.50"
                  min={efecNum}
                  value={efectivoRecibido}
                  onChange={(e) => setEfectivoRecibido(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-bold text-sm text-stone-900 outline-none"
                />
              </div>
            </div>

            {cambio > 0 && (
              <p className="text-[11px] text-emerald-800 font-semibold pt-1">
                Cambio en efectivo: <strong>${cambio.toFixed(2)}</strong>
              </p>
            )}
          </div>

          {/* Parte en Tarjeta */}
          <div className="p-3.5 rounded-2xl border border-indigo-200 bg-indigo-50/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-indigo-950 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-indigo-700" />
                Monto en Tarjeta (Restante)
              </span>
              <span className="font-bold text-sm text-indigo-900">
                ${tarjNum.toFixed(2)}
              </span>
            </div>

            <input
              type="text"
              placeholder="Autorización de terminal (opcional)"
              value={autorizacion}
              onChange={(e) => setAutorizacion(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-xs outline-none"
            />
          </div>

          {!esValido && (
            <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Verifica que el efectivo recibido cubra el monto asignado.</span>
            </div>
          )}

          {/* Botón de confirmación */}
          <button
            type="submit"
            disabled={!esValido || isLoading}
            className="w-full py-4 rounded-2xl bg-[#5B122C] text-white font-serif text-base font-semibold shadow-md hover:bg-[#4A0E24] active:bg-[#3D0B1D] transition-all flex items-center justify-center gap-2 min-h-[54px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Registrando cobro...</span>
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                <span>Confirmar cobro mixto</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

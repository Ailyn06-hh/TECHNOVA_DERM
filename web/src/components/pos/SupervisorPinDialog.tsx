"use client";

import React, { useState, useEffect } from "react";
import { ShieldAlert, X, Lock, Check, Delete, Loader2, AlertCircle } from "lucide-react";

interface SupervisorPinDialogProps {
  isOpen: boolean;
  diferencia: number;
  tolerancia: number;
  onClose: () => void;
  onAuthorize: (pin: string) => Promise<boolean>;
  isLoading?: boolean;
}

export default function SupervisorPinDialog({
  isOpen,
  diferencia,
  tolerancia,
  onClose,
  onAuthorize,
  isLoading = false,
}: SupervisorPinDialogProps) {
  const [pin, setPin] = useState("");
  const [errorLocal, setErrorLocal] = useState("");

  useEffect(() => {
    if (isOpen) {
      setPin("");
      setErrorLocal("");
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || isLoading) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (/^\d$/.test(e.key) && pin.length < 4) {
        setPin((prev) => prev + e.key);
        setErrorLocal("");
      } else if (e.key === "Backspace") {
        setPin((prev) => prev.slice(0, -1));
        setErrorLocal("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, pin, isLoading, onClose]);

  if (!isOpen) return null;

  const fmt = (n: number) =>
    `$${Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleDigitClick = (digit: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + digit);
      setErrorLocal("");
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorLocal("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4 || isLoading) return;

    const ok = await onAuthorize(pin);
    if (!ok) {
      setErrorLocal("El PIN de supervisora no es válido.");
      setPin("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sup-modal-title"
        className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border border-stone-200 animate-scale-in"
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 id="sup-modal-title" className="font-serif text-lg font-medium text-stone-900 leading-tight">
                Autorización de Supervisión
              </h3>
              <p className="text-[11px] text-stone-400 font-light">
                Diferencia fuera de tolerancia
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mensaje de diferencia */}
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 mb-4 text-xs text-amber-900">
          <p className="font-medium mb-1">
            Diferencia de arqueo: <span className="font-bold">{diferencia > 0 ? `+${fmt(diferencia)}` : fmt(diferencia)}</span>
          </p>
          <p className="text-[11px] text-amber-800/90 font-light leading-snug">
            La diferencia excede la tolerancia permitida (±{fmt(tolerancia)}).
            Se requiere el PIN de 4 dígitos de la supervisora de turno (ej. Sofía Castro).
          </p>
        </div>

        {errorLocal && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-medium mb-4">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorLocal}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Indicadores de PIN (4 bolitas) */}
          <div className="flex justify-center gap-3 py-2">
            {[0, 1, 2, 3].map((idx) => {
              const filled = idx < pin.length;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    filled
                      ? "border-[#5B122C] bg-[#5B122C] scale-110"
                      : "border-stone-300 bg-stone-100"
                  }`}
                />
              );
            })}
          </div>

          {/* Teclado numérico */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handleDigitClick(num)}
                disabled={isLoading}
                className="h-12 rounded-2xl bg-stone-50 hover:bg-stone-100 active:scale-95 text-stone-800 font-serif text-lg font-semibold border border-stone-200/60 transition-all cursor-pointer"
              >
                {num}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setPin("")}
              disabled={isLoading || pin.length === 0}
              className="h-12 rounded-2xl bg-stone-50 hover:bg-stone-100 active:scale-95 text-stone-500 text-xs font-semibold border border-stone-200/60 transition-all disabled:opacity-30 cursor-pointer"
            >
              Limpiar
            </button>

            <button
              type="button"
              onClick={() => handleDigitClick("0")}
              disabled={isLoading}
              className="h-12 rounded-2xl bg-stone-50 hover:bg-stone-100 active:scale-95 text-stone-800 font-serif text-lg font-semibold border border-stone-200/60 transition-all cursor-pointer"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleBackspace}
              disabled={isLoading || pin.length === 0}
              className="h-12 rounded-2xl bg-stone-50 hover:bg-stone-100 active:scale-95 text-stone-700 flex items-center justify-center border border-stone-200/60 transition-all disabled:opacity-30 cursor-pointer"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-3 rounded-2xl border border-stone-200 text-stone-700 font-medium text-xs hover:bg-stone-50 cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={pin.length !== 4 || isLoading}
              className="flex-1 py-3 rounded-2xl bg-[#5B122C] text-white font-serif text-sm font-semibold shadow-md hover:bg-[#4A0E24] active:bg-[#3D0B1D] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validando...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Autorizar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

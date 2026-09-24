"use client";

import React, { useState, useEffect } from "react";
import { Building2, X, Check, Loader2, ShieldCheck, AlertCircle } from "lucide-react";

interface TransferPaymentModalProps {
  isOpen: boolean;
  total: number;
  onClose: () => void;
  onConfirm: (referencia: string) => Promise<void>;
  isLoading?: boolean;
}

export default function TransferPaymentModal({
  isOpen,
  total,
  onClose,
  onConfirm,
  isLoading = false,
}: TransferPaymentModalProps) {
  const [referencia, setReferencia] = useState("");
  const [confirmadoBanco, setConfirmadoBanco] = useState(false);
  const [errorLocal, setErrorLocal] = useState("");

  useEffect(() => {
    if (isOpen) {
      setReferencia("");
      setConfirmadoBanco(false);
      setErrorLocal("");
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

  const refTrimmed = referencia.trim().toUpperCase();
  const esValido = refTrimmed.length >= 6 && refTrimmed.length <= 40 && confirmadoBanco;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (refTrimmed.length < 6 || refTrimmed.length > 40) {
      setErrorLocal("La clave de rastreo o referencia debe tener entre 6 y 40 caracteres.");
      return;
    }

    if (!confirmadoBanco) {
      setErrorLocal("Debes confirmar que los fondos están reflejados en la cuenta.");
      return;
    }

    setErrorLocal("");
    await onConfirm(refTrimmed);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="transfer-modal-title"
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-stone-200 animate-scale-in"
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-50 text-cyan-800 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 id="transfer-modal-title" className="font-serif text-xl font-medium text-stone-900">
                Cobro con Transferencia
              </h3>
              <p className="text-xs text-stone-400 font-light">
                Transferencia electrónica SPEI
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Monto a Cobrar */}
        <div className="bg-stone-50 rounded-2xl p-5 text-center border border-stone-200/80 mb-5">
          <p className="text-xs text-stone-500 font-medium mb-1">
            Monto a transferir:
          </p>
          <span className="font-serif text-3xl font-bold text-stone-900 block my-1">
            ${total.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <p className="text-[11px] text-stone-400 font-light mt-1 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-700" />
            <span>Verificación en tiempo real</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errorLocal && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorLocal}</span>
            </div>
          )}

          {/* Campo Obligatorio de Referencia */}
          <div>
            <label
              htmlFor="input-ref-transfer"
              className="block text-xs font-semibold text-stone-700 mb-1"
            >
              Clave de rastreo o referencia SPEI <span className="text-rose-600">*</span>
            </label>
            <input
              id="input-ref-transfer"
              type="text"
              maxLength={40}
              required
              value={referencia}
              onChange={(e) => {
                setReferencia(e.target.value);
                setErrorLocal("");
              }}
              disabled={isLoading}
              placeholder="Ej. TR-BBVA-984214 o rastreo CEP"
              className="w-full px-4 py-3 rounded-2xl border border-stone-300 bg-white text-stone-900 text-sm font-medium uppercase font-mono outline-none focus:border-[#5B122C] focus:ring-2 focus:ring-[#5B122C]/10"
            />
            <p className="text-[11px] text-stone-400 mt-1">
              Mínimo 6 caracteres alfanuméricos ({referencia.length}/40)
            </p>
          </div>

          {/* Checkbox de confirmación bancaria */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-stone-50 border border-stone-200/90 cursor-pointer select-none text-xs text-stone-700 hover:bg-stone-100/70 transition-colors">
            <input
              type="checkbox"
              checked={confirmadoBanco}
              onChange={(e) => {
                setConfirmadoBanco(e.target.checked);
                setErrorLocal("");
              }}
              disabled={isLoading}
              className="mt-0.5 rounded border-stone-300 text-[#5B122C] focus:ring-[#5B122C] w-4 h-4 cursor-pointer"
            />
            <span className="leading-snug font-medium">
              Confirmé que la transferencia se encuentra reflejada en la cuenta bancaria de la empresa.
            </span>
          </label>

          {/* Botón de Confirmación */}
          <button
            type="submit"
            disabled={isLoading || !esValido}
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
                <span>Confirmar transferencia</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

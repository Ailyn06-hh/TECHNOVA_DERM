"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { CreditCard, X, Loader2, AlertCircle, Shield } from "lucide-react";
import NewCardForm, { type NewCardData } from "@/components/checkout/NewCardForm";
import { NOMBRE_MARCA } from "@/lib/marca";

interface AddCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  showToast: (opts: { message: string; type: "success" | "error" | "info" }) => void;
}

export default function AddCardModal({
  isOpen,
  onClose,
  onSuccess,
  showToast,
}: AddCardModalProps) {
  const [cardData, setCardData] = useState<NewCardData | null>(null);
  const [predeterminada, setPredeterminada] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setCardData(null);
      setPredeterminada(true);
      setErrorMsg(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!cardData || !cardData.valida) {
      setErrorMsg("Completa los datos de la tarjeta válidamente antes de continuar.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/cuenta/tarjetas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: cardData.token,
          marca: cardData.marca,
          ultimos4: cardData.ultimos4,
          titular: cardData.titular,
          mesVencimiento: cardData.mesVencimiento,
          anioVencimiento: cardData.anioVencimiento,
          predeterminado: predeterminada,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.exito) {
        const errorText = data.error || "No se pudo guardar la tarjeta.";
        setErrorMsg(errorText);
        showToast({ message: errorText, type: "error" });
        return;
      }

      showToast({
        message: data.mensaje || "Tarjeta guardada correctamente.",
        type: "success",
      });

      await onSuccess();
      onClose();
    } catch (err: any) {
      console.error("[ADD CARD MODAL ERROR]:", err);
      setErrorMsg("Error de conexión al guardar la tarjeta.");
      showToast({ message: "Error al guardar tarjeta.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCardChange = useCallback((val: NewCardData | null) => {
    setCardData(val);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-card-modal-title"
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-stone-200 shadow-2xl relative overflow-y-auto max-h-[90vh]"
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FAF3F6] text-[#5B122C] flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="add-card-modal-title"
                className="font-serif text-lg sm:text-xl font-medium text-stone-900"
              >
                Agregar tarjeta
              </h2>
              <span className="text-xs text-stone-400 font-light block">
                Tokenizada de forma segura por la pasarela
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Componente seguro del proveedor (el mismo del checkout) */}
          <NewCardForm onChange={handleCardChange} />

          {/* Checkbox usar como predeterminada */}
          <div className="pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs text-stone-700">
              <input
                type="checkbox"
                checked={predeterminada}
                onChange={(e) => setPredeterminada(e.target.checked)}
                className="w-4 h-4 rounded-sm text-[#5B122C] accent-[#5B122C] border-stone-300 cursor-pointer"
              />
              <span className="font-normal select-none">
                Usar como tarjeta predeterminada
              </span>
            </label>
          </div>

          <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-full text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting || !cardData?.valida}
              className="px-6 py-2.5 rounded-full text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 active:scale-[0.98] transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Guardar tarjeta</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

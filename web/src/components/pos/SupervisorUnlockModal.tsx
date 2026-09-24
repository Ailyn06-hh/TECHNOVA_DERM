"use client";

import React, { useState } from "react";
import { X, ShieldAlert, KeyRound, Loader2, AlertCircle } from "lucide-react";
import PinPad from "./PinPad";

interface SupervisorUnlockModalProps {
  isOpen: boolean;
  folio: string;
  onClose: () => void;
  onSuccess: (supervisora: string) => void;
}

export default function SupervisorUnlockModal({
  isOpen,
  folio,
  onClose,
  onSuccess,
}: SupervisorUnlockModalProps) {
  const [pin, setPin] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDigit = (d: string) => {
    if (loading) return;
    if (pin.length < 4) {
      setPin((prev) => prev + d);
      setError(null);
    }
  };

  const handleBackspace = () => {
    if (loading) return;
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    if (loading) return;
    setPin("");
    setError(null);
  };

  const handleSubmit = async (pinToSubmit: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/pos/por-recoger/${folio}/desbloquear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinToSubmit }),
      });

      const data = await res.json();

      if (res.ok && data.exito) {
        onSuccess(data.supervisora || "Supervisora");
        onClose();
      } else {
        setError(data.error || "PIN de supervisora incorrecto.");
        setPin("");
      }
    } catch (err: any) {
      setError("Error de comunicación al autorizar desbloqueo.");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="supervisor-unlock-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in"
    >
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xl max-w-sm w-full p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2 text-amber-700">
            <ShieldAlert className="w-5 h-5" />
            <h3 id="supervisor-unlock-title" className="text-sm font-bold text-stone-900">
              Autorización de Supervisora
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-center space-y-1">
          <p className="text-xs text-stone-600 font-light leading-relaxed">
            Ingresa el PIN de supervisora para desbloquear el pedido{" "}
            <strong className="font-bold text-stone-900 font-mono">
              #{folio}
            </strong>{" "}
            y autorizar la entrega directa.
          </p>
        </div>

        {/* Indicador de PIN */}
        <div className="flex justify-center gap-2.5 py-2">
          {[0, 1, 2, 3].map((idx) => {
            const filled = idx < pin.length;
            return (
              <div
                key={idx}
                className={`w-3.5 h-3.5 rounded-full transition-all ${
                  filled
                    ? "bg-[#8B2844] scale-110"
                    : "border-2 border-stone-300 bg-white"
                }`}
              />
            );
          })}
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-center gap-1.5 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* PinPad */}
        <PinPad
          onDigit={handleDigit}
          onDelete={handleBackspace}
          onSubmit={() => handleSubmit(pin)}
          canSubmit={pin.length === 4}
          disabled={loading}
          isLoading={loading}
        />
      </div>
    </div>
  );
}

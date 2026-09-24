"use client";

import React, { useState, useEffect, useRef } from "react";
import { Check, AlertCircle, Lock, Loader2, KeyRound } from "lucide-react";

interface PickupCodeInputProps {
  folio: string;
  isVerified: boolean;
  isBlocked: boolean;
  onVerifiedSuccess: () => void;
  onSupervisorUnlockRequested: () => void;
  disabled?: boolean;
}

export default function PickupCodeInput({
  folio,
  isVerified,
  isBlocked,
  onVerifiedSuccess,
  onSupervisorUnlockRequested,
  disabled = false,
}: PickupCodeInputProps) {
  const [digits, setDigits] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(
    isVerified ? "El código coincide con el pedido." : null
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset local state when changing order
  useEffect(() => {
    setDigits("");
    setErrorMsg(null);
    if (isVerified) {
      setSuccessMsg("El código coincide con el pedido.");
    } else {
      setSuccessMsg(null);
    }
  }, [folio, isVerified]);

  const verifyCode = async (codeToVerify: string) => {
    if (codeToVerify.length !== 4) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/pos/por-recoger/${folio}/verificar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: codeToVerify }),
      });

      const data = await res.json();

      if (res.ok && data.exito) {
        setSuccessMsg("El código coincide con el pedido.");
        setErrorMsg(null);
        onVerifiedSuccess();
      } else {
        setSuccessMsg(null);
        setErrorMsg(data.error || "El código no coincide.");
        // Limpiar el campo para el siguiente intento
        setDigits("");
        setTimeout(() => {
          inputRef.current?.focus();
        }, 150);
      }
    } catch (err: any) {
      setErrorMsg("Error de conexión al verificar el código.");
      setDigits("");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || isVerified || isBlocked || loading) return;
    const cleanDigits = e.target.value.replace(/\D/g, "").slice(0, 4);
    setDigits(cleanDigits);

    if (cleanDigits.length === 4) {
      verifyCode(cleanDigits);
    }
  };

  const handleKeypadDigit = (d: string) => {
    if (disabled || isVerified || isBlocked || loading) return;
    if (digits.length >= 4) return;
    const newDigits = digits + d;
    setDigits(newDigits);

    if (newDigits.length === 4) {
      verifyCode(newDigits);
    }
  };

  const handleKeypadBackspace = () => {
    if (disabled || isVerified || isBlocked || loading) return;
    setDigits((prev) => prev.slice(0, -1));
  };

  return (
    <div className="space-y-3">
      <div>
        <label
          htmlFor="pickup-code-input"
          className="block text-xs font-semibold text-stone-700 mb-1"
        >
          Código de recogida que dicta la clienta
        </label>
        <p className="text-[11px] text-stone-400 font-light mb-2">
          Pídele a la clienta el código de 4 dígitos que recibió por correo o en la app.
        </p>

        <div className="relative">
          <input
            id="pickup-code-input"
            ref={inputRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={isVerified ? "••••" : digits}
            onChange={handleInputChange}
            disabled={disabled || isVerified || isBlocked || loading}
            placeholder="0000"
            className={`w-full text-center tracking-[0.5em] font-mono text-2xl font-bold py-3 px-4 rounded-2xl border transition-all ${
              isVerified
                ? "border-emerald-500 bg-emerald-50/50 text-emerald-800 ring-2 ring-emerald-500/20"
                : errorMsg
                ? "border-rose-500 bg-rose-50/30 text-rose-900 ring-2 ring-rose-500/20"
                : isBlocked
                ? "border-amber-400 bg-amber-50/50 text-amber-900"
                : "border-stone-200 bg-white text-stone-900 focus:border-[#8B2844] focus:ring-2 focus:ring-[#8B2844]/20"
            }`}
          />

          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            {loading && <Loader2 className="w-5 h-5 text-stone-400 animate-spin" />}
            {isVerified && (
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
            )}
            {isBlocked && (
              <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center">
                <Lock className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        </div>

        {/* Mensaje de estado accesible */}
        {isVerified && successMsg && (
          <div
            role="status"
            className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 rounded-xl"
          >
            <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && !isBlocked && (
          <div
            role="alert"
            className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200/80 px-3 py-1.5 rounded-xl"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isBlocked && (
          <div
            role="alert"
            className="p-3 mt-2 rounded-2xl bg-amber-50 border border-amber-200 space-y-2"
          >
            <div className="flex items-start gap-2 text-xs font-semibold text-amber-900">
              <Lock className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
              <span>Código bloqueado. Pide a una supervisora que autorice la entrega.</span>
            </div>
            <button
              type="button"
              onClick={onSupervisorUnlockRequested}
              className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Desbloquear con PIN de supervisora</span>
            </button>
          </div>
        )}
      </div>

      {/* Teclado numérico táctil (rápido para pantallas POS) */}
      {!isVerified && !isBlocked && (
        <div className="grid grid-cols-3 gap-1.5 max-w-[240px] mx-auto pt-1">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => handleKeypadDigit(n)}
              disabled={disabled || loading}
              className="h-10 rounded-xl bg-stone-100 hover:bg-stone-200/80 active:bg-stone-300 text-stone-800 text-sm font-semibold transition-colors flex items-center justify-center"
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setDigits("")}
            disabled={disabled || loading}
            className="h-10 rounded-xl bg-stone-100 hover:bg-stone-200/80 active:bg-stone-300 text-stone-500 text-xs font-medium transition-colors flex items-center justify-center"
          >
            C
          </button>
          <button
            type="button"
            onClick={() => handleKeypadDigit("0")}
            disabled={disabled || loading}
            className="h-10 rounded-xl bg-stone-100 hover:bg-stone-200/80 active:bg-stone-300 text-stone-800 text-sm font-semibold transition-colors flex items-center justify-center"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleKeypadBackspace}
            disabled={disabled || loading}
            className="h-10 rounded-xl bg-stone-100 hover:bg-stone-200/80 active:bg-stone-300 text-stone-500 text-xs font-medium transition-colors flex items-center justify-center"
          >
            ←
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Banknote, CreditCard, Split, Loader2, Check, AlertCircle } from "lucide-react";
import { formatearPrecio } from "@/lib/formato";
import type { MetodoPagoPos } from "./PaymentMethodSelector";

interface PickupPaymentModalProps {
  isOpen: boolean;
  folio: string;
  clientaNombre: string;
  total: number;
  onClose: () => void;
  onConfirmPayment: (paymentData: {
    metodoPago: MetodoPagoPos;
    efectivoRecibido?: number;
    cambio?: number;
    autorizacionTerminal?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export default function PickupPaymentModal({
  isOpen,
  folio,
  clientaNombre,
  total,
  onClose,
  onConfirmPayment,
  isLoading = false,
}: PickupPaymentModalProps) {
  const [metodo, setMetodo] = useState<MetodoPagoPos>("efectivo");
  const [recibido, setRecibido] = useState<string>("");
  const [autorizacion, setAutorizacion] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const inputEfectivoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setMetodo("efectivo");
      setRecibido(String(Math.ceil(total)));
      setAutorizacion(`AUTH-${Math.floor(100000 + Math.random() * 900000)}`);
      setError(null);
      setTimeout(() => {
        inputEfectivoRef.current?.focus();
        inputEfectivoRef.current?.select();
      }, 100);
    }
  }, [isOpen, total]);

  if (!isOpen) return null;

  const recibidoNum = parseFloat(recibido) || 0;
  const cambio = Math.max(0, Math.round((recibidoNum - total) * 100) / 100);
  const esEfectivoValido = recibidoNum >= total;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (metodo === "efectivo") {
      if (!esEfectivoValido) {
        setError(`El monto recibido debe ser al menos ${formatearPrecio(total)}`);
        return;
      }
      await onConfirmPayment({
        metodoPago: "efectivo",
        efectivoRecibido: recibidoNum,
        cambio,
      });
    } else if (metodo === "tarjeta_terminal") {
      await onConfirmPayment({
        metodoPago: "tarjeta_terminal",
        autorizacionTerminal: autorizacion || `AUTH-${Date.now().toString().slice(-6)}`,
      });
    } else if (metodo === "mixto") {
      // Mitad efectivo, mitad tarjeta por defecto
      const mitad = Math.round((total / 2) * 100) / 100;
      await onConfirmPayment({
        metodoPago: "mixto",
        efectivoRecibido: mitad,
        cambio: 0,
        autorizacionTerminal: autorizacion || `AUTH-MIX-${Date.now().toString().slice(-6)}`,
      });
    }
  };

  const handleQuickAdd = (monto: number) => {
    setRecibido(String(monto));
    setError(null);
  };

  const billetes = [total, 100, 200, 500, 1000]
    .filter((b) => b >= total)
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => a - b)
    .slice(0, 4);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pickup-payment-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs animate-in fade-in"
    >
      <div className="bg-white rounded-3xl border border-stone-200 shadow-xl max-w-md w-full p-6 space-y-5">
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Cobrar y entregar pedido
            </span>
            <h3 id="pickup-payment-title" className="text-base font-bold text-stone-900">
              #{folio} · {clientaNombre}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen Total */}
        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-center justify-between">
          <span className="text-xs font-medium text-stone-600">Total a pagar:</span>
          <span className="text-2xl font-bold font-mono text-stone-900">
            {formatearPrecio(total)}
          </span>
        </div>

        {/* Selector de Método */}
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setMetodo("efectivo")}
            className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
              metodo === "efectivo"
                ? "bg-[#8B2844] text-white border-[#8B2844] shadow-xs"
                : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
            }`}
          >
            <Banknote className="w-4 h-4" />
            <span>Efectivo</span>
          </button>

          <button
            type="button"
            onClick={() => setMetodo("tarjeta_terminal")}
            className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
              metodo === "tarjeta_terminal"
                ? "bg-[#8B2844] text-white border-[#8B2844] shadow-xs"
                : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Terminal</span>
          </button>

          <button
            type="button"
            onClick={() => setMetodo("mixto")}
            className={`p-3 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
              metodo === "mixto"
                ? "bg-[#8B2844] text-white border-[#8B2844] shadow-xs"
                : "bg-white text-stone-700 border-stone-200 hover:bg-stone-50"
            }`}
          >
            <Split className="w-4 h-4" />
            <span>Mixto</span>
          </button>
        </div>

        {/* Formulario según método */}
        {metodo === "efectivo" && (
          <div className="space-y-3">
            <div>
              <label
                htmlFor="pickup-efectivo-input"
                className="block text-xs font-medium text-stone-600 mb-1"
              >
                Efectivo recibido
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-stone-400">
                  $
                </span>
                <input
                  id="pickup-efectivo-input"
                  ref={inputEfectivoRef}
                  type="number"
                  step="any"
                  value={recibido}
                  onChange={(e) => {
                    setRecibido(e.target.value);
                    setError(null);
                  }}
                  className="w-full pl-8 pr-4 py-3 rounded-2xl border border-stone-200 text-lg font-bold font-mono text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-[#8B2844]/30 focus:border-[#8B2844]"
                />
              </div>
            </div>

            {/* Billetes rápidos */}
            <div className="flex gap-2">
              {billetes.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => handleQuickAdd(b)}
                  className="flex-1 py-1.5 px-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-mono font-medium transition-colors"
                >
                  ${Math.ceil(b)}
                </button>
              ))}
            </div>

            {/* Cálculo de cambio */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-center justify-between text-xs">
              <span className="font-medium text-emerald-800">Cambio a entregar:</span>
              <span className="font-bold text-base font-mono text-emerald-900">
                {formatearPrecio(cambio)}
              </span>
            </div>
          </div>
        )}

        {metodo === "tarjeta_terminal" && (
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-center space-y-1">
              <p className="text-xs font-semibold text-blue-900">
                Inserta o acerca la tarjeta en la terminal física
              </p>
              <p className="text-[11px] text-blue-700 font-light">
                Espera a que la terminal apruebe el cobro de {formatearPrecio(total)}.
              </p>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-stone-500 mb-1">
                No. Autorización de la terminal
              </label>
              <input
                type="text"
                value={autorizacion}
                onChange={(e) => setAutorizacion(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-mono text-stone-800 focus:outline-hidden focus:ring-2 focus:ring-[#8B2844]/20"
              />
            </div>
          </div>
        )}

        {metodo === "mixto" && (
          <div className="space-y-2 text-xs text-stone-600 bg-stone-50 p-3.5 rounded-2xl border border-stone-200">
            <p className="font-medium">Cobro dividido al 50%:</p>
            <p className="text-[11px] text-stone-500 font-light">
              • Efectivo: <strong>{formatearPrecio(total / 2)}</strong>
              <br />
              • Tarjeta: <strong>{formatearPrecio(total / 2)}</strong> (Terminal)
            </p>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-center gap-1.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Botón de Confirmación */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading || (metodo === "efectivo" && !esEfectivoValido)}
          className={`w-full py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
            isLoading || (metodo === "efectivo" && !esEfectivoValido)
              ? "bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed"
              : "bg-[#8B2844] hover:bg-[#701c34] text-white shadow-xs cursor-pointer active:scale-[0.99]"
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Registrando cobro y entregando...</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Confirmar cobro y entregar</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight, Loader2, AlertCircle, Sparkles, CheckCircle2 } from "lucide-react";
import { formatearPrecio } from "@/lib/formato";
import type { CarritoCalculado } from "@/lib/carrito";

export interface CartSummaryProps {
  carrito: CarritoCalculado;
  isLoggedIn: boolean;
  onRefresh?: () => void;
  onAnnounce?: (msg: string) => void;
}

export default function CartSummary({
  carrito,
  isLoggedIn,
  onRefresh,
  onAnnounce,
}: CartSummaryProps) {
  const router = useRouter();
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const {
    totalItems,
    subtotal,
    totalDescuentos,
    lineasDescuento,
    costoEnvioTexto,
    tieneEnvioGratis,
    faltaParaEnvioGratis,
    total,
    hayAgotados,
    hayInsuficientes,
    tieneArticulos,
  } = carrito;

  const isCheckoutDisabled =
    !tieneArticulos || hayAgotados || hayInsuficientes || isValidating;

  const handleContinueToCheckout = async () => {
    if (isCheckoutDisabled) return;

    if (!isLoggedIn) {
      router.push("/login?volver=/carrito");
      return;
    }

    setIsValidating(true);
    setValidationError(null);

    try {
      const res = await fetch("/api/carrito/validar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok || !data.valido) {
        setValidationError(data.error || "No se pudo continuar al pago.");
        if (onAnnounce) {
          onAnnounce(data.error || "Error al validar carrito.");
        }
        if (onRefresh) {
          onRefresh();
        }
        return;
      }

      router.push(data.redirect || "/checkout");
    } catch {
      setValidationError("Error de conexión al validar el carrito.");
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <aside className="lg:sticky lg:top-24 bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-xs flex flex-col justify-between transition-all">
      <div>
        {/* Título Serif */}
        <h2 className="font-serif text-2xl font-medium text-slate-900 tracking-tight mb-5 pb-3 border-b border-slate-100">
          Resumen
        </h2>

        {/* Desglose de Precios */}
        <div className="space-y-3.5 text-xs sm:text-sm text-slate-600 mb-6">
          {/* Subtotal */}
          <div className="flex items-center justify-between">
            <span className="font-normal text-slate-600">
              Subtotal ({totalItems} {totalItems === 1 ? "producto" : "productos"})
            </span>
            <span className="font-medium text-slate-900">{formatearPrecio(subtotal)}</span>
          </div>

          {/* Líneas de descuento en vino con signo menos */}
          {lineasDescuento.map((linea, idx) => (
            <div
              key={`${linea.grupo_id}-${idx}`}
              className="flex items-center justify-between text-[#6B1F4A]"
            >
              <div className="flex items-center gap-1.5 min-w-0 pr-2">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate font-medium">{linea.nombre}</span>
              </div>
              <span className="font-semibold shrink-0">
                <span className="sr-only">Descuento de {formatearPrecio(linea.monto)}</span>
                <span aria-hidden="true">-{formatearPrecio(linea.monto)}</span>
              </span>
            </div>
          ))}

          {/* Envío */}
          <div className="flex items-center justify-between pt-1">
            <span className="font-normal text-slate-600">Envío</span>
            <span className="font-medium text-slate-500 italic text-xs">{costoEnvioTexto}</span>
          </div>

          {/* Texto discreto de Envío Gratis */}
          <div className="pt-1">
            {tieneEnvioGratis ? (
              <p className="text-[11px] text-emerald-700 font-medium flex items-center gap-1.5 bg-emerald-50/70 p-2 rounded-xl">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>¡Tienes envío gratis en tu orden!</span>
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 font-light bg-[#FAF9F6] p-2 rounded-xl">
                Te faltan <strong className="font-semibold text-slate-700">{formatearPrecio(faltaParaEnvioGratis)}</strong> para envío gratis.
              </p>
            )}
          </div>
        </div>

        {/* Separador y Total */}
        <div className="pt-4 border-t border-slate-100 mb-6">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-base font-medium text-slate-900">Total</span>
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {formatearPrecio(total)}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 block text-right">
            IVA incluido en todos los precios
          </span>
        </div>

        {/* Mensaje de error de validación o artículos con problemas */}
        {validationError && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{validationError}</span>
          </div>
        )}

        {hayAgotados && !validationError && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>Hay artículos agotados en tu carrito. Quítalos para poder continuar.</span>
          </div>
        )}

        {hayInsuficientes && !hayAgotados && !validationError && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>Uno o más artículos superan las existencias. Ajusta las cantidades para continuar.</span>
          </div>
        )}

        {/* Botón Vino Ancho: Continuar al Pago */}
        <button
          type="button"
          onClick={handleContinueToCheckout}
          disabled={isCheckoutDisabled}
          className={`w-full py-3.5 px-6 rounded-full text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-sm ${
            isCheckoutDisabled
              ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
              : "bg-[#6B1F4A] hover:bg-[#531839] text-white hover:shadow active:scale-[0.98]"
          }`}
        >
          {isValidating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verificando disponibilidad...</span>
            </>
          ) : (
            <>
              <span>Continuar al pago</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {/* Aviso de Candado: Se apartan al pagar */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-light mt-3 mb-6">
          <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Tus productos se apartan en cuanto pagas</span>
        </div>
      </div>

      {/* Enlace Centrado: Seguir Comprando */}
      <div className="text-center pt-2 border-t border-slate-100">
        <Link
          href="/catalogo"
          className="text-xs font-medium text-slate-600 hover:text-[#6B1F4A] hover:underline underline-offset-4 transition-colors"
        >
          Seguir comprando
        </Link>
      </div>
    </aside>
  );
}

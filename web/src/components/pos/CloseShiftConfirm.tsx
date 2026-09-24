"use client";

import React, { useState } from "react";
import { Lock, X, AlertTriangle, Check, Loader2, CheckCircle2 } from "lucide-react";

interface CloseShiftConfirmProps {
  isOpen: boolean;
  turnoId: number;
  cajaNombre: string;
  cajeraNombre: string;
  totalEsperado: number;
  totalContado: number;
  diferencia: number;
  horaSalida?: string | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

export default function CloseShiftConfirm({
  isOpen,
  turnoId,
  cajaNombre,
  cajeraNombre,
  totalEsperado,
  totalContado,
  diferencia,
  horaSalida = "18:00",
  onClose,
  onConfirm,
  isLoading = false,
}: CloseShiftConfirmProps) {
  const [confirmChecked, setConfirmChecked] = useState(false);

  if (!isOpen) return null;

  const fmt = (n: number) =>
    `$${Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Verificar si es cierre anticipado (> 30 minutos antes de horaSalida)
  let esCierreAnticipado = false;
  if (horaSalida) {
    const ahora = new Date();
    const [hh, mm] = horaSalida.split(":").map(Number);
    if (!isNaN(hh) && !isNaN(mm)) {
      const fechaSalida = new Date();
      fechaSalida.setHours(hh, mm, 0, 0);
      const diffMinutos = Math.round((fechaSalida.getTime() - ahora.getTime()) / (1000 * 60));
      if (diffMinutos > 30) {
        esCierreAnticipado = true;
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmChecked || isLoading) return;
    await onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="close-modal-title"
        className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-stone-200 animate-scale-in"
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-3.5 border-b border-stone-100 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FAF3F6] text-[#5B122C] flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 id="close-modal-title" className="font-serif text-lg font-medium text-stone-900 leading-tight">
                Confirmar Cierre de Turno
              </h3>
              <p className="text-xs text-stone-400 font-light">
                Turno #{turnoId} · {cajaNombre}
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

        {/* Advertencia de Cierre Anticipado */}
        {esCierreAnticipado && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 mb-4 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Cierre anticipado de turno</p>
              <p className="text-amber-800/90 font-light mt-0.5">
                Tu horario de salida programado es a las {horaSalida}. Faltan más de 30 minutos para concluir la jornada. Se registrará la hora de cierre en auditoría.
              </p>
            </div>
          </div>
        )}

        {/* Resumen de Valores */}
        <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80 mb-4 space-y-2 text-xs">
          <div className="flex justify-between text-stone-600">
            <span>Cajera en turno:</span>
            <span className="font-semibold text-stone-900">{cajeraNombre}</span>
          </div>

          <div className="flex justify-between text-stone-600">
            <span>Total esperado:</span>
            <span className="font-serif font-medium text-stone-900">{fmt(totalEsperado)}</span>
          </div>

          <div className="flex justify-between text-stone-600">
            <span>Total contado:</span>
            <span className="font-serif font-bold text-stone-900">{fmt(totalContado)}</span>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-stone-200/80">
            <span className="font-semibold text-stone-900">Diferencia final:</span>
            {diferencia === 0 ? (
              <span className="flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>$0.00 (Cuadrada)</span>
              </span>
            ) : (
              <span
                className={`font-bold px-2 py-0.5 rounded-lg ${
                  Math.abs(diferencia) <= 10
                    ? "text-amber-800 bg-amber-100/70"
                    : "text-rose-800 bg-rose-100/70"
                }`}
              >
                {diferencia > 0 ? `+${fmt(diferencia)}` : fmt(diferencia)}
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Checkbox de confirmación */}
          <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-stone-50 border border-stone-200/90 cursor-pointer select-none text-xs text-stone-700 hover:bg-stone-100/70 transition-colors">
            <input
              type="checkbox"
              checked={confirmChecked}
              onChange={(e) => setConfirmChecked(e.target.checked)}
              disabled={isLoading}
              className="mt-0.5 rounded border-stone-300 text-[#5B122C] focus:ring-[#5B122C] w-4 h-4 cursor-pointer"
            />
            <span className="leading-snug">
              Confirmo que he verificado físicamente los valores en caja. Al cerrar, esta terminal quedará libre para el siguiente turno.
            </span>
          </label>

          {/* Botones */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-3.5 rounded-2xl border border-stone-200 text-stone-700 font-medium text-xs hover:bg-stone-50 cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={!confirmChecked || isLoading}
              className="flex-2 py-3.5 rounded-2xl bg-[#5B122C] text-white font-serif text-sm font-semibold shadow-md hover:bg-[#4A0E24] active:bg-[#3D0B1D] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Cerrando turno...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Confirmar y Cerrar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

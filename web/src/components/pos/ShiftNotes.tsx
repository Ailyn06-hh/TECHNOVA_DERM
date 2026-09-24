"use client";

import React from "react";
import { FileText, AlertCircle } from "lucide-react";

interface ShiftNotesProps {
  notes: string;
  onChange: (val: string) => void;
  esObligatorio?: boolean;
  disabled?: boolean;
}

export default function ShiftNotes({
  notes,
  onChange,
  esObligatorio = false,
  disabled = false,
}: ShiftNotesProps) {
  return (
    <div className="bg-white rounded-3xl border border-stone-200/90 p-5 sm:p-6 shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-stone-500" />
          <h3 className="font-serif text-base font-medium text-stone-900">
            Notas del Turno
          </h3>
          {esObligatorio ? (
            <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
              Obligatorio por descuadre *
            </span>
          ) : (
            <span className="text-[11px] text-stone-400 font-light">
              (Opcional)
            </span>
          )}
        </div>

        <span className="text-[11px] text-stone-400 font-mono">
          {notes.length}/500
        </span>
      </div>

      <p className="text-xs text-stone-500 font-light mb-3">
        {esObligatorio
          ? "Describe el motivo de la diferencia en caja para registro de auditoría y gerencia."
          : "Registra observaciones operativas, incidencias con clientas o aclaraciones para gerencia."}
      </p>

      <textarea
        value={notes}
        onChange={(e) => onChange(e.target.value.slice(0, 500))}
        disabled={disabled}
        rows={3}
        placeholder={
          esObligatorio
            ? "Explica la causa del faltante o sobrante en caja..."
            : "Ej. Turno sin incidencias, entrega de cambio en monedas correcta..."
        }
        className={`w-full p-4 rounded-2xl border text-sm text-stone-800 outline-none transition-all placeholder:text-stone-300 resize-none font-light ${
          esObligatorio && notes.trim().length < 5
            ? "border-rose-300 focus:border-rose-500 bg-rose-50/20 focus:ring-2 focus:ring-rose-500/10"
            : "border-stone-200 focus:border-[#5B122C] bg-white focus:ring-2 focus:ring-[#5B122C]/10"
        }`}
      />

      {esObligatorio && notes.trim().length < 5 && (
        <p className="flex items-center gap-1.5 text-xs text-rose-600 mt-1.5 font-medium">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Ingresa al menos 5 caracteres justificando la diferencia.</span>
        </p>
      )}
    </div>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, Printer, ArrowLeft, Mail, ShieldCheck, FileCheck } from "lucide-react";
import { NOMBRE_MARCA } from "@/lib/marca";

export interface CorteCerradoData {
  corteId: number;
  turnoId: number;
  cerradoEn: string;
  sucursalNombre: string;
  cajaNombre: string;
  cajeraNombre: string;
  totalEsperado: number;
  totalContado: number;
  diferenciaTotal: number;
  enviadoA: string;
  autorizadoPor?: string | null;
  notas?: string | null;
}

interface ShiftClosedPanelProps {
  corte: CorteCerradoData;
  onPrint: () => void;
}

export default function ShiftClosedPanel({ corte, onPrint }: ShiftClosedPanelProps) {
  const fmt = (n: number) =>
    `$${Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const fechaCierreTexto = new Date(corte.cerradoEn).toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="max-w-xl mx-auto py-8 px-4 text-center animate-scale-in">
      {/* Icono de éxito */}
      <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto mb-4 shadow-sm ring-8 ring-emerald-50">
        <CheckCircle2 className="w-9 h-9" />
      </div>

      <h1 className="font-serif text-3xl font-medium text-stone-900 mb-2">
        Turno cerrado exitosamente
      </h1>
      <p className="text-sm text-stone-600 font-light mb-6 max-w-md mx-auto leading-relaxed">
        El arqueo de caja fue procesado correctamente y la terminal ha sido liberada para el siguiente turno.
      </p>

      {/* Tarjeta de detalles del corte */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm p-6 text-left mb-6 space-y-3.5 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div>
            <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider block">
              Comprobante de corte
            </span>
            <strong className="font-serif text-base text-stone-900">
              Corte Oficial #{corte.corteId} · Turno #{corte.turnoId}
            </strong>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold flex items-center gap-1 border border-emerald-200">
            <FileCheck className="w-3.5 h-3.5" />
            <span>Corte Final Z</span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-stone-600">
          <div>
            <span className="text-[11px] text-stone-400 block">Sucursal y caja</span>
            <span className="font-medium text-stone-900">
              {corte.sucursalNombre} · {corte.cajaNombre}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-stone-400 block">Cajera en turno</span>
            <span className="font-medium text-stone-900">{corte.cajeraNombre}</span>
          </div>

          <div>
            <span className="text-[11px] text-stone-400 block">Fecha y hora</span>
            <span className="font-medium text-stone-900">{fechaCierreTexto}</span>
          </div>

          <div>
            <span className="text-[11px] text-stone-400 block">Total valores contado</span>
            <span className="font-serif font-bold text-stone-900 text-sm">
              {fmt(corte.totalContado)}
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
          <span className="font-semibold text-stone-700">Diferencia de arqueo:</span>
          {corte.diferenciaTotal === 0 ? (
            <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
              $0.00 (Caja cuadrada)
            </span>
          ) : (
            <span
              className={`font-bold px-2.5 py-0.5 rounded-lg border ${
                Math.abs(corte.diferenciaTotal) <= 10
                  ? "text-amber-800 bg-amber-50 border-amber-200"
                  : "text-rose-800 bg-rose-50 border-rose-200"
              }`}
            >
              {corte.diferenciaTotal > 0
                ? `+${fmt(corte.diferenciaTotal)} (Sobrante)`
                : `${fmt(corte.diferenciaTotal)} (Faltante)`}
            </span>
          )}
        </div>

        {corte.autorizadoPor && (
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
            <span>Diferencia autorizada por <strong>{corte.autorizadoPor}</strong></span>
          </div>
        )}

        <div className="p-3 rounded-2xl bg-stone-50 border border-stone-200/70 text-stone-600 flex items-center gap-2.5">
          <Mail className="w-4 h-4 text-[#5B122C] shrink-0" />
          <span className="truncate">
            Reporte financiero enviado a <strong>{corte.enviadoA}</strong>
          </span>
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={onPrint}
          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#5B122C] text-white font-serif text-sm font-semibold shadow-md hover:bg-[#4A0E24] active:bg-[#3D0B1D] flex items-center justify-center gap-2 cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir Comprobante Oficial</span>
        </button>

        <Link
          href="/pos"
          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl border border-stone-300 bg-white text-stone-700 font-serif text-sm font-medium hover:bg-stone-50 flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Inicio de Turno</span>
        </Link>
      </div>
    </div>
  );
}

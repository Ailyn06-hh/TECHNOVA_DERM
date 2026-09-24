"use client";

import React, { useState } from "react";
import { Layers, ChevronDown, ChevronUp, Clock, Sparkles } from "lucide-react";

export interface LoteItemData {
  id: number;
  codigo: string;
  caducaEn: string;
  caducaTexto: string;
  diasParaCaducar: number;
  esPorCaducar?: boolean;
  existencias: number;
  esPrimeroEnSalir?: boolean;
}

interface LotListProps {
  lotes: LoteItemData[];
}

export default function LotList({ lotes }: LotListProps) {
  const [expandido, setExpandido] = useState<boolean>(true);

  if (!lotes || lotes.length === 0) {
    return (
      <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 text-stone-500 text-xs text-center font-light">
        Sin lotes registrados para esta sucursal.
      </div>
    );
  }

  const totalLotes = lotes.length;
  const totalPiezas = lotes.reduce((acc, l) => acc + l.existencias, 0);

  return (
    <div className="rounded-2xl bg-white border border-stone-200/90 shadow-2xs overflow-hidden">
      {/* Encabezado colapsable */}
      <button
        type="button"
        onClick={() => setExpandido(!expandido)}
        className="w-full px-4 py-3 bg-stone-50/70 hover:bg-stone-100/70 border-b border-stone-200/70 flex items-center justify-between transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-stone-600" />
          <span className="text-xs font-semibold text-stone-900">
            Desglose de Lotes ({totalLotes})
          </span>
          <span className="text-[11px] text-stone-500 font-light">
            · {totalPiezas} piezas en stock
          </span>
        </div>

        <div className="text-stone-400">
          {expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Lista de lotes */}
      {expandido && (
        <div className="p-3 divide-y divide-stone-100 space-y-2">
          {lotes.map((lote, index) => {
            const esPrimero = index === 0 || lote.esPrimeroEnSalir;
            const esPorCaducar = lote.esPorCaducar || lote.diasParaCaducar <= 90;

            return (
              <div
                key={lote.id || lote.codigo}
                className={`pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs ${
                  esPrimero ? "bg-amber-50/40 -mx-1 px-2 py-1.5 rounded-xl border border-amber-200/50" : ""
                }`}
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono font-semibold text-stone-900">
                      {lote.codigo}
                    </span>

                    {esPrimero && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#2A2320] text-white">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>FEFO: 1° en salir</span>
                      </span>
                    )}

                    {esPorCaducar && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-100 text-orange-800">
                        <Clock className="w-2.5 h-2.5" />
                        <span>Por caducar</span>
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-stone-500 font-light">
                    Caduca: {lote.caducaTexto}{" "}
                    <span className="text-stone-400">
                      ({lote.diasParaCaducar > 0 ? `en ${lote.diasParaCaducar} días` : "vencido"})
                    </span>
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-bold text-stone-900 text-sm">
                    {lote.existencias}
                  </span>
                  <span className="text-[10px] text-stone-400 block font-light">
                    {lote.existencias === 1 ? "pieza" : "piezas"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

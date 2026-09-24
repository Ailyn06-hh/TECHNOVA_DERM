"use client";

import React, { useState, useEffect } from "react";
import { Banknote, Coins, X, Check, RefreshCw, Calculator } from "lucide-react";

export interface DenominationItem {
  id: string;
  tipo: "billete" | "moneda";
  valor: number;
  label: string;
}

export const DENOMINACIONES_MXN: DenominationItem[] = [
  // Billetes
  { id: "b1000", tipo: "billete", valor: 1000, label: "$1,000" },
  { id: "b500", tipo: "billete", valor: 500, label: "$500" },
  { id: "b200", tipo: "billete", valor: 200, label: "$200" },
  { id: "b100", tipo: "billete", valor: 100, label: "$100" },
  { id: "b50", tipo: "billete", valor: 50, label: "$50" },
  { id: "b20", tipo: "billete", valor: 20, label: "$20" },
  // Monedas
  { id: "m20", tipo: "moneda", valor: 20, label: "$20" },
  { id: "m10", tipo: "moneda", valor: 10, label: "$10" },
  { id: "m5", tipo: "moneda", valor: 5, label: "$5" },
  { id: "m2", tipo: "moneda", valor: 2, label: "$2" },
  { id: "m1", tipo: "moneda", valor: 1, label: "$1" },
  { id: "m05", tipo: "moneda", valor: 0.5, label: "$0.50" },
];

export type ConteoDenominaciones = Record<string, number>;

interface DenominationCounterProps {
  isOpen: boolean;
  esperadoEfectivo: number;
  initialCounts?: ConteoDenominaciones;
  onClose: () => void;
  onApply: (total: number, breakdown: ConteoDenominaciones) => void;
}

export default function DenominationCounter({
  isOpen,
  esperadoEfectivo,
  initialCounts,
  onClose,
  onApply,
}: DenominationCounterProps) {
  const [counts, setCounts] = useState<ConteoDenominaciones>({});

  useEffect(() => {
    if (isOpen) {
      if (initialCounts && Object.keys(initialCounts).length > 0) {
        setCounts({ ...initialCounts });
      } else {
        // Inicializar en 0
        const init: ConteoDenominaciones = {};
        DENOMINACIONES_MXN.forEach((d) => {
          init[d.id] = 0;
        });
        setCounts(init);
      }
    }
  }, [isOpen, initialCounts]);

  if (!isOpen) return null;

  const handleCountChange = (id: string, delta: number) => {
    setCounts((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [id]: next };
    });
  };

  const handleDirectInput = (id: string, valStr: string) => {
    const parsed = parseInt(valStr.replace(/\D/g, ""), 10);
    setCounts((prev) => ({
      ...prev,
      [id]: isNaN(parsed) ? 0 : parsed,
    }));
  };

  const handleClear = () => {
    const init: ConteoDenominaciones = {};
    DENOMINACIONES_MXN.forEach((d) => {
      init[d.id] = 0;
    });
    setCounts(init);
  };

  // Cargar arqueo sugerido exacto de $3,140.00 (Mockup)
  const handleLoadExactMockup = () => {
    const mockupCounts: ConteoDenominaciones = {
      b1000: 1, // 1000
      b500: 2,  // 1000
      b200: 3,  // 600
      b100: 4,  // 400
      b50: 2,   // 100
      b20: 2,   // 40
      m20: 0,
      m10: 0,
      m5: 0,
      m2: 0,
      m1: 0,
      m05: 0,
    }; // Total: 3,140.00
    setCounts(mockupCounts);
  };

  // Calcular total actual
  let totalContado = 0;
  DENOMINACIONES_MXN.forEach((d) => {
    const count = counts[d.id] || 0;
    totalContado += count * d.valor;
  });
  totalContado = Math.round(totalContado * 100) / 100;

  const diferencia = Math.round((totalContado - esperadoEfectivo) * 100) / 100;

  const fmt = (n: number) =>
    `$${Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const billetes = DENOMINACIONES_MXN.filter((d) => d.tipo === "billete");
  const monedas = DENOMINACIONES_MXN.filter((d) => d.tipo === "moneda");

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="counter-modal-title"
        className="bg-white rounded-3xl p-5 sm:p-7 max-w-2xl w-full shadow-2xl border border-stone-200 flex flex-col max-h-[92vh] animate-scale-in"
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-3.5 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FAF3F6] text-[#5B122C] flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 id="counter-modal-title" className="font-serif text-xl font-medium text-stone-900">
                Desglose de Efectivo
              </h3>
              <p className="text-xs text-stone-400 font-light">
                Conteo físico de billetes y monedas en caja
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra superior de estado */}
        <div className="py-3 px-4 my-3 rounded-2xl bg-stone-50 border border-stone-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-stone-500 font-medium">Esperado en caja: </span>
            <strong className="text-stone-900 font-semibold">{fmt(esperadoEfectivo)}</strong>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-stone-500 font-medium">Total contado: </span>
            <span className="font-serif text-base font-bold text-stone-900">
              {fmt(totalContado)}
            </span>
            {diferencia === 0 ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold flex items-center gap-1">
                <Check className="w-3 h-3" /> Cuadrado
              </span>
            ) : (
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                  diferencia > 0
                    ? "bg-blue-100 text-blue-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                {diferencia > 0 ? `+${fmt(diferencia)} sobra` : `${fmt(diferencia)} falta`}
              </span>
            )}
          </div>
        </div>

        {/* Columnas de Billetes y Monedas */}
        <div className="flex-1 overflow-y-auto pr-1 py-1 space-y-4">
          {/* Sección Billetes */}
          <div>
            <div className="flex items-center gap-2 mb-2 px-1">
              <Banknote className="w-4 h-4 text-emerald-700" />
              <h4 className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                Billetes
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {billetes.map((b) => {
                const count = counts[b.id] || 0;
                const subtotal = count * b.valor;

                return (
                  <div
                    key={b.id}
                    className="p-2.5 rounded-2xl border border-stone-200 bg-white hover:border-stone-300 flex items-center justify-between"
                  >
                    <div className="w-20">
                      <span className="font-serif text-sm font-bold text-stone-900 block">
                        {b.label}
                      </span>
                      <span className="text-[11px] text-stone-400 font-mono">
                        {fmt(subtotal)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCountChange(b.id, -1)}
                        disabled={count <= 0}
                        className="w-7 h-7 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 font-bold text-xs flex items-center justify-center disabled:opacity-30 cursor-pointer"
                      >
                        -
                      </button>

                      <input
                        type="text"
                        inputMode="numeric"
                        value={count === 0 ? "" : count}
                        placeholder="0"
                        onChange={(e) => handleDirectInput(b.id, e.target.value)}
                        className="w-12 h-7 text-center font-semibold text-xs rounded-xl border border-stone-200 bg-stone-50 text-stone-900 outline-none focus:border-[#5B122C] focus:bg-white"
                      />

                      <button
                        type="button"
                        onClick={() => handleCountChange(b.id, 1)}
                        className="w-7 h-7 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 font-bold text-xs flex items-center justify-center cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sección Monedas */}
          <div>
            <div className="flex items-center gap-2 mb-2 px-1 pt-2">
              <Coins className="w-4 h-4 text-amber-700" />
              <h4 className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                Monedas
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {monedas.map((m) => {
                const count = counts[m.id] || 0;
                const subtotal = count * m.valor;

                return (
                  <div
                    key={m.id}
                    className="p-2.5 rounded-2xl border border-stone-200 bg-white hover:border-stone-300 flex items-center justify-between"
                  >
                    <div className="w-20">
                      <span className="font-serif text-sm font-bold text-stone-900 block">
                        {m.label}
                      </span>
                      <span className="text-[11px] text-stone-400 font-mono">
                        {fmt(subtotal)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleCountChange(m.id, -1)}
                        disabled={count <= 0}
                        className="w-7 h-7 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 font-bold text-xs flex items-center justify-center disabled:opacity-30 cursor-pointer"
                      >
                        -
                      </button>

                      <input
                        type="text"
                        inputMode="numeric"
                        value={count === 0 ? "" : count}
                        placeholder="0"
                        onChange={(e) => handleDirectInput(m.id, e.target.value)}
                        className="w-12 h-7 text-center font-semibold text-xs rounded-xl border border-stone-200 bg-stone-50 text-stone-900 outline-none focus:border-[#5B122C] focus:bg-white"
                      />

                      <button
                        type="button"
                        onClick={() => handleCountChange(m.id, 1)}
                        className="w-7 h-7 rounded-xl bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 font-bold text-xs flex items-center justify-center cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pie y Acciones Rápidas */}
        <div className="pt-3 border-t border-stone-100 mt-2 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-stone-500 hover:text-stone-800 underline underline-offset-2 cursor-pointer"
            >
              Limpiar todo
            </button>

            <button
              type="button"
              onClick={handleLoadExactMockup}
              className="px-3 py-1.5 rounded-xl bg-stone-100 text-stone-700 hover:bg-stone-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Cargar conteo cuadrado ({fmt(esperadoEfectivo)})</span>
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border border-stone-200 text-stone-700 font-medium text-xs hover:bg-stone-50 cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={() => onApply(totalContado, counts)}
              className="flex-2 py-3 rounded-2xl bg-[#5B122C] text-white font-serif text-sm font-semibold shadow-md hover:bg-[#4A0E24] active:bg-[#3D0B1D] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Aplicar conteo ({fmt(totalContado)})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

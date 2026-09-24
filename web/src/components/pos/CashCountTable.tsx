"use client";

import React, { useState } from "react";
import {
  Banknote,
  CreditCard,
  Building2,
  Calculator,
  Pencil,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";

export interface ArqueoValoresEsperados {
  fondoInicial: number;
  efectivoVentas: number;
  efectivoEsperado: number;
  tarjetaEsperado: number;
  transferenciaEsperado: number;
  ingresos: number;
  retiros: number;
  devoluciones: number;
  totalEsperado: number;
}

export interface ArqueoValoresContados {
  efectivo: number;
  tarjeta: number;
  transferencia: number;
}

interface CashCountTableProps {
  esperados: ArqueoValoresEsperados;
  contados: ArqueoValoresContados;
  tolerancia: number;
  corteCiegoInicial?: boolean;
  onUpdateContado: (campo: keyof ArqueoValoresContados, valor: number) => void;
  onOpenDesgloseModal: () => void;
  disabled?: boolean;
}

export default function CashCountTable({
  esperados,
  contados,
  tolerancia,
  corteCiegoInicial = false,
  onUpdateContado,
  onOpenDesgloseModal,
  disabled = false,
}: CashCountTableProps) {
  const [corteCiegoActivo, setCorteCiegoActivo] = useState(corteCiegoInicial);
  const [editingCard, setEditingCard] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState(false);
  const [tempCardVal, setTempCardVal] = useState(String(contados.tarjeta));
  const [tempTransferVal, setTempTransferVal] = useState(String(contados.transferencia));

  const fmt = (n: number) =>
    `$${Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Cálculos de diferencias
  const diffEfectivo = Math.round((contados.efectivo - esperados.efectivoEsperado) * 100) / 100;
  const diffTarjeta = Math.round((contados.tarjeta - esperados.tarjetaEsperado) * 100) / 100;
  const diffTransferencia = Math.round((contados.transferencia - esperados.transferenciaEsperado) * 100) / 100;

  const totalContado = Math.round((contados.efectivo + contados.tarjeta + contados.transferencia) * 100) / 100;
  const diferenciaTotal = Math.round((totalContado - esperados.totalEsperado) * 100) / 100;

  const handleSaveCard = () => {
    const val = parseFloat(tempCardVal);
    onUpdateContado("tarjeta", isNaN(val) ? 0 : Math.max(0, val));
    setEditingCard(false);
  };

  const handleSaveTransfer = () => {
    const val = parseFloat(tempTransferVal);
    onUpdateContado("transferencia", isNaN(val) ? 0 : Math.max(0, val));
    setEditingTransfer(false);
  };

  // Formato de celda de diferencia
  const renderDiferenciaBadge = (diff: number) => {
    if (corteCiegoActivo) {
      return <span className="text-stone-300 font-mono">••••••</span>;
    }

    if (diff === 0) {
      return (
        <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full text-xs font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>$0.00</span>
        </span>
      );
    }

    const isPositive = diff > 0;
    const isExceeded = Math.abs(diff) > tolerancia;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
          isExceeded
            ? "text-rose-800 bg-rose-50 border border-rose-200"
            : "text-amber-800 bg-amber-50 border border-amber-200"
        }`}
      >
        <AlertCircle className="w-3.5 h-3.5" />
        <span>{isPositive ? `+${fmt(diff)}` : fmt(diff)}</span>
      </span>
    );
  };

  return (
    <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xs overflow-hidden">
      {/* Cabecera de la sección */}
      <div className="p-5 sm:p-6 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3 bg-stone-50/50">
        <div>
          <h2 className="font-serif text-xl font-medium text-stone-900">
            Arqueo y Cierre de Valores
          </h2>
          <p className="text-xs text-stone-500 font-light mt-0.5">
            Compara el saldo esperado según los movimientos de caja contra el conteo físico
          </p>
        </div>

        {corteCiegoInicial && (
          <button
            type="button"
            onClick={() => setCorteCiegoActivo(!corteCiegoActivo)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-white text-stone-600 text-xs font-medium hover:bg-stone-50 transition-colors cursor-pointer"
          >
            {corteCiegoActivo ? (
              <>
                <Eye className="w-3.5 h-3.5 text-stone-500" />
                <span>Revelar montos esperados</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5 text-stone-500" />
                <span>Activar arqueo a ciegas</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Tabla de arqueo */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-stone-100 text-[11px] font-semibold text-stone-400 uppercase tracking-wider bg-stone-50/30">
              <th className="py-3 px-5 sm:px-6">Método de pago</th>
              <th className="py-3 px-4 text-right">Esperado</th>
              <th className="py-3 px-4 text-right">Contado</th>
              <th className="py-3 px-5 sm:px-6 text-right">Diferencia</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-stone-100 text-sm">
            {/* 1. Renglón Efectivo */}
            <tr className="hover:bg-stone-50/40 transition-colors">
              <td className="py-4 px-5 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                    <Banknote className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-stone-900 block">Efectivo</span>
                    <span className="text-[11px] text-stone-400 font-light block">
                      Incluye fondo inicial de {fmt(esperados.fondoInicial)}
                    </span>
                  </div>
                </div>
              </td>

              <td className="py-4 px-4 text-right font-serif text-base text-stone-700 font-medium">
                {corteCiegoActivo ? "••••••" : fmt(esperados.efectivoEsperado)}
              </td>

              <td className="py-4 px-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  <span className="font-serif text-base font-bold text-stone-900">
                    {fmt(contados.efectivo)}
                  </span>
                  <button
                    type="button"
                    onClick={onOpenDesgloseModal}
                    disabled={disabled}
                    title="Desglosar billetes y monedas"
                    className="p-1.5 text-stone-500 hover:text-[#5B122C] hover:bg-[#FAF3F6] rounded-xl transition-colors cursor-pointer"
                  >
                    <Calculator className="w-4 h-4" />
                  </button>
                </div>
              </td>

              <td className="py-4 px-5 sm:px-6 text-right">
                {renderDiferenciaBadge(diffEfectivo)}
              </td>
            </tr>

            {/* 2. Renglón Tarjeta */}
            <tr className="hover:bg-stone-50/40 transition-colors">
              <td className="py-4 px-5 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-800 flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-stone-900 block">Tarjeta Bancaria</span>
                    <span className="text-[11px] text-stone-400 font-light block">
                      Cierre de lote en terminal física
                    </span>
                  </div>
                </div>
              </td>

              <td className="py-4 px-4 text-right font-serif text-base text-stone-700 font-medium">
                {corteCiegoActivo ? "••••••" : fmt(esperados.tarjetaEsperado)}
              </td>

              <td className="py-4 px-4 text-right">
                {editingCard ? (
                  <div className="flex items-center justify-end gap-1.5">
                    <input
                      type="number"
                      step="0.01"
                      value={tempCardVal}
                      onChange={(e) => setTempCardVal(e.target.value)}
                      className="w-24 px-2 py-1 border border-stone-300 rounded-xl text-right font-serif text-sm outline-none focus:border-[#5B122C]"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSaveCard}
                      className="p-1.5 bg-stone-900 text-white rounded-xl hover:bg-stone-800"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-end gap-2">
                    <span className="font-serif text-base font-bold text-stone-900">
                      {fmt(contados.tarjeta)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setTempCardVal(String(contados.tarjeta));
                        setEditingCard(true);
                      }}
                      disabled={disabled}
                      title="Editar monto tarjeta"
                      className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </td>

              <td className="py-4 px-5 sm:px-6 text-right">
                {renderDiferenciaBadge(diffTarjeta)}
              </td>
            </tr>

            {/* 3. Renglón Transferencia */}
            <tr className="hover:bg-stone-50/40 transition-colors">
              <td className="py-4 px-5 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-cyan-50 text-cyan-800 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-stone-900 block">Transferencia SPEI</span>
                    <span className="text-[11px] text-stone-400 font-light block">
                      Reflejada en banca electrónica
                    </span>
                  </div>
                </div>
              </td>

              <td className="py-4 px-4 text-right font-serif text-base text-stone-700 font-medium">
                {corteCiegoActivo ? "••••••" : fmt(esperados.transferenciaEsperado)}
              </td>

              <td className="py-4 px-4 text-right">
                {editingTransfer ? (
                  <div className="flex items-center justify-end gap-1.5">
                    <input
                      type="number"
                      step="0.01"
                      value={tempTransferVal}
                      onChange={(e) => setTempTransferVal(e.target.value)}
                      className="w-24 px-2 py-1 border border-stone-300 rounded-xl text-right font-serif text-sm outline-none focus:border-[#5B122C]"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSaveTransfer}
                      className="p-1.5 bg-stone-900 text-white rounded-xl hover:bg-stone-800"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-end gap-2">
                    <span className="font-serif text-base font-bold text-stone-900">
                      {fmt(contados.transferencia)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setTempTransferVal(String(contados.transferencia));
                        setEditingTransfer(true);
                      }}
                      disabled={disabled}
                      title="Editar monto transferencia"
                      className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </td>

              <td className="py-4 px-5 sm:px-6 text-right">
                {renderDiferenciaBadge(diffTransferencia)}
              </td>
            </tr>
          </tbody>

          {/* Renglón Total */}
          <tfoot>
            <tr className="bg-[#FAF7F5] font-bold text-stone-900 border-t-2 border-stone-200">
              <td className="py-4 px-5 sm:px-6 font-serif text-base">
                TOTAL DE VALORES
              </td>

              <td className="py-4 px-4 text-right font-serif text-lg text-stone-700 font-medium">
                {corteCiegoActivo ? "••••••" : fmt(esperados.totalEsperado)}
              </td>

              <td className="py-4 px-4 text-right font-serif text-xl font-bold text-stone-900">
                {fmt(totalContado)}
              </td>

              <td className="py-4 px-5 sm:px-6 text-right">
                {renderDiferenciaBadge(diferenciaTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Banner de estado de cuadratura */}
      <div className="p-4 bg-stone-50 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {diferenciaTotal === 0 ? (
            <span className="flex items-center gap-1.5 text-emerald-800 text-xs font-semibold bg-emerald-100/70 px-3 py-1.5 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>Caja cuadrada — Sin diferencias en arqueo</span>
            </span>
          ) : Math.abs(diferenciaTotal) <= tolerancia ? (
            <span className="flex items-center gap-1.5 text-amber-800 text-xs font-semibold bg-amber-100/70 px-3 py-1.5 rounded-xl">
              <AlertCircle className="w-4 h-4 text-amber-700" />
              <span>Diferencia dentro de tolerancia (±{fmt(tolerancia)})</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-rose-800 text-xs font-semibold bg-rose-100/70 px-3 py-1.5 rounded-xl">
              <AlertCircle className="w-4 h-4 text-rose-700" />
              <span>Descuadre fuera de tolerancia (±{fmt(tolerancia)}) — Requiere justificación y PIN de supervisora</span>
            </span>
          )}
        </div>

        <span className="text-[11px] text-stone-400 font-light">
          Tolerancia institucional: ±{fmt(tolerancia)}
        </span>
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CreditCard, Plus, Check } from "lucide-react";
import NewCardForm, { type NewCardData } from "./NewCardForm";

export interface MetodoPagoGuardado {
  id: number;
  proveedor: string;
  marca: string;
  ultimos4: string;
  titular: string;
  mes_vencimiento: number;
  anio_vencimiento: number;
  predeterminado: number | boolean;
}

export interface SavedCardListProps {
  metodos: MetodoPagoGuardado[];
  selectedCardId: number | "nueva";
  onSelectCardId: (id: number | "nueva") => void;
  onNewCardChange: (cardData: NewCardData | null) => void;
}

export default function SavedCardList({
  metodos,
  selectedCardId,
  onSelectCardId,
  onNewCardChange,
}: SavedCardListProps) {
  const getBrandLabel = (marca: string) => {
    switch (marca.toLowerCase()) {
      case "visa":
        return "Visa";
      case "mastercard":
        return "Mastercard";
      case "amex":
        return "American Express";
      default:
        return "Tarjeta";
    }
  };

  return (
    <div className="space-y-3">
      {/* Lista de tarjetas guardadas */}
      <div role="radiogroup" aria-label="Tarjetas guardadas" className="space-y-2.5">
        {metodos.map((m) => {
          const isSelected = selectedCardId === m.id;
          const venc = `${String(m.mes_vencimiento).padStart(2, "0")}/${String(m.anio_vencimiento).slice(-2)}`;

          return (
            <label
              key={m.id}
              onClick={() => onSelectCardId(m.id)}
              className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                isSelected
                  ? "bg-white border-[#6B1F4A] ring-2 ring-[#6B1F4A]/10 shadow-xs"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Radio button */}
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? "border-[#6B1F4A] bg-[#6B1F4A]"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {isSelected && <div className="w-1 h-1 rounded-full bg-white" />}
                </div>

                <div className="flex items-center gap-2 min-w-0">
                  <CreditCard className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="text-xs sm:text-sm font-medium text-slate-900 truncate">
                    <span>{getBrandLabel(m.marca)} terminación {m.ultimos4}</span>
                    <span className="text-slate-400 mx-1.5">·</span>
                    <span className="text-slate-600 font-normal">{m.titular}</span>
                  </div>
                </div>
              </div>

              <span className="text-xs text-slate-400 font-light shrink-0">
                Vence {venc}
              </span>
            </label>
          );
        })}

        {/* Opción: Usar otra tarjeta */}
        <label
          onClick={() => onSelectCardId("nueva")}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
            selectedCardId === "nueva"
              ? "bg-white border-[#6B1F4A] ring-2 ring-[#6B1F4A]/10 shadow-xs"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                selectedCardId === "nueva"
                  ? "border-[#6B1F4A] bg-[#6B1F4A]"
                  : "border-slate-300 bg-white"
              }`}
            >
              {selectedCardId === "nueva" && <div className="w-1 h-1 rounded-full bg-white" />}
            </div>

            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-slate-600" />
              <span className="text-xs sm:text-sm font-medium text-slate-900">
                Usar otra tarjeta
              </span>
            </div>
          </div>
        </label>
      </div>

      {/* Formulario de nueva tarjeta si está seleccionada o si no hay tarjetas guardadas */}
      {(selectedCardId === "nueva" || metodos.length === 0) && (
        <NewCardForm onChange={onNewCardChange} />
      )}

      {/* Enlace vino: Administrar métodos de pago */}
      <div className="pt-2">
        <Link
          href="/cuenta/pagos"
          className="text-xs font-semibold text-[#6B1F4A] hover:text-[#531839] hover:underline underline-offset-2 transition-colors"
        >
          Administrar métodos de pago
        </Link>
      </div>
    </div>
  );
}

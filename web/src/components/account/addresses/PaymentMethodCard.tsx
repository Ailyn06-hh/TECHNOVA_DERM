"use client";

import React from "react";
import { AlertCircle, Clock } from "lucide-react";

export interface CardItem {
  id: number;
  proveedor: string;
  marca: string;
  marcaLabel: string;
  ultimos4: string;
  titular: string;
  mes_vencimiento: number;
  anio_vencimiento: number;
  vencimientoTexto: string;
  predeterminado: boolean;
  estaVencida: boolean;
  vencePronto: boolean;
}

interface PaymentMethodCardProps {
  tarjeta: CardItem;
  onDelete: (card: CardItem) => void;
  onSetDefault: (card: CardItem) => void;
}

export default function PaymentMethodCard({
  tarjeta,
  onDelete,
  onSetDefault,
}: PaymentMethodCardProps) {
  const getBrandBadgeStyles = (marca: string) => {
    switch (marca.toLowerCase()) {
      case "visa":
        return "bg-[#1A1F71] text-white"; // Azul marino
      case "mastercard":
        return "bg-[#1A1A1A] text-white"; // Negro
      case "amex":
      case "american express":
        return "bg-[#002663] text-white";
      default:
        return "bg-[#333333] text-white";
    }
  };

  return (
    <article
      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        tarjeta.predeterminado
          ? "border-[#5B122C] ring-1 ring-[#5B122C]/15 bg-white shadow-2xs"
          : "border-stone-200 bg-white hover:border-stone-300"
      }`}
      aria-labelledby={`card-title-${tarjeta.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Recuadro estilizado con nombre de la marca */}
          <div
            className={`px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider select-none shrink-0 ${getBrandBadgeStyles(
              tarjeta.marca
            )}`}
          >
            {tarjeta.marcaLabel}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                id={`card-title-${tarjeta.id}`}
                className="font-semibold text-sm text-stone-900"
              >
                {tarjeta.marcaLabel} terminación {tarjeta.ultimos4}
              </h3>

              {tarjeta.predeterminado && (
                <span className="bg-[#FAF3F6] text-[#6B1F4A] border border-[#F3E1EC] px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide">
                  Predeterminada
                </span>
              )}

              {tarjeta.estaVencida && (
                <span className="bg-stone-100 text-stone-500 border border-stone-200 px-2 py-0.5 rounded-full text-[10px] font-medium">
                  Vencida
                </span>
              )}

              {tarjeta.vencePronto && !tarjeta.estaVencida && (
                <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-600" />
                  Vence pronto
                </span>
              )}
            </div>

            <p className="text-xs text-stone-500 font-light mt-0.5">
              Vence {tarjeta.vencimientoTexto} · {tarjeta.titular}
            </p>
          </div>
        </div>

        {/* Acción Eliminar */}
        <button
          type="button"
          onClick={() => onDelete(tarjeta)}
          className="text-stone-400 hover:text-rose-600 text-xs transition-colors cursor-pointer shrink-0"
          aria-label={`Eliminar tarjeta ${tarjeta.marcaLabel} terminación ${tarjeta.ultimos4}`}
        >
          Eliminar
        </button>
      </div>

      {/* Enlace para hacer predeterminada si está vigente y no lo es */}
      {!tarjeta.predeterminado && !tarjeta.estaVencida && (
        <div className="mt-3 pt-2.5 border-t border-stone-100 pl-1">
          <button
            type="button"
            onClick={() => onSetDefault(tarjeta)}
            className="text-[11px] text-stone-500 hover:text-[#5B122C] hover:underline font-medium cursor-pointer"
          >
            Hacer predeterminada
          </button>
        </div>
      )}
    </article>
  );
}

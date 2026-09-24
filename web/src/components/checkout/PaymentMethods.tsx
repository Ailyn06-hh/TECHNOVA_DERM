"use client";

import React from "react";
import { CreditCard, ShoppingBag, Store, AlertCircle } from "lucide-react";
import SavedCardList, { type MetodoPagoGuardado } from "./SavedCardList";
import type { NewCardData } from "./NewCardForm";

export type MetodoPagoTipo = "tarjeta" | "mercado_pago" | "pagar_en_tienda";

export interface PaymentMethodsProps {
  metodoSeleccionado: MetodoPagoTipo;
  onSelectMetodo: (metodo: MetodoPagoTipo) => void;
  tipoEntrega: "recoger" | "envio";
  metodosGuardados: MetodoPagoGuardado[];
  selectedCardId: number | "nueva";
  onSelectCardId: (id: number | "nueva") => void;
  onNewCardChange: (cardData: NewCardData | null) => void;
}

export default function PaymentMethods({
  metodoSeleccionado,
  onSelectMetodo,
  tipoEntrega,
  metodosGuardados,
  selectedCardId,
  onSelectCardId,
  onNewCardChange,
}: PaymentMethodsProps) {
  const isPagarEnTiendaDisabled = tipoEntrega === "envio";

  return (
    <section aria-labelledby="payment-heading" className="space-y-4 pt-4 border-t border-slate-200/80">
      <h2
        id="payment-heading"
        className="font-serif text-2xl font-medium text-slate-900 tracking-tight"
      >
        Pago
      </h2>

      {/* Pestañas tipo botón (tablist) */}
      <div
        role="tablist"
        aria-label="Métodos de pago"
        className="grid grid-cols-1 sm:grid-cols-3 gap-2.5"
      >
        {/* Pestaña: Tarjeta */}
        <button
          type="button"
          role="tab"
          aria-selected={metodoSeleccionado === "tarjeta"}
          onClick={() => onSelectMetodo("tarjeta")}
          className={`py-3.5 px-4 rounded-2xl border-2 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
            metodoSeleccionado === "tarjeta"
              ? "bg-white border-[#6B1F4A] text-[#6B1F4A] shadow-xs"
              : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Tarjeta</span>
        </button>

        {/* Pestaña: Mercado Pago */}
        <button
          type="button"
          role="tab"
          aria-selected={metodoSeleccionado === "mercado_pago"}
          onClick={() => onSelectMetodo("mercado_pago")}
          className={`py-3.5 px-4 rounded-2xl border-2 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
            metodoSeleccionado === "mercado_pago"
              ? "bg-white border-[#6B1F4A] text-[#6B1F4A] shadow-xs"
              : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Mercado Pago</span>
        </button>

        {/* Pestaña: Pagar en tienda */}
        <div className="relative">
          <button
            type="button"
            role="tab"
            disabled={isPagarEnTiendaDisabled}
            aria-selected={metodoSeleccionado === "pagar_en_tienda"}
            onClick={() => {
              if (!isPagarEnTiendaDisabled) {
                onSelectMetodo("pagar_en_tienda");
              }
            }}
            className={`w-full py-3.5 px-4 rounded-2xl border-2 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-all ${
              isPagarEnTiendaDisabled
                ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                : metodoSeleccionado === "pagar_en_tienda"
                ? "bg-white border-[#6B1F4A] text-[#6B1F4A] shadow-xs cursor-pointer"
                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 cursor-pointer"
            }`}
          >
            <Store className="w-4 h-4" />
            <span>Pagar en tienda</span>
          </button>
          {isPagarEnTiendaDisabled && (
            <span className="block text-[10px] text-slate-400 text-center mt-1">
              Disponible solo al recoger en tienda
            </span>
          )}
        </div>
      </div>

      {/* Contenido según la pestaña activa */}
      <div className="pt-2">
        {metodoSeleccionado === "tarjeta" && (
          <SavedCardList
            metodos={metodosGuardados}
            selectedCardId={selectedCardId}
            onSelectCardId={onSelectCardId}
            onNewCardChange={onNewCardChange}
          />
        )}

        {metodoSeleccionado === "mercado_pago" && (
          <div className="bg-[#FAF9F6] border border-slate-200/80 rounded-2xl p-5 text-center text-xs text-slate-600 space-y-2">
            <ShoppingBag className="w-8 h-8 text-sky-600 mx-auto stroke-[1.5]" />
            <p className="font-medium text-slate-800 text-sm">
              Te llevaremos a Mercado Pago para completar el pago.
            </p>
            <p className="font-light text-slate-500 max-w-sm mx-auto">
              Puedes pagar con saldo en cuenta, tarjetas de crédito/débito o transferencias SPEI. Al finalizar serás redirigido automáticamente.
            </p>
          </div>
        )}

        {metodoSeleccionado === "pagar_en_tienda" && (
          <div className="bg-[#FAF9F6] border border-slate-200/80 rounded-2xl p-5 text-center text-xs text-slate-600 space-y-2">
            <Store className="w-8 h-8 text-[#6B1F4A] mx-auto stroke-[1.5]" />
            <p className="font-medium text-slate-800 text-sm">
              Apartamos tus productos hasta el cierre de mañana. Pagas al recoger.
            </p>
            <p className="font-light text-slate-500 max-w-sm mx-auto">
              No se realiza ningún cargo en línea en este momento. Te enviaremos tu comprobante de apartado por WhatsApp y correo.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

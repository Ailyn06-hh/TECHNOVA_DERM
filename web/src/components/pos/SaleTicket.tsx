"use client";

import React, { useState } from "react";
import { Trash2, ShoppingBag } from "lucide-react";
import TicketCustomer from "./TicketCustomer";
import TicketLine from "./TicketLine";
import TicketTotals from "./TicketTotals";
import PaymentMethodSelector, { MetodoPagoPos } from "./PaymentMethodSelector";
import SaleCompletedPanel from "./SaleCompletedPanel";
import PrintableReceipt, { ReciboVentaData } from "./PrintableReceipt";
import type { PosTicket, PosClientaInfo } from "@/lib/pos/ventas";

interface SaleTicketProps {
  ticket: PosTicket | null;
  onUpdateQty: (itemId: number, delta: number) => void;
  onRemoveItem: (itemId: number) => void;
  onOpenCustomerSearch: () => void;
  onRemoveCustomer: () => void;
  onDiscardDraft: () => void;
  selectedMetodo: MetodoPagoPos;
  onSelectMetodo: (m: MetodoPagoPos) => void;
  sendWhatsApp: boolean;
  onToggleWhatsApp: (val: boolean) => void;
  onOpenCheckoutModal: () => void;
  completedReceipt: ReciboVentaData | null;
  onStartNewSale: () => void;
  highlightedItemId: number | null;
  isLoading?: boolean;
}

export default function SaleTicket({
  ticket,
  onUpdateQty,
  onRemoveItem,
  onOpenCustomerSearch,
  onRemoveCustomer,
  onDiscardDraft,
  selectedMetodo,
  onSelectMetodo,
  sendWhatsApp,
  onToggleWhatsApp,
  onOpenCheckoutModal,
  completedReceipt,
  onStartNewSale,
  highlightedItemId,
  isLoading = false,
}: SaleTicketProps) {
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  // Si ya se cobró la venta, mostrar el panel de venta completada
  if (completedReceipt) {
    return (
      <aside className="w-80 md:w-96 bg-white border-l border-stone-200/90 flex flex-col h-full shrink-0 z-10 shadow-xs">
        <SaleCompletedPanel
          recibo={completedReceipt}
          onNewSale={onStartNewSale}
          onPrint={() => window.print()}
        />
        <PrintableReceipt recibo={completedReceipt} />
      </aside>
    );
  }

  const items = ticket?.items || [];
  const hasItems = items.length > 0;

  return (
    <>
      <aside className="w-80 md:w-96 bg-white border-l border-stone-200/90 flex flex-col h-full shrink-0 z-10 shadow-xs">
        {/* Encabezado del Ticket */}
        <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg sm:text-xl font-medium text-stone-900 tracking-tight">
              Venta #{ticket?.folio || "---"}
            </h2>
            <p className="text-[11px] text-stone-400 font-light mt-0.5">
              {ticket?.fechaHoraTexto || "Cargando..."}
            </p>
          </div>

          {hasItems && (
            <button
              type="button"
              onClick={() => setShowDiscardConfirm(true)}
              className="text-[11px] text-stone-400 hover:text-rose-600 font-medium flex items-center gap-1 p-1.5 rounded-lg hover:bg-stone-50 transition"
              title="Descartar borrador y empezar de nuevo"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Cancelar venta</span>
            </button>
          )}
        </div>

        {/* Clienta Asignada */}
        <div className="p-3.5 sm:p-4 border-b border-stone-100">
          <TicketCustomer
            clienta={ticket?.clienta || null}
            onOpenSearch={onOpenCustomerSearch}
            onRemoveCustomer={onRemoveCustomer}
            disabled={isLoading}
          />
        </div>

        {/* Lista de Artículos (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2.5">
          {!hasItems ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-300">
              <ShoppingBag className="w-10 h-10 mb-2 stroke-[1.2]" />
              <p className="text-xs font-medium text-stone-400">Ticket vacío</p>
              <p className="text-[11px] text-stone-400/80 font-light mt-0.5">
                Escanea un código de barras o pulsa sobre un producto para agregarlo.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <TicketLine
                key={item.id}
                item={item}
                onUpdateQty={onUpdateQty}
                onRemoveItem={onRemoveItem}
                isHighlighted={highlightedItemId === item.id}
                disabled={isLoading}
              />
            ))
          )}
        </div>

        {/* Totales y Métodos de Pago */}
        {hasItems && ticket && (
          <div className="p-4 sm:p-5 border-t border-stone-200 bg-stone-50/50">
            <TicketTotals
              subtotal={ticket.subtotal}
              totalDescuento={ticket.totalDescuento}
              total={ticket.total}
              lineasDescuento={ticket.lineasDescuento}
            />

            <PaymentMethodSelector
              metodo={selectedMetodo}
              onSelectMetodo={onSelectMetodo}
              sendWhatsApp={sendWhatsApp}
              onToggleWhatsApp={onToggleWhatsApp}
              total={ticket.total}
              onCobrar={onOpenCheckoutModal}
              disabled={isLoading || !hasItems}
              isLoading={isLoading}
            />
          </div>
        )}
      </aside>

      {/* Modal de confirmación para cancelar venta */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border border-stone-200 animate-scale-in">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-200">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="font-serif text-xl font-medium text-stone-900 mb-2">
              ¿Cancelar esta venta?
            </h3>

            <p className="text-xs sm:text-sm text-stone-600 font-light leading-relaxed mb-6">
              Se eliminarán todos los artículos del ticket actual #{ticket?.folio}. Esta acción no se puede deshacer.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-50"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDiscardConfirm(false);
                  onDiscardDraft();
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition"
              >
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

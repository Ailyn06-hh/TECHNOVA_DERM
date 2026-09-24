"use client";

import React, { useEffect, useRef } from "react";
import { X, RotateCcw } from "lucide-react";
import { OrderItemDetail } from "./OrderItemsCard";
import ReturnRequestForm from "./ReturnRequestForm";

interface ReturnRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  folio: string;
  items: OrderItemDetail[];
  onSuccess: (data: any) => void;
  showToast: (opts: { message: string; type: "success" | "error" | "info" }) => void;
}

export default function ReturnRequestModal({
  isOpen,
  onClose,
  folio,
  items,
  onSuccess,
  showToast,
}: ReturnRequestModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="return-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-stone-200 shadow-2xl relative overflow-y-auto max-h-[90vh]"
      >
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FAF3F6] text-[#5B122C] flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="return-modal-title"
                className="font-serif text-lg sm:text-xl font-medium text-stone-900"
              >
                Solicitar devolución
              </h2>
              <span className="text-xs text-stone-500 font-light">
                Pedido #{folio} · Garantía Technova-Derm (30 días)
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario unificado de devolución */}
        <ReturnRequestForm
          variant="modal"
          pedidoPreseleccionado={{
            folio,
            items,
          }}
          onSuccess={(data) => {
            onSuccess(data);
            onClose();
          }}
          onCancel={onClose}
          showToast={showToast}
        />
      </div>
    </div>
  );
}

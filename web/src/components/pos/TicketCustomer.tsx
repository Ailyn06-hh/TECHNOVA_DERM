"use client";

import React from "react";
import { User, UserCheck, X } from "lucide-react";
import type { PosClientaInfo } from "@/lib/pos/ventas";

interface TicketCustomerProps {
  clienta: PosClientaInfo | null;
  onOpenSearch: () => void;
  onRemoveCustomer: () => void;
  disabled?: boolean;
}

export default function TicketCustomer({
  clienta,
  onOpenSearch,
  onRemoveCustomer,
  disabled = false,
}: TicketCustomerProps) {
  if (clienta) {
    return (
      <div className="rounded-2xl p-3.5 bg-[#EBF7EE] border border-[#C8E6C9] flex items-center justify-between text-xs transition-all">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <UserCheck className="w-4 h-4" />
          </div>

          <div>
            <p className="font-semibold text-emerald-950 truncate max-w-[170px]">
              {clienta.nombreCompleto} · <span className="font-normal text-emerald-800">clienta registrada</span>
            </p>
            <p className="text-[11px] text-emerald-700 font-light">
              La compra se suma a su historial
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenSearch}
            disabled={disabled}
            className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 underline px-1 py-1"
          >
            Cambiar
          </button>
          <button
            type="button"
            onClick={onRemoveCustomer}
            disabled={disabled}
            className="text-emerald-700 hover:text-rose-600 p-1 rounded-full transition-colors"
            title="Quitar clienta"
            aria-label="Quitar clienta de la venta"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-3.5 bg-stone-100/90 border border-stone-200/80 flex items-center justify-between text-xs transition-all">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-stone-200 text-stone-500 flex items-center justify-center shrink-0">
          <User className="w-4 h-4" />
        </div>

        <div>
          <p className="font-medium text-stone-700">Venta sin clienta</p>
          <p className="text-[11px] text-stone-400 font-light">
            Venta de mostrador estándar
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenSearch}
        disabled={disabled}
        className="text-xs font-semibold text-[#5B122C] hover:text-[#4A0E24] hover:underline px-2 py-1 min-h-[36px] flex items-center"
      >
        Asignar clienta
      </button>
    </div>
  );
}

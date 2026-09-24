"use client";

import React, { useState } from "react";
import { Store, ChevronRight, CheckCircle2 } from "lucide-react";
import StoreSelectModal, { type SucursalCalculada } from "./StoreSelectModal";

export interface StorePickupSelectorProps {
  sucursales: SucursalCalculada[];
  selectedStore: SucursalCalculada | null;
  onSelectStore: (sucursal: SucursalCalculada) => void;
  totalProductos: number;
}

export default function StorePickupSelector({
  sucursales,
  selectedStore,
  onSelectStore,
  totalProductos,
}: StorePickupSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="mt-3.5 space-y-3">
      {/* Tarjeta selector de tienda */}
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="w-full text-left p-3.5 sm:p-4 rounded-2xl bg-[#FAF9F6] hover:bg-[#F5F2EB] border border-slate-200/90 hover:border-slate-300 transition-all flex items-center justify-between gap-3 group active:scale-[0.99]"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-white text-[#6B1F4A] flex items-center justify-center shrink-0 shadow-2xs border border-slate-100">
            <Store className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <span className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Tienda para recoger
            </span>
            <div className="text-xs sm:text-sm font-medium text-slate-800 truncate">
              {selectedStore ? (
                <>
                  <span className="font-semibold text-slate-900">{selectedStore.nombre}</span>
                  <span className="text-slate-400 mx-1.5">·</span>
                  <span>{selectedStore.direccion_corta}</span>
                  <span className="text-slate-400 mx-1.5">·</span>
                  <span className="text-[#6B1F4A] font-semibold">{selectedStore.horaEstimadaTexto}</span>
                </>
              ) : (
                <span className="text-slate-500">Seleccionar una tienda física</span>
              )}
            </div>
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition shrink-0" />
      </button>

      {/* Mensaje verde con check */}
      {selectedStore && selectedStore.tieneTodo && (
        <div className="p-3 rounded-2xl bg-[#EAF5EF] border border-[#CDE8D8] text-slate-800 text-xs flex items-center gap-2.5 animate-fade-in shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-light text-slate-700">
            Los <strong className="font-semibold text-slate-900">{totalProductos} productos</strong> están disponibles en esta tienda. Los apartamos en cuanto pagues.
          </span>
        </div>
      )}

      {/* Modal de selección */}
      <StoreSelectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sucursales={sucursales}
        selectedId={selectedStore ? selectedStore.id : null}
        onSelectStore={onSelectStore}
      />
    </div>
  );
}

"use client";

import React, { useEffect, useRef } from "react";
import { X, Store, CheckCircle2, AlertCircle, Clock, MapPin } from "lucide-react";

export interface SucursalCalculada {
  id: number;
  nombre: string;
  nombreCorto: string;
  direccion: string;
  direccion_corta: string;
  hora_apertura: string;
  hora_cierre: string;
  minutos_preparacion: number;
  totalProductos: number;
  productosDisponibles: number;
  faltanN: number;
  tieneTodo: boolean;
  puedeRecogerHoy: boolean;
  horaEstimadaTexto: string;
}

export interface StoreSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  sucursales: SucursalCalculada[];
  selectedId: number | null;
  onSelectStore: (sucursal: SucursalCalculada) => void;
}

export default function StoreSelectModal({
  isOpen,
  onClose,
  sucursales,
  selectedId,
  onSelectStore,
}: StoreSelectModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Atrapado de foco y cierre con Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="store-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-100 shadow-xl flex flex-col justify-between"
      >
        <div>
          {/* Cabecera del modal */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-rose-50 text-[#6B1F4A] flex items-center justify-center shrink-0">
                <Store className="w-4 h-4" />
              </div>
              <h2 id="store-modal-title" className="font-serif text-xl font-medium text-slate-900">
                Seleccionar sucursal
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar ventana de sucursales"
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs text-slate-500 font-light mb-4">
            Elige la tienda física donde deseas recoger tu pedido. Solo puedes seleccionar sucursales con inventario completo para todas tus fórmulas.
          </p>

          {/* Lista de sucursales */}
          <div className="space-y-3">
            {sucursales.map((suc) => {
              const isSelected = selectedId === suc.id;
              const isAvailable = suc.tieneTodo;

              return (
                <div
                  key={suc.id}
                  onClick={() => {
                    if (isAvailable) {
                      onSelectStore(suc);
                      onClose();
                    }
                  }}
                  className={`p-4 rounded-2xl border transition-all text-left flex flex-col gap-2 ${
                    !isAvailable
                      ? "bg-slate-50/70 border-slate-200/60 opacity-60 cursor-not-allowed"
                      : isSelected
                      ? "bg-white border-[#6B1F4A] ring-2 ring-[#6B1F4A]/10 shadow-xs cursor-pointer"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs cursor-pointer"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-serif text-sm sm:text-base font-medium text-slate-900">
                        {suc.nombre}
                      </span>
                      {isSelected && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-50 text-[#6B1F4A] text-[10px] font-semibold">
                          Seleccionada
                        </span>
                      )}
                    </div>

                    {isAvailable ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>{suc.productosDisponibles} de {suc.totalProductos} disponibles</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full shrink-0">
                        <AlertCircle className="w-3 h-3 text-rose-600" />
                        <span>Faltan {suc.faltanN} productos</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-start gap-1.5 text-xs text-slate-500 font-light">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{suc.direccion}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100 text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{suc.hora_apertura.slice(0, 5)} - {suc.hora_cierre.slice(0, 5)} hrs</span>
                    </div>

                    {isAvailable && (
                      <span className="text-[11px] font-medium text-[#6B1F4A]">
                        {suc.horaEstimadaTexto}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

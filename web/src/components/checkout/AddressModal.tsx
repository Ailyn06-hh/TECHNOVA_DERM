"use client";

import React, { useState, useEffect } from "react";
import { X, MapPin, Plus, CheckCircle2 } from "lucide-react";
import AddressForm, { type DireccionGuardada } from "./AddressForm";

export interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  direcciones: DireccionGuardada[];
  selectedId: number | null;
  onSelectAddress: (dir: DireccionGuardada) => void;
  onAddressCreated: (dir: DireccionGuardada) => void;
}

export default function AddressModal({
  isOpen,
  onClose,
  direcciones,
  selectedId,
  onSelectAddress,
  onAddressCreated,
}: AddressModalProps) {
  const [isAddingNew, setIsAddingNew] = useState(false);

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
      aria-labelledby="address-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in"
    >
      <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full max-h-[90vh] overflow-y-auto border border-slate-100 shadow-xl flex flex-col justify-between">
        <div>
          {/* Cabecera del modal */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-rose-50 text-[#6B1F4A] flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <h2 id="address-modal-title" className="font-serif text-xl font-medium text-slate-900">
                {isAddingNew ? "Nueva dirección de entrega" : "Mis direcciones"}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar ventana de direcciones"
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Vista Formulario o Vista Lista */}
          {isAddingNew ? (
            <AddressForm
              onSuccess={(nueva) => {
                onAddressCreated(nueva);
                onSelectAddress(nueva);
                setIsAddingNew(false);
                onClose();
              }}
              onCancel={() => setIsAddingNew(false)}
            />
          ) : (
            <div className="space-y-4">
              <div className="space-y-2.5">
                {direcciones.map((dir) => {
                  const isSelected = selectedId === dir.id;

                  return (
                    <div
                      key={dir.id}
                      onClick={() => {
                        onSelectAddress(dir);
                        onClose();
                      }}
                      className={`p-3.5 sm:p-4 rounded-2xl border text-left cursor-pointer transition flex items-start justify-between gap-3 ${
                        isSelected
                          ? "bg-white border-[#6B1F4A] ring-2 ring-[#6B1F4A]/10 shadow-xs"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs"
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-900">
                            {dir.alias}
                          </span>
                          {Boolean(dir.predeterminada) && (
                            <span className="px-2 py-0.2 rounded-full bg-slate-100 text-slate-500 text-[10px] font-medium">
                              Predeterminada
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-700 leading-snug">
                          {dir.calle} #{dir.numero_exterior}
                          {dir.numero_interior ? ` Int. ${dir.numero_interior}` : ""},{" "}
                          {dir.colonia}, C.P. {dir.codigo_postal}
                        </p>

                        <p className="text-[11px] text-slate-400">
                          {dir.ciudad}, {dir.estado}
                        </p>

                        {dir.referencias && (
                          <p className="text-[10px] text-slate-500 italic mt-0.5">
                            Ref: {dir.referencias}
                          </p>
                        )}
                      </div>

                      {isSelected && (
                        <CheckCircle2 className="w-5 h-5 text-[#6B1F4A] shrink-0 mt-0.5" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Botón para agregar nueva */}
              <button
                type="button"
                onClick={() => setIsAddingNew(true)}
                className="w-full py-3 px-4 rounded-2xl border border-dashed border-slate-300 hover:border-[#6B1F4A] text-slate-600 hover:text-[#6B1F4A] text-xs font-medium flex items-center justify-center gap-2 transition bg-slate-50/50 hover:bg-rose-50/30"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar nueva dirección</span>
              </button>
            </div>
          )}
        </div>

        {!isAddingNew && (
          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-full border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 transition"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { Sparkles, Plus, AlertCircle, Loader2 } from "lucide-react";
import CartItemRow from "./CartItemRow";
import type { CarritoGrupoCalculado } from "@/lib/carrito";

export interface CartGroupProps {
  grupo: CarritoGrupoCalculado;
  onUpdateQuantity: (itemId: number, newQty: number) => Promise<void>;
  onRemoveItem: (itemId: number) => Promise<void>;
  onReAddMissing?: (
    productoId: number,
    grupoId: string,
    grupoTipo: "rutina" | "combo",
    grupoClave: string,
    descuentoPct: number
  ) => Promise<void>;
}

export default function CartGroup({
  grupo,
  onUpdateQuantity,
  onRemoveItem,
  onReAddMissing,
}: CartGroupProps) {
  const [isAddingMissing, setIsAddingMissing] = useState(false);

  const handleAddMissing = async () => {
    if (!grupo.productoFaltante || !onReAddMissing || isAddingMissing) return;
    setIsAddingMissing(true);
    try {
      await onReAddMissing(
        grupo.productoFaltante.id,
        grupo.grupo_id,
        grupo.grupo_tipo,
        grupo.grupo_clave,
        grupo.descuento_porcentaje
      );
    } finally {
      setIsAddingMissing(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-100 shadow-xs mb-6 transition-all">
      {/* 1. Encabezado del Grupo */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <h3 className="font-serif text-lg sm:text-xl font-medium text-slate-900 leading-snug">
          {grupo.nombre}
        </h3>

        {/* Etiqueta a la derecha */}
        {grupo.descuentoAplicado ? (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-[#6B1F4A] border border-rose-100 shadow-2xs shrink-0">
            <Sparkles className="w-3 h-3 text-[#6B1F4A]" />
            <span>{grupo.etiquetaBadge}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
            <span>{grupo.etiquetaBadge}</span>
          </span>
        )}
      </div>

      {/* 2. Aviso de recuperación si el grupo perdió el descuento */}
      {!grupo.descuentoAplicado && grupo.mensajeFaltante && (
        <div className="mt-3.5 p-3 rounded-2xl bg-[#FBF9F6] border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-medium text-slate-800">{grupo.mensajeFaltante}</span>
          </div>

          {grupo.productoFaltante && onReAddMissing && (
            <button
              type="button"
              onClick={handleAddMissing}
              disabled={isAddingMissing}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#6B1F4A] hover:bg-[#531839] text-white text-xs font-medium transition shadow-2xs active:scale-95 shrink-0 self-start sm:self-auto"
            >
              {isAddingMissing ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Agregando...</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar paso</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* 3. Lista de Artículos del Grupo */}
      <div className="divide-y divide-slate-100 mt-1">
        {grupo.items.map((item) => (
          <CartItemRow
            key={item.id}
            item={item}
            onUpdateQuantity={onUpdateQuantity}
            onRemoveItem={onRemoveItem}
          />
        ))}
      </div>
    </div>
  );
}

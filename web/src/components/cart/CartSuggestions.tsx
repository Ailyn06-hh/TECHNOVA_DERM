"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, Loader2 } from "lucide-react";
import { formatearPrecio } from "@/lib/formato";
import ProductThumb from "@/components/routines/ProductThumb";
import type { SugerenciaProducto } from "@/lib/recomendaciones";

export interface CartSuggestionsProps {
  sugerencias: SugerenciaProducto[];
  onAddSuggestion: (productoId: number) => Promise<void>;
}

export default function CartSuggestions({
  sugerencias,
  onAddSuggestion,
}: CartSuggestionsProps) {
  const [addingId, setAddingId] = useState<number | null>(null);

  if (!sugerencias || sugerencias.length === 0) {
    return null;
  }

  const handleAdd = async (id: number) => {
    if (addingId !== null) return;
    setAddingId(id);
    try {
      await onAddSuggestion(id);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <section className="mt-10 pt-8 border-t border-slate-200/60">
      <h2 className="font-serif text-xl sm:text-2xl font-medium text-slate-900 tracking-tight mb-4">
        También te puede gustar
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
        {sugerencias.map((prod) => {
          const isAdding = addingId === prod.id;
          const precioFinal = prod.precio_especial ?? prod.precio;

          return (
            <div
              key={prod.id}
              className="bg-white rounded-2xl p-3.5 border border-slate-100/90 shadow-2xs hover:shadow-xs transition flex items-center justify-between gap-3 group"
            >
              {/* Miniatura y Detalles */}
              <div className="flex items-center gap-3 min-w-0">
                <ProductThumb
                  nombre={prod.nombre}
                  slug={prod.slug}
                  color_fondo={prod.color_fondo}
                  color_frasco={prod.color_frasco}
                  size="sm"
                />

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/producto/${prod.slug}`}
                    className="font-serif text-xs sm:text-sm font-medium text-slate-900 hover:text-[#6B1F4A] transition-colors truncate block"
                    title={prod.nombre}
                  >
                    {prod.nombre}
                  </Link>

                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-semibold text-slate-800">
                      {formatearPrecio(precioFinal)}
                    </span>
                    {prod.precio_especial && prod.precio_especial < prod.precio && (
                      <span className="text-[10px] text-slate-400 line-through">
                        {formatearPrecio(prod.precio)}
                      </span>
                    )}

                    {/* Etiqueta en vino */}
                    {prod.badge && (
                      <span className="inline-flex items-center text-[10px] font-semibold text-[#6B1F4A] bg-rose-50 border border-rose-100/80 px-1.5 py-0.2 rounded-full">
                        {prod.badge}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Botón Píldora Agregar */}
              <button
                type="button"
                onClick={() => handleAdd(prod.id)}
                disabled={isAdding}
                aria-label={`Agregar ${prod.nombre} a mi bolsa`}
                className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-[#1A1715] hover:bg-[#2C2724] text-white text-xs font-medium transition shadow-2xs active:scale-95 shrink-0"
              >
                {isAdding ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

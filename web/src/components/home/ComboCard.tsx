"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ShoppingBag, Loader2, Sparkles, Check, AlertCircle } from "lucide-react";
import { formatearPrecio } from "@/lib/formato";
import { useCarrito } from "@/contexts/CarritoContext";

export interface ComboCardProps {
  id: number;
  nombre: string;
  slug: string;
  descripcion_corta: string;
  descuento_porcentaje: number;
  color_fondo?: string;
  precio_original: number;
  precio_final: number;
  agotado: boolean;
  productos: {
    producto_id: number;
    nombre: string;
    cantidad: number;
    total_stock: number;
  }[];
}

export default function ComboCard({
  id,
  nombre,
  slug,
  descripcion_corta,
  descuento_porcentaje,
  color_fondo = "#FDF2F4",
  precio_original,
  precio_final,
  agotado,
  productos,
}: ComboCardProps) {
  const { addItem } = useCarrito();
  const [isAdding, setIsAdding] = useState(false);

  const handleAddCombo = async () => {
    if (agotado || isAdding) return;
    setIsAdding(true);
    try {
      await addItem({ combo_id: id, cantidad: 1 });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-100/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group">
      
      {/* Parte Superior: Encabezado y Badge de Descuento */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#6B1F4A] text-white shadow-sm">
            <Sparkles className="w-3 h-3" />
            <span>-{descuento_porcentaje}% OFF</span>
          </span>

          {agotado && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200/60 px-2.5 py-0.5 rounded-full">
              <AlertCircle className="w-3 h-3" />
              <span>Agotado</span>
            </span>
          )}
        </div>

        {/* Visual de Frascos / Silueta del combo */}
        <div
          className="w-full h-40 rounded-2xl mb-4 flex items-center justify-center p-4 transition-transform group-hover:scale-[1.01]"
          style={{ backgroundColor: color_fondo || "#FDF2F4" }}
        >
          <div className="flex items-end justify-center gap-3">
            {/* Silueta botella 1 */}
            <div className="flex flex-col items-center">
              <div className="w-2.5 h-3 bg-white/70 rounded-t-sm" />
              <div className="w-9 h-16 bg-[#6B1F4A]/20 rounded-t-lg rounded-b-xl border border-white/40 shadow-inner flex items-center justify-center">
                <div className="w-5 h-7 bg-white/40 rounded-sm" />
              </div>
            </div>
            {/* Silueta tarro / crema central */}
            <div className="flex flex-col items-center">
              <div className="w-12 h-3.5 bg-white/80 rounded-t-sm shadow-sm" />
              <div className="w-14 h-12 bg-[#6B1F4A]/30 rounded-b-xl border border-white/50 shadow-sm flex items-center justify-center">
                <div className="w-8 h-4 bg-white/40 rounded-sm" />
              </div>
            </div>
            {/* Silueta botella 2 */}
            <div className="flex flex-col items-center">
              <div className="w-2.5 h-3 bg-white/70 rounded-t-sm" />
              <div className="w-8 h-14 bg-[#6B1F4A]/20 rounded-t-lg rounded-b-xl border border-white/40 shadow-inner flex items-center justify-center">
                <div className="w-4 h-6 bg-white/40 rounded-sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Título del combo */}
        <h3 className="font-serif text-lg font-medium text-slate-900 mb-1 leading-snug group-hover:text-[#6B1F4A] transition-colors">
          {nombre}
        </h3>

        {/* Descripción corta */}
        <p className="text-xs text-slate-500 font-light leading-relaxed mb-4 line-clamp-2">
          {descripcion_corta}
        </p>

        {/* Lista de productos incluidos */}
        {productos && productos.length > 0 && (
          <div className="space-y-1.5 mb-5 pb-4 border-b border-slate-100">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Incluye {productos.length} fórmulas:
            </span>
            <ul className="space-y-1">
              {productos.map((item, idx) => (
                <li key={idx} className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">{item.nombre}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Parte Inferior: Precios y Botón de Acción */}
      <div>
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-xl font-semibold text-slate-900">
            {formatearPrecio(precio_final)}
          </span>
          <span className="text-sm text-slate-400 line-through">
            {formatearPrecio(precio_original)}
          </span>
        </div>

        <button
          onClick={handleAddCombo}
          disabled={agotado || isAdding}
          className={`w-full py-3 px-4 rounded-full text-xs font-medium flex items-center justify-center gap-2 transition-all shadow-sm ${
            agotado
              ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
              : "bg-[#6B1F4A] hover:bg-[#531839] text-white hover:shadow active:scale-[0.98]"
          }`}
        >
          {isAdding ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Agregando combo...</span>
            </>
          ) : agotado ? (
            <span>Agotado temporalmente</span>
          ) : (
            <>
              <ShoppingBag className="w-4 h-4" />
              <span>Agregar combo</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
}

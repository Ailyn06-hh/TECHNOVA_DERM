"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ShoppingBag, Loader2, AlertCircle } from "lucide-react";
import { formatearPrecio } from "@/lib/formato";
import { useCarrito } from "@/contexts/CarritoContext";
import ProductThumb from "@/components/routines/ProductThumb";

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
  vigencia_texto?: string;
  esIdealParaTuPiel?: boolean;
  productos: Array<{
    producto_id: number;
    nombre: string;
    slug?: string;
    color_fondo?: string;
    color_frasco?: string;
    cantidad: number;
    total_stock?: number;
  }>;
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
  vigencia_texto = "Hasta agotar existencias",
  esIdealParaTuPiel = false,
  productos = [],
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

  const listaProductosTexto = productos.map((p) => p.nombre).join(" + ");
  const ariaBoton = `Agregar combo ${nombre}, ${formatearPrecio(precio_final)}`;

  return (
    <article
      className="rounded-3xl p-6 sm:p-7 border border-white/60 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative group"
      style={{ backgroundColor: color_fondo || "#FDF2F4" }}
    >
      {/* 1. Parte Superior: Badge de descuento, vigencia y etiqueta 'Ideal para tu piel' */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          {/* Etiqueta blanca de descuento */}
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-white text-slate-900 shadow-2xs border border-white/60">
            <span>-{descuento_porcentaje}%</span>
          </span>

          <div className="flex items-center gap-1.5">
            {esIdealParaTuPiel && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6B1F4A] bg-white/90 border border-[#6B1F4A]/20 px-2.5 py-0.5 rounded-full shadow-2xs">
                Ideal para tu piel
              </span>
            )}

            {agotado && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50/90 border border-amber-200/80 px-2.5 py-0.5 rounded-full">
                <AlertCircle className="w-3 h-3 text-amber-600" />
                <span>Agotado</span>
              </span>
            )}
          </div>
        </div>

        {/* Texto pequeño de vigencia */}
        <p className="text-xs text-slate-600 font-light mt-2 mb-1">
          {vigencia_texto}
        </p>

        {/* Nombre del combo en serif */}
        <h3 className="font-serif text-xl sm:text-2xl font-medium text-slate-900 leading-snug mb-3">
          {nombre}
        </h3>

        {/* Miniaturas blancas de los productos incluidos */}
        {productos && productos.length > 0 && (
          <div className="flex items-center gap-2.5 my-3 p-2.5 rounded-2xl bg-white/70 border border-white/80 overflow-x-auto">
            {productos.map((item, idx) => (
              <ProductThumb
                key={item.producto_id || idx}
                nombre={item.nombre}
                slug={item.slug}
                color_fondo="#FFFFFF"
                color_frasco={item.color_frasco || "#6B1F4A"}
                size="sm"
                className="bg-white shadow-2xs border border-slate-100/80"
              />
            ))}
          </div>
        )}

        {/* Lista de productos separados por '+' */}
        <p className="text-xs sm:text-sm text-slate-700 font-light leading-relaxed mb-6 line-clamp-2">
          {listaProductosTexto || descripcion_corta}
        </p>
      </div>

      {/* 2. Parte Inferior: Precios y Botón Oscuro */}
      <div>
        <div className="flex items-baseline gap-2 mb-4">
          <span className="sr-only">
            Antes {formatearPrecio(precio_original)}, ahora {formatearPrecio(precio_final)}
          </span>
          <span className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight" aria-hidden="true">
            {formatearPrecio(precio_final)}
          </span>
          {precio_original > precio_final && (
            <span className="text-sm text-slate-500 line-through" aria-hidden="true">
              {formatearPrecio(precio_original)}
            </span>
          )}
        </div>

        <button
          onClick={handleAddCombo}
          disabled={agotado || isAdding}
          aria-label={ariaBoton}
          className={`w-full py-3.5 px-4 rounded-full text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-sm ${
            agotado
              ? "bg-slate-200/80 text-slate-400 cursor-not-allowed border border-slate-300"
              : "bg-[#1A1715] hover:bg-[#2C2724] text-white active:scale-[0.98]"
          }`}
        >
          {isAdding ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Agregando combo...</span>
            </>
          ) : agotado ? (
            <span>Agotado</span>
          ) : (
            <>
              <ShoppingBag className="w-4 h-4" />
              <span>Agregar combo</span>
            </>
          )}
        </button>
      </div>
    </article>
  );
}

"use client";

import React from "react";
import { Sparkles } from "lucide-react";

export interface PosProductData {
  id: number;
  tipoItem?: "producto" | "combo";
  sku?: string;
  codigo_barras?: string | null;
  nombre: string;
  slug: string;
  precio: number;
  precio_especial?: number | null;
  color_fondo: string;
  color_frasco: string;
  stock_tienda: number;
  categoriaNombre?: string;
  descuento_porcentaje?: number;
  descripcion?: string;
}

interface PosProductCardProps {
  product: PosProductData;
  onAdd: (product: PosProductData) => void;
  disabled?: boolean;
}

export default function PosProductCard({
  product,
  onAdd,
  disabled = false,
}: PosProductCardProps) {
  const isAgotado = product.stock_tienda <= 0;
  const isPocas = product.stock_tienda > 0 && product.stock_tienda <= 5;
  const isCombo = product.tipoItem === "combo";

  const precioFinal = product.precio_especial ?? product.precio;
  const tienePrecioEspecial =
    product.precio_especial !== null &&
    product.precio_especial !== undefined &&
    product.precio_especial < product.precio;

  const stockBadgeClass = isAgotado
    ? "bg-rose-50 text-rose-700 border-rose-200"
    : isPocas
    ? "bg-amber-50 text-amber-800 border-amber-200"
    : "bg-stone-100 text-stone-600 border-stone-200";

  const stockBadgeText = isAgotado
    ? "Agotado"
    : isPocas
    ? `Solo ${product.stock_tienda}`
    : `Stock ${product.stock_tienda}`;

  const ariaLabel = isAgotado
    ? `${product.nombre}, agotado en tienda`
    : isCombo
    ? `Agregar ${product.nombre}, combo $${precioFinal}, ${product.stock_tienda} disponibles`
    : `Agregar ${product.nombre}, $${precioFinal}, ${product.stock_tienda} en tienda`;

  return (
    <button
      type="button"
      onClick={() => !isAgotado && !disabled && onAdd(product)}
      disabled={isAgotado || disabled}
      aria-label={ariaLabel}
      className={`relative text-left bg-white rounded-2xl p-3 sm:p-3.5 border border-stone-200/90 shadow-2xs transition-all flex flex-col justify-between group active:scale-[0.97] min-h-[160px] ${
        isAgotado
          ? "opacity-50 cursor-not-allowed filter grayscale-40"
          : "hover:border-[#5B122C]/40 hover:shadow-sm cursor-pointer"
      }`}
    >
      {/* Insignia de Stock / Combo arriba a la derecha */}
      <div className="flex items-center justify-between w-full mb-2">
        {isCombo ? (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FAF3F6] text-[#5B122C] border border-[#5B122C]/15 flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" />
            <span>Combo -{product.descuento_porcentaje}%</span>
          </span>
        ) : (
          <span className="text-[10px] font-medium text-stone-400 truncate max-w-[90px]">
            {product.categoriaNombre || ""}
          </span>
        )}

        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${stockBadgeClass}`}
        >
          {stockBadgeText}
        </span>
      </div>

      {/* Miniatura visual de frasco cosmético */}
      <div
        className="w-full h-20 rounded-xl mb-2.5 flex items-center justify-center relative overflow-hidden transition-transform group-hover:scale-105 duration-200"
        style={{ backgroundColor: product.color_fondo || "#F3E1E4" }}
      >
        {/* Gráfico representativo del envase / frasco */}
        <div className="relative flex flex-col items-center">
          <div
            className="w-4 h-2.5 rounded-t-sm shadow-xs"
            style={{ backgroundColor: "#2A2320" }}
          />
          <div
            className="w-8 h-12 rounded-b-md shadow-sm border border-black/10 flex items-center justify-center"
            style={{ backgroundColor: product.color_frasco || "#D08C98" }}
          >
            <div className="w-5 h-6 bg-white/70 rounded-xs flex items-center justify-center">
              <span className="text-[7px] font-serif text-stone-800 font-bold">N</span>
            </div>
          </div>
        </div>
      </div>

      {/* Nombre y Precio */}
      <div className="mt-auto">
        <h4 className="text-xs font-semibold text-stone-900 line-clamp-2 leading-snug group-hover:text-[#5B122C] transition-colors">
          {product.nombre}
        </h4>

        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-xs sm:text-sm font-bold text-stone-900">
            ${precioFinal.toLocaleString("es-MX", { minimumFractionDigits: 0 })}
          </span>

          {tienePrecioEspecial && (
            <span className="text-[11px] text-stone-400 line-through">
              ${product.precio.toLocaleString("es-MX", { minimumFractionDigits: 0 })}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

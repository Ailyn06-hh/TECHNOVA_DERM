"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ShoppingBag, Loader2 } from "lucide-react";
import { formatearPrecio } from "@/lib/formato";
import { useCarrito } from "@/contexts/CarritoContext";

export interface ProductCardProps {
  id: number;
  nombre: string;
  slug: string;
  categoria_nombre?: string;
  precio: number;
  precio_especial?: number | null;
  color_fondo: string;
  color_frasco: string;
  imagen_url?: string | null;
  badge?: string;
  total_stock?: number;
}

export default function ProductCard({
  id,
  nombre,
  slug,
  categoria_nombre = "Skincare",
  precio,
  precio_especial,
  color_fondo,
  color_frasco,
  imagen_url,
  badge,
  total_stock,
}: ProductCardProps) {
  const { addItem } = useCarrito();
  const [isAdding, setIsAdding] = useState(false);

  const precioFinal = precio_especial ?? precio;
  const tieneDescuento = precio_especial && precio_especial < precio;
  const isOutOfStock = typeof total_stock === "number" && total_stock <= 0;

  // Determinar insignia derecha
  let rightBadge = badge;
  if (!rightBadge && tieneDescuento) {
    rightBadge = "Precio especial";
  }

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isAdding || isOutOfStock) return;

    setIsAdding(true);
    await addItem({ producto_id: id, cantidad: 1 });
    setIsAdding(false);
  };

  return (
    <article className="group bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
      {/* 1. Área superior de imagen / ilustración con color pastel */}
      <Link
        href={`/producto/${slug}`}
        aria-label={`Ver detalle de ${nombre}`}
        className="block relative w-full aspect-[4/3] flex items-center justify-center p-6 overflow-hidden transition-transform group-hover:scale-[1.01]"
        style={{ backgroundColor: color_fondo || "#F3E1E4" }}
      >
        {imagen_url ? (
          <img
            src={imagen_url}
            alt={nombre}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="transition-transform duration-300 group-hover:scale-105">
            <svg
              width="44"
              height="68"
              viewBox="0 0 42 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {/* Tapa */}
              <rect x="15" y="2" width="12" height="14" rx="2.5" fill="#1A1715" />
              {/* Cuello */}
              <rect x="17" y="16" width="8" height="4" fill="#1A1715" />
              {/* Cuerpo del frasco */}
              <rect
                x="5"
                y="20"
                width="32"
                height="42"
                rx="9"
                fill={color_frasco || "#D08C98"}
              />
            </svg>
          </div>
        )}
      </Link>

      {/* 2. Información y Controles */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Fila Categoría y Badge */}
          <div className="flex items-center justify-between gap-2 mb-1.5 min-h-[20px]">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              {categoria_nombre}
            </span>

            {rightBadge && (
              <span
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                  rightBadge.includes("Última") || rightBadge.includes("Quedan")
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : rightBadge === "Nuevo"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-rose-50 text-[#6B1F4A] border-rose-100"
                }`}
              >
                {rightBadge}
              </span>
            )}
          </div>

          {/* Nombre */}
          <Link href={`/producto/${slug}`}>
            <h3 className="font-serif text-base sm:text-lg font-medium text-[#1A1715] leading-snug hover:text-[#6B1F4A] transition line-clamp-2">
              {nombre}
            </h3>
          </Link>
        </div>

        {/* Fila Precio y Botón Agregar */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-gray-100/80">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm sm:text-base font-semibold text-[#1A1715]">
                {formatearPrecio(precioFinal)}
              </span>
              {tieneDescuento && (
                <span className="text-xs text-gray-400 line-through">
                  {formatearPrecio(precio)}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={isAdding || isOutOfStock}
            aria-label={`Agregar ${nombre} a la bolsa`}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-semibold border transition shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#1A1715] focus:ring-offset-1 ${
              isOutOfStock
                ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                : "border-[#1A1715] text-[#1A1715] hover:bg-black/5 active:bg-black/10"
            }`}
          >
            {isAdding ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="hidden sm:inline">Agregando...</span>
              </>
            ) : isOutOfStock ? (
              <span>Agotado</span>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Agregar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

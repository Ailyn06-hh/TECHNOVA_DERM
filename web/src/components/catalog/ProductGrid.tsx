"use client";

import React, { useEffect, useRef } from "react";
import ProductCard from "@/components/home/ProductCard";

export interface CatalogProduct {
  id: number;
  sku: string;
  nombre: string;
  slug: string;
  categoria_nombre: string;
  categoria_slug: string;
  tipo_rutina?: string;
  descripcion?: string;
  precio: number;
  precio_especial: number | null;
  color_fondo: string;
  color_frasco: string;
  imagen_url?: string | null;
  total_stock: number;
  badge?: string;
  badge_color?: "amber" | "rose" | "emerald";
}

interface ProductGridProps {
  products: CatalogProduct[];
  isLoading: boolean;
  firstNewItemIndex?: number | null;
}

export default function ProductGrid({
  products,
  isLoading,
  firstNewItemIndex,
}: ProductGridProps) {
  const firstNewItemRef = useRef<HTMLDivElement>(null);

  // Mover foco a la primera tarjeta nueva tras cargar más productos
  useEffect(() => {
    if (typeof firstNewItemIndex === "number" && firstNewItemIndex > 0 && firstNewItemRef.current) {
      firstNewItemRef.current.focus();
    }
  }, [firstNewItemIndex]);

  // Si está cargando y no hay productos previos: esqueletos
  if (isLoading && products.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="animate-pulse bg-white rounded-3xl p-5 border border-slate-100 h-96 flex flex-col justify-between"
          >
            <div className="h-48 bg-slate-100 rounded-2xl" />
            <div className="space-y-3 mt-4">
              <div className="h-3 bg-slate-100 rounded w-1/3" />
              <div className="h-4 bg-slate-100 rounded w-3/4" />
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-slate-50">
              <div className="h-5 bg-slate-100 rounded w-1/4" />
              <div className="h-8 bg-slate-100 rounded-full w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      role="feed"
      aria-label="Listado de productos"
      aria-busy={isLoading}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {products.map((prod, idx) => {
        const isFirstNew = idx === firstNewItemIndex;

        return (
          <div
            key={prod.id}
            ref={isFirstNew ? firstNewItemRef : undefined}
            tabIndex={isFirstNew ? -1 : undefined}
            className="outline-none"
          >
            <ProductCard
              id={prod.id}
              nombre={prod.nombre}
              slug={prod.slug}
              categoria_nombre={prod.categoria_nombre}
              precio={prod.precio}
              precio_especial={prod.precio_especial}
              color_fondo={prod.color_fondo}
              color_frasco={prod.color_frasco}
              imagen_url={prod.imagen_url}
              badge={prod.badge}
              total_stock={prod.total_stock}
            />
          </div>
        );
      })}
    </div>
  );
}

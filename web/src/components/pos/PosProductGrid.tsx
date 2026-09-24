"use client";

import React from "react";
import PosProductCard, { PosProductData } from "./PosProductCard";
import { PackageX, Loader2 } from "lucide-react";

interface PosProductGridProps {
  products: PosProductData[];
  onAddProduct: (product: PosProductData) => void;
  isLoading?: boolean;
}

export default function PosProductGrid({
  products,
  onAddProduct,
  isLoading = false,
}: PosProductGridProps) {
  if (isLoading && products.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-stone-400">
        <Loader2 className="w-8 h-8 animate-spin text-[#5B122C] mb-3" />
        <p className="text-xs font-medium">Cargando productos y existencias...</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-stone-400">
        <div className="w-12 h-12 rounded-2xl bg-stone-100 flex items-center justify-center mb-3 text-stone-400">
          <PackageX className="w-6 h-6 stroke-[1.5]" />
        </div>
        <p className="text-sm font-medium text-stone-700">No se encontraron productos</p>
        <p className="text-xs text-stone-400 mt-1 max-w-xs font-light">
          Intenta con otra palabra clave o selecciona otra categoría de la barra.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-3.5 pb-8 overflow-y-auto">
      {products.map((prod) => (
        <PosProductCard
          key={`${prod.tipoItem || "p"}_${prod.id}`}
          product={prod}
          onAdd={onAddProduct}
        />
      ))}
    </div>
  );
}

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { X, AlertCircle, AlertTriangle, Check, Loader2 } from "lucide-react";
import { formatearPrecio } from "@/lib/formato";
import ProductThumb from "@/components/routines/ProductThumb";
import QuantitySelector from "@/components/product/QuantitySelector";
import type { CarritoItemCalculado } from "@/lib/carrito";

export interface CartItemRowProps {
  item: CarritoItemCalculado;
  onUpdateQuantity: (itemId: number, newQty: number) => Promise<void>;
  onRemoveItem: (itemId: number) => Promise<void>;
}

export default function CartItemRow({
  item,
  onUpdateQuantity,
  onRemoveItem,
}: CartItemRowProps) {
  const [isBusy, setIsBusy] = useState(false);

  const handleQtyChange = async (newQty: number) => {
    if (isBusy || newQty === item.cantidad) return;
    setIsBusy(true);
    try {
      await onUpdateQuantity(item.id, newQty);
    } finally {
      setIsBusy(false);
    }
  };

  const handleRemove = async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      await onRemoveItem(item.id);
    } finally {
      setIsBusy(false);
    }
  };

  const handleAdjustStock = () => {
    if (item.total_stock > 0) {
      handleQtyChange(item.total_stock);
    }
  };

  const isAgotado = item.estado_stock === "agotado";
  const maxAllowed = isAgotado ? 0 : Math.min(10, item.total_stock);

  // Renderizar badge de stock
  const renderStockBadge = () => {
    switch (item.estado_stock) {
      case "agotado":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-full mt-1">
            <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
            <span>Agotado · quítalo para continuar</span>
          </span>
        );
      case "insuficiente":
        return (
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-full">
              <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
              <span>Solo quedan {item.total_stock}</span>
            </span>
            <button
              type="button"
              onClick={handleAdjustStock}
              className="text-[11px] font-semibold text-[#6B1F4A] hover:underline"
            >
              Ajustar a {item.total_stock}
            </button>
          </div>
        );
      case "pocas":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50/90 border border-amber-200/80 px-2 py-0.5 rounded-full mt-1">
            <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
            <span>{item.estado_stock_texto}</span>
          </span>
        );
      case "disponible":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-normal text-emerald-700 mt-1">
            <Check className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>En stock</span>
          </span>
        );
    }
  };

  const itemLink = item.slug ? `/producto/${item.slug}` : "#";

  return (
    <div className="py-4 sm:py-5 border-b border-slate-100 last:border-b-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
      {/* 1. Lado Izquierdo: Miniatura, Nombre y Estado */}
      <div className="flex items-start gap-3.5 sm:gap-4 min-w-0">
        <ProductThumb
          nombre={item.nombre}
          slug={item.slug}
          color_fondo={item.color_fondo}
          color_frasco={item.color_frasco}
          size="md"
        />

        <div className="min-w-0 flex-1">
          <Link
            href={itemLink}
            className="font-serif text-sm sm:text-base font-medium text-slate-900 hover:text-[#6B1F4A] transition-colors leading-snug line-clamp-1"
            title={item.nombre}
          >
            {item.nombre}
          </Link>

          {/* Estado de stock debajo del nombre */}
          <div>{renderStockBadge()}</div>

          {/* Aviso si cambió de precio */}
          {item.cambioPrecio && (
            <p className="text-[11px] text-amber-800 mt-1 font-normal">
              El precio cambió de {formatearPrecio(item.cambioPrecio.antes)} a{" "}
              {formatearPrecio(item.cambioPrecio.ahora)}
            </p>
          )}
        </div>
      </div>

      {/* 2. Lado Derecho: Selector de cantidad, Precio y Botón Quitar */}
      <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-50">
        <div className="relative">
          <QuantitySelector
            quantity={item.cantidad}
            max={Math.max(1, maxAllowed)}
            min={1}
            disabled={isBusy || isAgotado}
            onChange={handleQtyChange}
            ariaLabel={`Cantidad de ${item.nombre}`}
          />
          {isBusy && (
            <div className="absolute inset-0 bg-white/70 rounded-full flex items-center justify-center">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6B1F4A]" />
            </div>
          )}
        </div>

        {/* Precio vigente alineado */}
        <div className="text-right min-w-[70px]">
          <span className="text-sm sm:text-base font-semibold text-slate-900 block">
            {formatearPrecio(item.subtotal)}
          </span>
          {item.cantidad > 1 && !isAgotado && (
            <span className="text-[10px] text-slate-400 block">
              {formatearPrecio(item.precio_vigente)} c/u
            </span>
          )}
        </div>

        {/* Botón × para quitar artículo */}
        <button
          type="button"
          onClick={handleRemove}
          disabled={isBusy}
          aria-label={`Quitar ${item.nombre} del carrito`}
          className="p-1.5 rounded-full text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[#6B1F4A] active:scale-95"
          title="Quitar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

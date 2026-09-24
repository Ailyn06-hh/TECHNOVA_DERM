"use client";

import React, { useState } from "react";
import { ShoppingBag, Loader2, AlertCircle } from "lucide-react";
import StarRating from "./StarRating";
import AvailabilityCard from "./AvailabilityCard";
import QuantitySelector from "./QuantitySelector";
import FavoriteButton from "./FavoriteButton";
import { formatearPrecio } from "@/lib/formato";
import { useCarrito } from "@/contexts/CarritoContext";
import { DisponibilidadProducto } from "@/lib/disponibilidad";

export interface ProductInfoData {
  id: number;
  nombre: string;
  slug: string;
  categoria_nombre: string;
  contenido?: string | null;
  descripcion: string;
  precio: number;
  precio_especial: number | null;
  total_stock: number;
  promedio_resenas: number;
  total_resenas: number;
}

interface ProductInfoProps {
  producto: ProductInfoData;
  disponibilidad: DisponibilidadProducto;
}

export default function ProductInfo({ producto, disponibilidad }: ProductInfoProps) {
  const { addItem } = useCarrito();
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);

  const {
    id,
    nombre,
    slug,
    categoria_nombre,
    contenido,
    descripcion,
    precio,
    precio_especial,
    total_stock,
    promedio_resenas,
    total_resenas,
  } = producto;

  const precioFinal = precio_especial ?? precio;
  const tieneDescuento = precio_especial && precio_especial < precio;
  const isOutOfStock = total_stock <= 0;

  // Etiqueta de stock si es de 1 a 5
  const stockBadge =
    total_stock >= 1 && total_stock <= 5
      ? total_stock === 1
        ? "Última pieza"
        : `Últimas ${total_stock} piezas`
      : null;

  // Máximo permitido a seleccionar (hasta 10 o stock total)
  const maxAllowed = Math.min(10, Math.max(1, total_stock));

  const handleAddToCart = async () => {
    if (isOutOfStock || isAdding) return;

    setIsAdding(true);
    setStockError(null);

    const result = await addItem({
      producto_id: id,
      cantidad: quantity,
    });

    if (!result.success) {
      setStockError(result.message || result.error || "Sin stock disponible.");
    } else {
      setQuantity(1); // Restablecer selector a 1 tras agregar
    }

    setIsAdding(false);
  };

  return (
    <div className="flex flex-col justify-start">
      
      {/* 1. Categoría, Contenido y Badge de Stock */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {categoria_nombre} {contenido ? `· ${contenido}` : ""}
        </span>

        {stockBadge && (
          <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80">
            {stockBadge}
          </span>
        )}
      </div>

      {/* 2. Título principal en serif grande */}
      <h1 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-slate-900 leading-snug mb-3">
        {nombre}
      </h1>

      {/* 3. Calificación con estrellas */}
      <div className="mb-5">
        <StarRating
          promedio={promedio_resenas}
          totalResenas={total_resenas}
          showLink={true}
        />
      </div>

      {/* 4. Precios */}
      <div className="flex items-baseline gap-3 mb-6">
        <span className="font-serif text-3xl font-semibold text-slate-900">
          {formatearPrecio(precioFinal)}
        </span>

        {tieneDescuento && (
          <>
            <span className="text-base text-slate-400 line-through">
              {formatearPrecio(precio)}
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-[#6B1F4A] border border-rose-100">
              Precio especial
            </span>
          </>
        )}
      </div>

      {/* 5. Descripción */}
      <p className="text-xs sm:text-sm text-slate-600 font-light leading-relaxed mb-6 max-w-xl">
        {descripcion}
      </p>

      {/* 6. Tarjeta de Disponibilidad */}
      <AvailabilityCard disponibilidad={disponibilidad} />

      {/* 7. Fila de Compra */}
      <div className="flex items-center gap-3 pt-2">
        {!isOutOfStock && (
          <QuantitySelector
            quantity={quantity}
            max={maxAllowed}
            onChange={(q) => {
              setQuantity(q);
              setStockError(null);
            }}
            disabled={isAdding}
          />
        )}

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isOutOfStock || isAdding}
          className={`flex-1 py-3 px-6 rounded-full text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-sm ${
            isOutOfStock
              ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
              : "bg-[#6B1F4A] hover:bg-[#531839] text-white hover:shadow active:scale-[0.99] cursor-pointer"
          }`}
        >
          {isAdding ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Agregando...</span>
            </>
          ) : isOutOfStock ? (
            <span>Agotado</span>
          ) : (
            <>
              <ShoppingBag className="w-4 h-4" />
              <span>Agregar al carrito</span>
            </>
          )}
        </button>

        {/* Botón Favoritos */}
        <FavoriteButton productoId={id} productSlug={slug} />
      </div>

      {/* Mensaje de error de stock si aplica */}
      {stockError && (
        <div className="flex items-center gap-1.5 text-xs text-rose-600 mt-2.5 font-light animate-fade-in">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{stockError}</span>
        </div>
      )}

    </div>
  );
}

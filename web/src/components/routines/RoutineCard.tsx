"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ShoppingBag, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { formatearPrecio } from "@/lib/formato";
import { useCarrito } from "@/contexts/CarritoContext";
import ProductThumb from "./ProductThumb";
import type { RutinaArmada } from "@/lib/recomendaciones";

export interface RoutineCardProps {
  rutina: RutinaArmada;
  tipoPielLabel: string;
  onRefresh?: () => void;
  onAnnounce?: (message: string) => void;
}

export default function RoutineCard({
  rutina,
  tipoPielLabel,
  onRefresh,
  onAnnounce,
}: RoutineCardProps) {
  const { refreshCart, showToast } = useCarrito();
  const [isAdding, setIsAdding] = useState(false);

  const {
    clave,
    nombre,
    descripcion,
    descuentoPorcentaje,
    disponible,
    pasoFaltante,
    mensajeIndisponible,
    productos,
    totalOriginal,
    totalConDescuento,
  } = rutina;

  const handleAgregarRutina = async () => {
    if (!disponible || isAdding) return;

    setIsAdding(true);
    try {
      const res = await fetch("/api/carrito/rutina", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clave,
          tipoPiel: rutina.tipoPiel,
          productoIds: productos.map((p) => p.id),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Si falló por falta de stock o cambio en catálogo, avisar y refrescar
        showToast({
          message: data.message || data.error || "No se pudo agregar la rutina.",
          type: "error",
        });
        if (onAnnounce) {
          onAnnounce(`Error al agregar rutina: ${data.message || data.error}`);
        }
        if (onRefresh) {
          onRefresh();
        }
        return;
      }

      await refreshCart();

      showToast({
        message: "Rutina agregada a tu bolsa",
        type: "success",
        linkHref: "/carrito",
        linkLabel: "Ver bolsa",
      });

      if (onAnnounce) {
        onAnnounce(`Rutina ${nombre} agregada a tu bolsa con éxito.`);
      }
    } catch {
      showToast({
        message: "Error de conexión al agregar la rutina.",
        type: "error",
      });
      if (onAnnounce) {
        onAnnounce("Error de conexión al agregar la rutina.");
      }
    } finally {
      setIsAdding(false);
    }
  };

  const ariaBoton = `Agregar ${nombre} para ${tipoPielLabel.toLowerCase()}, ${formatearPrecio(totalConDescuento)}`;

  return (
    <article className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
      {/* 1. Encabezado de la Tarjeta */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-2">
          <h3 className="font-serif text-xl sm:text-2xl font-medium text-slate-900 leading-snug">
            {nombre}
          </h3>
          <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-[#6B1F4A] border border-rose-100 shadow-2xs">
            <Sparkles className="w-3 h-3 text-[#6B1F4A]" />
            <span>-{descuentoPorcentaje}% rutina</span>
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-500 font-light leading-relaxed mb-6">
          {descripcion}
        </p>

        {/* 2. Fila de miniaturas de cada producto con CSS y color de frasco */}
        <div className="flex items-center gap-3 sm:gap-4 mb-6 p-3 rounded-2xl bg-[#FAFAF8] border border-slate-100/80 overflow-x-auto">
          {productos.map((prod, idx) => (
            <ProductThumb
              key={prod.id}
              nombre={prod.nombre}
              slug={prod.slug}
              color_fondo={prod.color_fondo}
              color_frasco={prod.color_frasco}
              stepNumber={idx + 1}
              size="md"
            />
          ))}
        </div>

        {/* 3. Lista numerada de los productos con sus precios alineados a la derecha */}
        <div className="space-y-3 mb-6">
          {productos.map((prod, idx) => (
            <div
              key={prod.id}
              className="flex items-start justify-between gap-3 text-xs sm:text-sm py-1 border-b border-slate-100/70 last:border-b-0"
            >
              <div className="flex items-start gap-2 text-slate-700 min-w-0">
                <span className="font-semibold text-slate-400 shrink-0 select-none">
                  {idx + 1}.
                </span>
                <Link
                  href={`/producto/${prod.slug}`}
                  className="font-normal hover:text-[#6B1F4A] hover:underline transition-colors truncate"
                  title={prod.nombre}
                >
                  {prod.nombre}
                </Link>
                {/* TODO: Permitir al usuario cambiar este producto por otra opción disponible para este paso */}
              </div>

              <span className="font-medium text-slate-900 shrink-0">
                {formatearPrecio(prod.precio_especial ?? prod.precio)}
              </span>
            </div>
          ))}
        </div>

        {/* Alerta de no disponibilidad si falta stock en algún paso */}
        {!disponible && (
          <div className="mb-4 p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {mensajeIndisponible || "Esta rutina no está disponible hoy"}
              {pasoFaltante ? ` (Falta ${pasoFaltante.toLowerCase()} con stock disponible)` : ""}.
            </span>
          </div>
        )}
      </div>

      {/* 4. Pie de la Tarjeta: Total y Botón */}
      <div className="pt-4 border-t border-slate-100">
        <div className="flex items-baseline gap-2.5 mb-4">
          <span className="sr-only">
            Antes {formatearPrecio(totalOriginal)}, ahora {formatearPrecio(totalConDescuento)}
          </span>
          <span className="text-2xl font-bold text-slate-900 tracking-tight" aria-hidden="true">
            {formatearPrecio(totalConDescuento)}
          </span>
          {totalOriginal > totalConDescuento && (
            <span className="text-sm text-slate-400 line-through" aria-hidden="true">
              {formatearPrecio(totalOriginal)}
            </span>
          )}
        </div>

        <button
          onClick={handleAgregarRutina}
          disabled={!disponible || isAdding}
          aria-label={ariaBoton}
          className={`w-full py-3.5 px-5 rounded-full text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-sm ${
            !disponible
              ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
              : "bg-[#6B1F4A] hover:bg-[#531839] text-white hover:shadow active:scale-[0.98]"
          }`}
        >
          {isAdding ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Agregando rutina...</span>
            </>
          ) : !disponible ? (
            <span>No disponible hoy</span>
          ) : (
            <>
              <ShoppingBag className="w-4 h-4" />
              <span>Agregar rutina</span>
            </>
          )}
        </button>
      </div>
    </article>
  );
}

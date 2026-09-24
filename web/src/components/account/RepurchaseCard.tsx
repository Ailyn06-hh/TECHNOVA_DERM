"use client";

import React, { useState } from "react";
import { X, ShoppingBag, Loader2, Sparkles } from "lucide-react";
import { useCarrito } from "@/contexts/CarritoContext";
import { formatearPrecio } from "@/lib/formato";
import type { SugerenciaRecompra } from "@/lib/recomendaciones";

interface RepurchaseCardProps {
  recompra: SugerenciaRecompra | null;
  onDismiss?: () => void;
}

export default function RepurchaseCard({
  recompra,
  onDismiss,
}: RepurchaseCardProps) {
  const { addItem, showToast } = useCarrito();
  const [isAdding, setIsAdding] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!recompra || dismissed) return null;

  const handleRecomprar = async () => {
    if (isAdding) return;
    setIsAdding(true);
    try {
      const res = await addItem({
        producto_id: recompra.productoId,
        cantidad: 1,
      });

      if (!res.success) {
        showToast({
          message: res.message || "No se pudo agregar el producto.",
          type: "error",
        });
      }
    } catch {
      showToast({
        message: "Error al agregar producto.",
        type: "error",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDismiss = async () => {
    setIsDismissing(true);
    setDismissed(true);
    try {
      await fetch("/api/cuenta/recompra/descartar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productoId: recompra.productoId }),
      });
      if (onDismiss) onDismiss();
    } catch (err) {
      console.error("Error al descartar recompra:", err);
    }
  };

  return (
    <div className="relative bg-[#FDF6F7] rounded-3xl p-6 sm:p-7 border border-[#F7E5E8] shadow-xs flex flex-col justify-between h-full">
      {/* Botón discreto de cerrar en la esquina superior derecha */}
      <button
        type="button"
        onClick={handleDismiss}
        disabled={isDismissing}
        aria-label={`Ocultar sugerencia de ${recompra.nombre}`}
        className="absolute top-5 right-5 w-7 h-7 rounded-full bg-white/70 hover:bg-white text-slate-400 hover:text-slate-700 flex items-center justify-center transition shadow-2xs focus:outline-none"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div>
        {/* Encabezado: ES HORA DE RECOMPRAR */}
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#6B1F4A] tracking-wider uppercase mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Es hora de recomprar</span>
        </div>

        {/* Bloque central: Miniatura y texto */}
        <div className="flex items-start gap-4 mb-5">
          {/* Miniatura del producto en recuadro blanco */}
          <div
            className="w-16 h-20 rounded-2xl bg-white border border-[#F3DEE2] flex items-center justify-center shrink-0 shadow-2xs relative overflow-hidden"
            style={{ backgroundColor: recompra.color_fondo || "#FFFFFF" }}
          >
            <div
              className="w-7 h-12 rounded-lg shadow-xs"
              style={{ backgroundColor: recompra.color_frasco || "#6B1F4A" }}
            />
          </div>

          <div className="min-w-0 pr-6">
            <h3 className="font-serif text-base sm:text-lg font-medium text-slate-900 leading-snug">
              {recompra.nombre}
            </h3>
            <p className="text-xs text-slate-600 font-light mt-1 leading-relaxed">
              Tu fórmula de <span className="font-medium text-slate-800">{recompra.tiempoRelativo}</span> ya casi se termina.
            </p>
            {recompra.tienePrecioEspecial && (
              <p className="text-xs font-medium text-[#6B1F4A] mt-1">
                Hoy tiene precio especial.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Botón Recomprar */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleRecomprar}
          disabled={isAdding}
          className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-full bg-[#6B1F4A] hover:bg-[#531839] text-white text-xs sm:text-sm font-medium transition shadow-xs active:scale-[0.98]"
        >
          {isAdding ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Agregando...</span>
            </>
          ) : (
            <>
              <ShoppingBag className="w-4 h-4" />
              <span>Recomprar por {formatearPrecio(recompra.precioVigente)}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

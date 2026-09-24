"use client";

import React, { useState } from "react";
import { ChevronDown, Package } from "lucide-react";
import { formatearPrecio } from "@/lib/formato";

export interface OrderItem {
  id: number;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  descuento?: number;
  grupo_tipo?: string;
}

export interface OrderItemsCollapsibleProps {
  items: OrderItem[];
  totales: {
    subtotal: number;
    descuento: number;
    costo_envio: number;
    total: number;
  };
}

export default function OrderItemsCollapsible({
  items,
  totales,
}: OrderItemsCollapsibleProps) {
  const [abierto, setAbierto] = useState(false);

  if (!items || items.length === 0) return null;

  return (
    <div className="border-t border-slate-100 pt-4 mt-4">
      {/* Botón plegable */}
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        aria-expanded={abierto}
        aria-controls="order-items-collapse"
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#6B1F4A] font-medium py-1 transition-colors cursor-pointer"
      >
        <Package className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{abierto ? "Ocultar productos" : `Ver productos (${items.length})`}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            abierto ? "rotate-180 text-[#6B1F4A]" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Contenido desplegable */}
      {abierto && (
        <div
          id="order-items-collapse"
          className="mt-4 pt-3 border-t border-slate-100 text-left space-y-3 animate-in fade-in duration-200"
        >
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="pr-4">
                  <p className="font-serif font-medium text-slate-900 leading-tight">
                    {item.nombre}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span>Cantidad: {item.cantidad}</span>
                    <span>·</span>
                    <span>{formatearPrecio(item.precio_unitario)} c/u</span>
                    {item.grupo_tipo && (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-sm capitalize">
                        {item.grupo_tipo}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-semibold text-slate-800">
                    {formatearPrecio(item.precio_unitario * item.cantidad)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Desglose de Totales */}
          <div className="bg-[#FAF8F5] rounded-xl p-3.5 text-xs space-y-1.5 border border-slate-200/50 mt-3">
            <div className="flex justify-between text-slate-500 font-light">
              <span>Subtotal</span>
              <span>{formatearPrecio(totales.subtotal)}</span>
            </div>
            {totales.descuento > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>Descuentos aplicados</span>
                <span>-{formatearPrecio(totales.descuento)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-500 font-light">
              <span>Envío</span>
              <span>
                {totales.costo_envio === 0 ? "GRATIS" : formatearPrecio(totales.costo_envio)}
              </span>
            </div>
            <div className="flex justify-between text-slate-900 font-bold font-serif pt-1.5 border-t border-slate-200 text-sm">
              <span>Total</span>
              <span>{formatearPrecio(totales.total)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

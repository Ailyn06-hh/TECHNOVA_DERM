"use client";

import React from "react";
import Link from "next/link";
import { Sparkles, AlertCircle, Lock } from "lucide-react";
import { formatearPrecio } from "@/lib/formato";
import ProductThumb from "@/components/routines/ProductThumb";
import PayButton from "./PayButton";
import type { CarritoItemCalculado, LineaDescuento } from "@/lib/carrito";

export interface CheckoutSummaryProps {
  items: CarritoItemCalculado[];
  subtotal: number;
  lineasDescuento: LineaDescuento[];
  costoEnvio: number;
  lineaEntrega: string;
  total: number;
  isPagarEnTienda: boolean;
  isProcessing: boolean;
  errorMessage: string | null;
  onPay: () => void;
  canPay: boolean;
}

export default function CheckoutSummary({
  items,
  subtotal,
  lineasDescuento,
  costoEnvio,
  lineaEntrega,
  total,
  isPagarEnTienda,
  isProcessing,
  errorMessage,
  onPay,
  canPay,
}: CheckoutSummaryProps) {
  const totalItemsCount = items.reduce((acc, i) => acc + i.cantidad, 0);

  return (
    <aside className="lg:sticky lg:top-24 bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-xs flex flex-col justify-between transition-all">
      <div>
        {/* Título Serif */}
        <div className="flex items-baseline justify-between pb-3 border-b border-slate-100 mb-4">
          <h2 className="font-serif text-2xl font-medium text-slate-900 tracking-tight">
            Resumen
          </h2>
          <span className="text-xs text-slate-400 font-light">
            {totalItemsCount} {totalItemsCount === 1 ? "artículo" : "artículos"}
          </span>
        </div>

        {/* Lista de productos de la orden */}
        <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 pr-1 mb-5">
          {items.map((item) => (
            <div key={item.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <ProductThumb
                  nombre={item.nombre}
                  slug={item.slug}
                  color_fondo={item.color_fondo}
                  color_frasco={item.color_frasco}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="font-serif font-medium text-slate-900 truncate leading-snug" title={item.nombre}>
                    {item.nombre}
                  </p>
                  <span className="text-slate-400 text-[11px]">
                    Cant: {item.cantidad} {item.cantidad > 1 ? `· ${formatearPrecio(item.precio_vigente)} c/u` : ""}
                  </span>
                </div>
              </div>

              <span className="font-semibold text-slate-800 shrink-0">
                {formatearPrecio(item.subtotal)}
              </span>
            </div>
          ))}
        </div>

        {/* Desglose de precios y descuentos */}
        <div className="space-y-3 text-xs text-slate-600 mb-6 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-light">Subtotal</span>
            <span className="font-medium text-slate-800">{formatearPrecio(subtotal)}</span>
          </div>

          {/* Descuentos de grupo en color vino con signo menos */}
          {lineasDescuento.map((linea, idx) => (
            <div
              key={`${linea.grupo_id}-${idx}`}
              className="flex items-center justify-between text-[#6B1F4A]"
            >
              <div className="flex items-center gap-1.5 min-w-0 pr-2">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate font-medium">{linea.nombre}</span>
              </div>
              <span className="font-semibold shrink-0">
                -{formatearPrecio(linea.monto)}
              </span>
            </div>
          ))}

          {/* Línea de entrega */}
          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-light">Entrega</span>
            <span className="font-medium text-slate-800">{lineaEntrega}</span>
          </div>
        </div>

        {/* Total General */}
        <div className="pt-4 border-t border-slate-100 mb-6">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-base font-medium text-slate-900">Total</span>
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {formatearPrecio(total)}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 block text-right">
            IVA incluido en todos los precios
          </span>
        </div>

        {/* Mensaje de error arriba del botón sin borrar la selección */}
        {errorMessage && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-fade-in"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Botón de pago */}
        <PayButton
          total={total}
          isPagarEnTienda={isPagarEnTienda}
          isProcessing={isProcessing}
          disabled={!canPay}
          onClick={onPay}
        />

        {/* Candado y aviso */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-light mt-3 mb-4">
          <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Tus productos se apartan en cuanto pagas</span>
        </div>
      </div>

      {/* Enlace de regreso al carrito */}
      <div className="text-center pt-3 border-t border-slate-100">
        <Link
          href="/carrito"
          className="text-xs font-medium text-slate-600 hover:text-[#6B1F4A] hover:underline underline-offset-4 transition-colors"
        >
          Editar bolsa de compras
        </Link>
      </div>
    </aside>
  );
}

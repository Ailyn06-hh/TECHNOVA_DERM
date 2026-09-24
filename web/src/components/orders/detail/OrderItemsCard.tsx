"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, Package } from "lucide-react";

export interface OrderItemDetail {
  id: number;
  productoId: number;
  nombre: string;
  slug: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  totalLinea: number;
  grupoTipo?: string | null;
  grupoClave?: string | null;
  colorFondo?: string;
  colorFrasco?: string;
  imagenUrl?: string | null;
  disponibleDevolucion?: number;
}

interface OrderItemsCardProps {
  items: OrderItemDetail[];
  subtotal: number;
  descuento: number;
  costoEnvio: number;
  total: number;
  totalFormateado: string;
  tipoEntrega: string;
}

export default function OrderItemsCard({
  items,
  subtotal,
  descuento,
  costoEnvio,
  total,
  totalFormateado,
  tipoEntrega,
}: OrderItemsCardProps) {
  const currencyFormatter = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  });

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs">
      <div className="pb-4 mb-6 border-b border-stone-100 flex items-center justify-between">
        <h2 className="font-serif text-lg sm:text-xl font-medium text-stone-900">
          Productos en este pedido ({items.reduce((acc, it) => acc + it.cantidad, 0)})
        </h2>
      </div>

      {/* Lista de productos */}
      <ul className="divide-y divide-stone-100 mb-8" aria-label="Lista de artículos comprados">
        {items.map((item) => {
          const precioUnitarioConDescuento =
            item.cantidad > 0
              ? (item.precioUnitario * item.cantidad - item.descuento) / item.cantidad
              : item.precioUnitario;
          const tieneDescuento = item.descuento > 0;

          return (
            <li
              key={item.id}
              className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4 group"
            >
              <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                {/* Miniatura visual del producto */}
                <Link
                  href={`/tienda/producto/${item.slug}`}
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex-shrink-0 flex items-center justify-center overflow-hidden border border-stone-200/70 transition-transform group-hover:scale-105"
                  style={{ backgroundColor: item.colorFondo || "#FAF3F6" }}
                  aria-label={`Ver detalle de ${item.nombre}`}
                >
                  {item.imagenUrl ? (
                    <img
                      src={item.imagenUrl}
                      alt={item.nombre}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="w-6 h-9 rounded-sm shadow-xs border border-white/40 flex items-center justify-center"
                      style={{ backgroundColor: item.colorFrasco || "#6B1F4A" }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
                    </div>
                  )}
                </Link>

                {/* Nombre y metadatos */}
                <div className="min-w-0">
                  <Link
                    href={`/tienda/producto/${item.slug}`}
                    className="font-medium text-sm sm:text-base text-stone-900 hover:text-[#5B122C] transition-colors line-clamp-1 block"
                  >
                    {item.nombre}
                  </Link>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500 font-light">
                    <span>
                      Cant: <strong className="font-semibold text-stone-800">{item.cantidad}</strong>
                    </span>

                    <span className="text-stone-300">·</span>

                    {tieneDescuento ? (
                      <span className="flex items-center gap-1.5">
                        <span className="line-through text-stone-400">
                          {currencyFormatter.format(item.precioUnitario)}
                        </span>
                        <span className="font-medium text-[#5B122C]">
                          {currencyFormatter.format(precioUnitarioConDescuento)} c/u
                        </span>
                      </span>
                    ) : (
                      <span>{currencyFormatter.format(item.precioUnitario)} c/u</span>
                    )}

                    {item.grupoTipo === "rutina" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FAF3F6] text-[#6B1F4A] border border-[#F3E1EC]">
                        <Sparkles className="w-2.5 h-2.5" />
                        Rutina
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Total de la línea */}
              <div className="text-right shrink-0">
                <span className="font-serif font-medium text-sm sm:text-base text-stone-900">
                  {currencyFormatter.format(item.totalLinea)}
                </span>
                {tieneDescuento && (
                  <span className="block text-[11px] text-[#5B122C] font-normal">
                    Ahorraste {currencyFormatter.format(item.descuento)}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Desglose de totales */}
      <div className="border-t border-stone-200 pt-5 space-y-2 text-xs sm:text-sm text-stone-600 max-w-sm ml-auto">
        <div className="flex justify-between items-center font-light">
          <span>Subtotal</span>
          <span className="font-normal text-stone-800 font-mono">
            {currencyFormatter.format(subtotal)}
          </span>
        </div>

        {descuento > 0 && (
          <div className="flex justify-between items-center text-[#5B122C] font-medium">
            <span>Descuento aplicado</span>
            <span className="font-mono">-{currencyFormatter.format(descuento)}</span>
          </div>
        )}

        <div className="flex justify-between items-center font-light">
          <span>
            {tipoEntrega === "recoger"
              ? "Recogida en tienda"
              : tipoEntrega === "mostrador"
              ? "Entrega en sucursal"
              : "Envío a domicilio"}
          </span>
          <span className="font-normal text-stone-800 font-mono">
            {costoEnvio === 0
              ? tipoEntrega === "recoger"
                ? "Sin costo"
                : "Gratis"
              : currencyFormatter.format(costoEnvio)}
          </span>
        </div>

        <div className="border-t border-stone-200 pt-3 mt-3 flex justify-between items-baseline">
          <span className="font-serif text-base sm:text-lg font-medium text-stone-900">
            Total pagado
          </span>
          <span className="font-serif text-xl sm:text-2xl font-bold text-[#5B122C]">
            {totalFormateado || currencyFormatter.format(total)}
          </span>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useRef } from "react";
import PickupOrderRow, { PickupOrder } from "./PickupOrderRow";
import { PackageOpen } from "lucide-react";

interface PickupOrdersTableProps {
  orders: PickupOrder[];
  selectedFolio: string | null;
  onSelectOrder: (order: PickupOrder) => void;
  newFolios?: Set<string>;
}

export default function PickupOrdersTable({
  orders,
  selectedFolio,
  onSelectOrder,
  newFolios = new Set(),
}: PickupOrdersTableProps) {
  const tableRef = useRef<HTMLTableElement>(null);

  // Navegación por teclado (Flechas Arriba / Abajo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el foco está en un input o textarea
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (orders.length === 0) return;

      const currentIndex = orders.findIndex((o) => o.folio === selectedFolio);

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const nextIndex = currentIndex < orders.length - 1 ? currentIndex + 1 : 0;
        onSelectOrder(orders[nextIndex]);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : orders.length - 1;
        onSelectOrder(orders[prevIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [orders, selectedFolio, onSelectOrder]);

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-stone-200/90 p-12 text-center shadow-xs">
        <div className="w-14 h-14 mx-auto rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mb-4">
          <PackageOpen className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-stone-800">
          No hay pedidos por recoger en esta tienda
        </h3>
        <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
          Los pedidos que las clientas compren en línea, en la app o por WhatsApp para recoger aquí aparecerán automáticamente en esta lista.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table
          ref={tableRef}
          className="w-full text-left border-collapse"
          aria-label="Tabla de pedidos por recoger"
        >
          <thead>
            <tr className="border-b border-stone-200/80 bg-stone-50/50">
              <th
                scope="col"
                className="py-3 px-4 text-[11px] font-bold tracking-wider uppercase text-stone-400"
              >
                Pedido
              </th>
              <th
                scope="col"
                className="py-3 px-4 text-[11px] font-bold tracking-wider uppercase text-stone-400"
              >
                Clienta
              </th>
              <th
                scope="col"
                className="py-3 px-4 text-[11px] font-bold tracking-wider uppercase text-stone-400"
              >
                Canal
              </th>
              <th
                scope="col"
                className="py-3 px-4 text-[11px] font-bold tracking-wider uppercase text-stone-400"
              >
                Pzas
              </th>
              <th
                scope="col"
                className="py-3 px-4 text-[11px] font-bold tracking-wider uppercase text-stone-400 text-right sm:text-left"
              >
                Estado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {orders.map((order) => {
              const isSelected = order.folio === selectedFolio;
              const isNew = newFolios.has(order.folio);
              return (
                <PickupOrderRow
                  key={order.folio}
                  order={order}
                  isSelected={isSelected}
                  isNew={isNew}
                  onSelect={onSelectOrder}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

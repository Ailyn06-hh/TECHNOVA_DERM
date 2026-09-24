"use client";

import React from "react";
import { ShoppingBag, TrendingUp, PackageCheck, RotateCcw } from "lucide-react";

export interface ShiftIndicatorsData {
  ventasCount: number;
  ventasTotal: number;
  ticketPromedio: number;
  pedidosEntregados: number;
  devolucionesCount: number;
  devolucionesTotal: number;
}

interface ShiftSummaryCardsProps {
  indicadores: ShiftIndicatorsData;
}

export default function ShiftSummaryCards({ indicadores }: ShiftSummaryCardsProps) {
  const fmt = (n: number) =>
    `$${Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const cards = [
    {
      id: "ventas",
      title: "Ventas",
      value: String(indicadores.ventasCount),
      subtext: fmt(indicadores.ventasTotal),
      icon: ShoppingBag,
      color: "bg-[#FAF3F6] text-[#5B122C] border-[#5B122C]/15",
      badgeColor: "bg-[#5B122C]/10 text-[#5B122C]",
    },
    {
      id: "ticket",
      title: "Ticket promedio",
      value: fmt(indicadores.ticketPromedio),
      subtext: `${indicadores.ventasCount} transacciones`,
      icon: TrendingUp,
      color: "bg-stone-50 text-stone-700 border-stone-200/80",
      badgeColor: "bg-stone-200/60 text-stone-700",
    },
    {
      id: "entregados",
      title: "Pedidos entregados",
      value: String(indicadores.pedidosEntregados),
      subtext: "Recolección en tienda",
      icon: PackageCheck,
      color: "bg-emerald-50 text-emerald-800 border-emerald-200/70",
      badgeColor: "bg-emerald-100/80 text-emerald-800",
    },
    {
      id: "devoluciones",
      title: "Devoluciones",
      value: String(indicadores.devolucionesCount),
      subtext: fmt(indicadores.devolucionesTotal),
      icon: RotateCcw,
      color: "bg-amber-50 text-amber-900 border-amber-200/70",
      badgeColor: "bg-amber-100/80 text-amber-900",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            className={`p-4 sm:p-5 rounded-3xl border bg-white shadow-xs flex flex-col justify-between transition-all hover:shadow-sm`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-stone-500">{card.title}</span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${card.badgeColor}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div>
              <span className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight block">
                {card.value}
              </span>
              <p className="text-[11px] sm:text-xs text-stone-500 font-light mt-0.5 truncate">
                {card.subtext}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

"use client";

import React from "react";

export type InventoryFilterType = "todos" | "agotandose" | "caducando";

interface InventoryFilterTabsProps {
  activeFilter: InventoryFilterType;
  onChange: (filter: InventoryFilterType) => void;
  counts: {
    todos: number;
    agotandose: number;
    caducando: number;
  };
}

export default function InventoryFilterTabs({
  activeFilter,
  onChange,
  counts,
}: InventoryFilterTabsProps) {
  const tabs: Array<{ id: InventoryFilterType; label: string; count: number; alert?: boolean }> = [
    { id: "todos", label: "Todos", count: counts.todos },
    { id: "agotandose", label: "Por agotarse", count: counts.agotandose, alert: counts.agotandose > 0 },
    { id: "caducando", label: "Por caducar", count: counts.caducando, alert: counts.caducando > 0 },
  ];

  return (
    <div
      role="tablist"
      aria-label="Filtros de inventario"
      className="flex items-center gap-1.5 p-1 bg-stone-200/50 rounded-2xl border border-stone-200/80 select-none overflow-x-auto"
    >
      {tabs.map((tab) => {
        const isActive = activeFilter === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              isActive
                ? "bg-[#181412] text-white shadow-xs"
                : "text-stone-600 hover:text-stone-900 hover:bg-white/60"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold font-mono ${
                isActive
                  ? "bg-white/20 text-white"
                  : tab.alert
                  ? "bg-amber-100 text-amber-800"
                  : "bg-stone-200/80 text-stone-600"
              }`}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

"use client";

import React, { useRef } from "react";

export type OrderStatusTabId = "todos" | "en_curso" | "entregados" | "cancelados";

interface TabItem {
  id: OrderStatusTabId;
  label: string;
}

const TABS: TabItem[] = [
  { id: "todos", label: "Todos" },
  { id: "en_curso", label: "En curso" },
  { id: "entregados", label: "Entregados" },
  { id: "cancelados", label: "Cancelados" },
];

interface OrderStatusTabsProps {
  activeTab: OrderStatusTabId;
  onChange: (tabId: OrderStatusTabId) => void;
}

export default function OrderStatusTabs({
  activeTab,
  onChange,
}: OrderStatusTabsProps) {
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;
    if (e.key === "ArrowRight") {
      nextIndex = (index + 1) % TABS.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (index - 1 + TABS.length) % TABS.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = TABS.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    const nextTab = TABS[nextIndex];
    onChange(nextTab.id);
    tabsRef.current[nextIndex]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Filtro de estado de pedidos"
      className="inline-flex items-center gap-1.5 p-1 bg-white/80 rounded-full border border-slate-200/80 shadow-2xs backdrop-blur-xs"
    >
      {TABS.map((tab, idx) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabsRef.current[idx] = el;
            }}
            role="tab"
            id={`tab-${tab.id}`}
            aria-controls="panel-pedidos"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`px-4 py-2 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer ${
              isActive
                ? "bg-[#1A1A1A] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

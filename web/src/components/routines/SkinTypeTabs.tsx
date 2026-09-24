"use client";

import React, { useRef } from "react";

export interface TabItem {
  id: string;
  label: string;
}

export const TABS_PIEL: TabItem[] = [
  { id: "mixta", label: "Piel mixta" },
  { id: "seca", label: "Piel seca" },
  { id: "grasa", label: "Piel grasa" },
  { id: "normal", label: "Piel normal" },
  { id: "sensible", label: "Piel sensible" },
  { id: "todas", label: "Todas" },
];

export interface SkinTypeTabsProps {
  activeTab: string;
  userSkinType?: string | null;
  onSelectTab: (tabId: string) => void;
}

export default function SkinTypeTabs({
  activeTab,
  userSkinType,
  onSelectTab,
}: SkinTypeTabsProps) {
  const tabsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;

    if (e.key === "ArrowRight") {
      e.preventDefault();
      nextIndex = (index + 1) % TABS_PIEL.length;
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      nextIndex = (index - 1 + TABS_PIEL.length) % TABS_PIEL.length;
    } else if (e.key === "Home") {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      nextIndex = TABS_PIEL.length - 1;
    }

    if (nextIndex !== index) {
      tabsRef.current[nextIndex]?.focus();
      onSelectTab(TABS_PIEL[nextIndex].id);
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Filtrar rutinas por tipo de piel"
      className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-none py-1 mb-8 sm:mb-10"
    >
      {TABS_PIEL.map((tab, idx) => {
        const isActive = activeTab === tab.id;
        const isUserSkin = userSkinType === tab.id;

        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabsRef.current[idx] = el;
            }}
            role="tab"
            id={`tab-${tab.id}`}
            aria-controls={`panel-${tab.id}`}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onSelectTab(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#6B1F4A] focus:ring-offset-2 select-none ${
              isActive
                ? "bg-[#1A1715] text-white shadow-sm hover:bg-[#2C2724]"
                : "bg-white text-slate-700 border border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            <span>{tab.label}</span>

            {/* Indicador pequeño 'Tu piel' si coincide con el perfil del usuario */}
            {isUserSkin && (
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full transition-colors ${
                  isActive
                    ? "bg-rose-900/60 text-rose-200 border border-rose-700/50"
                    : "bg-rose-50 text-[#6B1F4A] border border-rose-100"
                }`}
                title="Este tipo de piel coincide con tu perfil"
              >
                Tu piel
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

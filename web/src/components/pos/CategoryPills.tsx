"use client";

import React from "react";

export interface CategoryPillItem {
  id: string;
  label: string;
}

interface CategoryPillsProps {
  categories: CategoryPillItem[];
  selectedCategory: string;
  onSelectCategory: (id: string) => void;
}

export default function CategoryPills({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryPillsProps) {
  return (
    <div
      role="tablist"
      aria-label="Categorías de productos"
      className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1"
    >
      {categories.map((cat) => {
        const isSelected = selectedCategory === cat.id;

        return (
          <button
            key={cat.id}
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelectCategory(cat.id)}
            className={`px-4 py-2.5 rounded-full text-xs font-medium whitespace-nowrap transition-all min-h-[44px] flex items-center justify-center active:scale-95 cursor-pointer ${
              isSelected
                ? "bg-stone-900 text-white shadow-xs font-semibold"
                : "bg-white text-stone-600 border border-stone-200 hover:border-stone-300 hover:bg-stone-50"
            }`}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}

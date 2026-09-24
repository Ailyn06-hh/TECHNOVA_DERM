"use client";

import React from "react";
import { Loader2 } from "lucide-react";

interface LoadMoreButtonProps {
  isLoading: boolean;
  onClick: () => void;
  label?: string;
  loadingLabel?: string;
}

export default function LoadMoreButton({
  isLoading,
  onClick,
  label = "Ver más productos",
  loadingLabel = "Cargando...",
}: LoadMoreButtonProps) {
  return (
    <div className="flex justify-center mt-10 mb-6">
      <button
        type="button"
        onClick={onClick}
        disabled={isLoading}
        className="px-8 py-3 rounded-full text-xs font-medium border border-slate-300 text-slate-800 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all shadow-2xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 text-[#6B1F4A] animate-spin" />
            <span>{loadingLabel}</span>
          </>
        ) : (
          <span>{label}</span>
        )}
      </button>
    </div>
  );
}

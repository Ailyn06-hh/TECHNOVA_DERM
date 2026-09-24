"use client";

import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock, Sparkles } from "lucide-react";

export interface StockStatusBadgeProps {
  tipo: "agotado" | "caducando" | "agotandose" | "sobrestock" | "normal";
  etiqueta?: string;
  size?: "sm" | "md";
}

export default function StockStatusBadge({
  tipo,
  etiqueta,
  size = "md",
}: StockStatusBadgeProps) {
  const isSm = size === "sm";

  switch (tipo) {
    case "agotado":
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200/90 ${
            isSm ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
          <span>{etiqueta || "Agotado"}</span>
        </span>
      );

    case "caducando":
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-orange-50 text-orange-800 border border-orange-200/90 ${
            isSm ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
          }`}
        >
          <Clock className={isSm ? "w-3 h-3 text-orange-600" : "w-3.5 h-3.5 text-orange-600"} />
          <span>{etiqueta || "Por caducar"}</span>
        </span>
      );

    case "agotandose":
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-amber-50 text-amber-800 border border-amber-200/90 ${
            isSm ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
          }`}
        >
          <AlertTriangle className={isSm ? "w-3 h-3 text-amber-600" : "w-3.5 h-3.5 text-amber-600"} />
          <span>{etiqueta || "Por agotarse"}</span>
        </span>
      );

    case "sobrestock":
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/90 ${
            isSm ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          <span>{etiqueta || "Sobrestock"}</span>
        </span>
      );

    case "normal":
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-stone-100 text-stone-600 border border-stone-200/80 ${
            isSm ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>{etiqueta || "Normal"}</span>
        </span>
      );
  }
}

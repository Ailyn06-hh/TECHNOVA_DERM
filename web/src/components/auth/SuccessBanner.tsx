"use client";

import React from "react";
import { Check } from "lucide-react";

interface SuccessBannerProps {
  message?: string;
  className?: string;
  children?: React.ReactNode;
}

export default function SuccessBanner({
  message = "Listo. El enlace vence en 30 minutos.",
  className = "",
  children,
}: SuccessBannerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`p-3.5 bg-[#E3EDE6] border border-[#D3E2D8] text-[#2C523B] text-xs sm:text-sm rounded-xl flex items-center gap-2.5 animate-fade-in shadow-xs ${className}`}
    >
      <span className="w-5 h-5 rounded-full bg-[#2C523B]/10 flex items-center justify-center shrink-0">
        <Check className="w-3.5 h-3.5 text-[#2C523B] stroke-[2.5]" />
      </span>
      <span className="font-light tracking-wide text-[#2C523B]">
        {children || message}
      </span>
    </div>
  );
}

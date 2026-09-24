"use client";

import React from "react";
import Link from "next/link";
import { Check } from "lucide-react";

export interface CheckoutStepsProps {
  currentStep?: 1 | 2 | 3;
}

export default function CheckoutSteps({ currentStep = 2 }: CheckoutStepsProps) {
  return (
    <nav aria-label="Progreso de compra" className="flex items-center gap-2 sm:gap-4 text-xs font-medium">
      {/* Paso 1: Carrito */}
      <Link
        href="/carrito"
        className="flex items-center gap-1.5 text-slate-700 hover:text-[#6B1F4A] transition-colors"
      >
        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
          <Check className="w-3 h-3 stroke-[3]" />
        </span>
        <span className="hidden sm:inline">Carrito</span>
      </Link>

      <span className="text-slate-300 font-light" aria-hidden="true">/</span>

      {/* Paso 2: Entrega y Pago (Activo) */}
      <div
        className="flex items-center gap-1.5 text-slate-900 font-semibold"
        aria-current={currentStep === 2 ? "step" : undefined}
      >
        <span className="w-5 h-5 rounded-full bg-[#1A1715] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
          2
        </span>
        <span>Entrega y pago</span>
      </div>

      <span className="text-slate-300 font-light" aria-hidden="true">/</span>

      {/* Paso 3: Confirmación */}
      <div
        className="flex items-center gap-1.5 text-slate-400"
        aria-current={currentStep === 3 ? "step" : undefined}
      >
        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[10px] font-medium shrink-0">
          3
        </span>
        <span className="hidden sm:inline">Confirmación</span>
      </div>
    </nav>
  );
}

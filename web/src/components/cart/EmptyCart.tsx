"use client";

import React from "react";
import Link from "next/link";
import { ShoppingBag, Sparkles, ArrowRight } from "lucide-react";

export default function EmptyCart() {
  return (
    <div className="bg-white rounded-3xl p-10 sm:p-14 border border-slate-100 shadow-xs text-center max-w-2xl mx-auto my-8">
      <div className="w-16 h-16 rounded-full bg-rose-50 text-[#6B1F4A] flex items-center justify-center mx-auto mb-5 shadow-2xs">
        <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
      </div>

      <h2 className="font-serif text-2xl sm:text-3xl font-medium text-slate-900 tracking-tight mb-2">
        Tu carrito está vacío
      </h2>

      <p className="text-slate-500 text-sm font-light leading-relaxed max-w-md mx-auto mb-8">
        Aún no has agregado fórmulas a tu bolsa. Descubre nuestras rutinas clínicas por tipo de piel o explora el catálogo completo.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
        <Link
          href="/rutinas"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-[#6B1F4A] hover:bg-[#531839] text-white text-xs sm:text-sm font-medium transition shadow-sm active:scale-95"
        >
          <Sparkles className="w-4 h-4" />
          <span>Ver rutinas</span>
        </Link>

        <Link
          href="/catalogo"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-medium border border-slate-200 transition active:scale-95"
        >
          <span>Ver catálogo</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

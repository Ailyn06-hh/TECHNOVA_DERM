"use client";

import React from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { NOMBRE_MARCA } from "@/lib/marca";
import CheckoutSteps from "./CheckoutSteps";
import ToastContainer from "@/components/common/ToastContainer";
import { CarritoProvider } from "@/contexts/CarritoContext";

export interface CheckoutLayoutProps {
  children: React.ReactNode;
  minimal?: boolean;
}

export default function CheckoutLayout({ children, minimal = false }: CheckoutLayoutProps) {
  return (
    <CarritoProvider>
      <div className="min-h-screen bg-[#FAF8F5] text-slate-800 flex flex-col font-sans">
        {/* Cabecera limpia y enfocada del Checkout */}
        <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
            {/* Logotipo a la izquierda con enlace a / (si es minimal) o /carrito */}
            <Link
              href={minimal ? "/" : "/carrito"}
              className="flex items-center gap-2 group shrink-0"
              title={minimal ? "Ir al inicio" : "Volver a la bolsa de compras"}
            >
              <div className="w-8 h-8 rounded-full bg-[#1A1715] text-white flex items-center justify-center font-serif text-sm font-semibold group-hover:bg-[#6B1F4A] transition-colors shadow-2xs">
                T
              </div>
              <span className="font-serif text-lg sm:text-xl font-medium tracking-tight text-slate-900 group-hover:text-[#6B1F4A] transition-colors">
                {NOMBRE_MARCA}
              </span>
            </Link>

            {!minimal && (
              <>
                {/* Indicador de pasos central */}
                <div className="shrink-0">
                  <CheckoutSteps currentStep={2} />
                </div>

                {/* Candado y Pago Seguro a la derecha */}
                <div className="flex items-center gap-1.5 text-slate-500 text-xs font-light shrink-0">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  <span className="hidden sm:inline font-medium text-slate-700">Pago seguro</span>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Contenido principal del Checkout */}
        <main className="flex-1 py-8 sm:py-12">
          {children}
        </main>

        {/* Contenedor de notificaciones toast */}
        <ToastContainer />
      </div>
    </CarritoProvider>
  );
}

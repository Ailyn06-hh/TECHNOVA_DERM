import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import AuthBrandPanel from "@/components/auth/AuthBrandPanel";
import OnboardingProgress from "@/components/onboarding/OnboardingProgress";
import { Sparkles, ArrowRight, ShoppingBag } from "lucide-react";

export const metadata: Metadata = {
  title: "Tu Rutina Recomendada · Onboarding | Technova-Derm",
  description: "Paso 2 de 3: Rutina personalizada con motor de inteligencia y dynamic pricing.",
};

export default function OnboardingRutinaPage() {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F8F5F0]">
      {/* Panel Izquierdo: ~43% de ancho en desktop, fondo color vino */}
      <AuthBrandPanel />

      {/* Panel Derecho: ~57% de ancho en desktop */}
      <div className="w-full lg:w-[57%] flex-1 flex items-center justify-center p-6 sm:p-10 xl:p-16 bg-[#F8F5F0]">
        <div className="w-full max-w-[560px] mx-auto py-8 sm:py-10">
          {/* Indicador de Progreso en Paso 2 de 3 */}
          <OnboardingProgress currentStep={2} stepTitle="Tu rutina recomendada" />

          {/* Encabezado */}
          <div className="mb-6">
            <h2 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-[#1A1715] mb-2.5">
              Tu rutina recomendada
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 font-light leading-relaxed">
              Basada en tu tipo de piel, tus objetivos de cuidado y tu presupuesto por producto.
            </p>
          </div>

          {/* Tarjeta provisional de Paso 2 con TODO */}
          <div className="p-6 sm:p-8 bg-white border border-[#EAE4DD] rounded-2xl shadow-xs mb-8">
            <div className="w-12 h-12 rounded-full bg-[#F3E1E4] flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-[#6B1F4A]" />
            </div>

            <h3 className="font-serif text-xl sm:text-2xl font-normal text-gray-900 mb-2">
              Paso 2 en preparación
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 font-light leading-relaxed mb-4">
              {/* TODO: Implementar la vista del Paso 2 (Tu rutina recomendada) con el motor de sugerencias personalizadas, análisis de ingredientes y precios dinámicos */}
              El perfil de tu piel ha sido guardado exitosamente. En el siguiente sprint se conectará la pantalla interactiva de rutina sugerida con los productos disponibles de la tienda omnicanal.
            </p>

            <div className="bg-[#FAF7F5] border border-dashed border-[#6B1F4A]/30 rounded-xl p-3.5 text-xs text-[#6B1F4A] font-mono">
              TODO: Conectar motor de recomendación de skincare y catálogo de productos filtrados por presupuesto.
            </div>
          </div>

          {/* Botón para continuar a la tienda */}
          <div>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto py-3 px-8 rounded-full bg-[#6B1F4A] hover:bg-[#58183D] active:bg-[#44122F] text-white text-xs sm:text-sm font-semibold tracking-wide transition shadow-sm"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Explorar tienda omnicanal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

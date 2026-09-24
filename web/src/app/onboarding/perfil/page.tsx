import React, { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthBrandPanel from "@/components/auth/AuthBrandPanel";
import SkinProfileForm from "@/components/onboarding/SkinProfileForm";
import { getAuthUserServer } from "@/lib/session";
import { NOMBRE_MARCA } from "@/lib/marca";

export const metadata: Metadata = {
  title: `Tu Perfil de Piel · ${NOMBRE_MARCA}`,
  description: "Personaliza tu rutina de skincare recomendada según tu tipo de piel, preocupaciones y presupuesto.",
};

export default function OnboardingPerfilPage() {
  // 1. Proteger ruta en el servidor: solo usuarios con sesión iniciada y verificada
  const user = getAuthUserServer();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F8F5F0]">
      {/* Panel Izquierdo: ~43% de ancho en desktop, fondo color vino idéntico */}
      <AuthBrandPanel />

      {/* Panel Derecho: ~57% de ancho en desktop, fondo crema, un poco más ancho para albergar los chips */}
      <div className="w-full lg:w-[57%] flex-1 flex items-center justify-center p-6 sm:p-10 xl:p-16 bg-[#F8F5F0]">
        <Suspense fallback={<div className="text-xs text-gray-400">Cargando formulario...</div>}>
          <SkinProfileForm />
        </Suspense>
      </div>
    </div>
  );
}

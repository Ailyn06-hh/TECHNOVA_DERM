import React, { Suspense } from "react";
import type { Metadata } from "next";
import AuthBrandPanel from "@/components/auth/AuthBrandPanel";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Crear Nueva Contraseña | Technova-Derm",
  description: "Crea y confirma tu nueva contraseña para acceder a Technova-Derm.",
};

interface NuevaPasswordPageProps {
  searchParams: {
    token?: string;
  };
}

export default function NuevaPasswordPage({ searchParams }: NuevaPasswordPageProps) {
  const token = searchParams?.token || "";

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F8F5F0]">
      {/* Panel Izquierdo: ~43% de ancho en desktop, fondo color vino */}
      <AuthBrandPanel />

      {/* Panel Derecho: ~57% de ancho en desktop, fondo crema con formulario centrado */}
      <div className="w-full lg:w-[57%] flex-1 flex items-center justify-center p-6 sm:p-10 xl:p-16 bg-[#F8F5F0]">
        <Suspense fallback={<div className="text-xs text-gray-400">Cargando formulario...</div>}>
          <ResetPasswordForm token={token} />
        </Suspense>
      </div>
    </div>
  );
}

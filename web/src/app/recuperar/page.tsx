import React, { Suspense } from "react";
import type { Metadata } from "next";
import AuthBrandPanel from "@/components/auth/AuthBrandPanel";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Recupera tu Contraseña | Technova-Derm",
  description: "Escribe tu correo o celular registrado para recibir un enlace seguro de restablecimiento de contraseña.",
};

export default function RecuperarPage() {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F8F5F0]">
      {/* Panel Izquierdo: ~43% de ancho en desktop, fondo color vino */}
      <AuthBrandPanel />

      {/* Panel Derecho: ~57% de ancho en desktop, fondo crema con formulario centrado */}
      <div className="w-full lg:w-[57%] flex-1 flex items-center justify-center p-6 sm:p-10 xl:p-16 bg-[#F8F5F0]">
        <Suspense fallback={<div className="text-xs text-gray-400">Cargando formulario...</div>}>
          <ForgotPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}

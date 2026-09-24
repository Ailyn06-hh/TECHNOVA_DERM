import React, { Suspense } from "react";
import type { Metadata } from "next";
import AuthBrandPanel from "@/components/auth/AuthBrandPanel";
import RegisterForm from "@/components/auth/RegisterForm";
import { NOMBRE_MARCA } from "@/lib/marca";

export const metadata: Metadata = {
  title: `Crea tu Cuenta · ${NOMBRE_MARCA}`,
  description: `Crea tu cuenta única de ${NOMBRE_MARCA} para disfrutar de compras omnicanal, carritos sincronizados y beneficios exclusivos.`,
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F8F5F0]">
      {/* Panel Izquierdo: ~43% de ancho en desktop, fondo color vino, idéntico al login */}
      <AuthBrandPanel />

      {/* Panel Derecho: ~57% de ancho en desktop, fondo crema con formulario centrado */}
      <div className="w-full lg:w-[57%] flex-1 flex items-center justify-center p-6 sm:p-10 xl:p-16 bg-[#F8F5F0]">
        <Suspense fallback={<div className="text-xs text-gray-400">Cargando formulario...</div>}>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}

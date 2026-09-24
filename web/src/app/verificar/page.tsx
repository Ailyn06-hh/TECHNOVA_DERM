import React, { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import AuthBrandPanel from "@/components/auth/AuthBrandPanel";
import VerifyForm from "@/components/auth/VerifyForm";
import { decodePendingUser, PENDING_COOKIE_NAME } from "@/lib/auth-verification";

export const metadata: Metadata = {
  title: "Verifica tu Cuenta | Technova-Derm",
  description: "Ingresa el código de 6 dígitos que enviamos a tu correo para activar tu cuenta de Technova-Derm.",
};

export default function VerifyPage() {
  const cookieStore = cookies();
  const pendingCookie = cookieStore.get(PENDING_COOKIE_NAME);
  const pendingUser = decodePendingUser(pendingCookie?.value);

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F8F5F0]">
      {/* Panel Izquierdo: ~43% de ancho en desktop, fondo color vino, idéntico a login y registro */}
      <AuthBrandPanel />

      {/* Panel Derecho: ~57% de ancho en desktop, fondo crema con contenido centrado */}
      <div className="w-full lg:w-[57%] flex-1 flex items-center justify-center p-6 sm:p-10 xl:p-16 bg-[#F8F5F0]">
        <Suspense fallback={<div className="text-xs text-gray-400">Cargando verificación...</div>}>
          <VerifyForm initialEmail={pendingUser?.correo || ""} />
        </Suspense>
      </div>
    </div>
  );
}

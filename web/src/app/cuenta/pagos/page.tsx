import React from "react";
import Link from "next/link";
import { ArrowLeft, CreditCard } from "lucide-react";
import StoreLayout from "@/components/layout/StoreLayout";

export const dynamic = "force-dynamic";

export default function CuentaPagosPage() {
  return (
    <StoreLayout>
      <div className="min-h-screen bg-[#FAF8F5] py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 border border-slate-100 shadow-xs text-center">
          <div className="w-12 h-12 bg-rose-50 text-[#6B1F4A] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-6 h-6" />
          </div>

          <h1 className="font-serif text-2xl font-medium text-slate-900 mb-2">
            Métodos de Pago Guardados
          </h1>
          <p className="text-slate-500 text-sm font-light mb-6">
            Administra tus tarjetas guardadas y preferencias de facturación.
          </p>

          <div className="bg-[#FAF9F6] border border-slate-200/70 rounded-2xl p-4 mb-6 text-left text-xs text-slate-600">
            {/* TODO: Implementar vista completa de administración de tarjetas del usuario (eliminar, cambiar predeterminada) */}
            <p>
              Próximamente podrás gestionar tus tarjetas bancarias y monederos digitales de forma completa desde tu perfil.
            </p>
          </div>

          <Link
            href="/checkout"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#6B1F4A] text-white text-xs sm:text-sm font-medium hover:bg-[#531839] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al checkout</span>
          </Link>
        </div>
      </div>
    </StoreLayout>
  );
}

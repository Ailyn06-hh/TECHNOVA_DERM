import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUserServer } from "@/lib/session";
import StoreLayout from "@/components/layout/StoreLayout";
import { ArrowLeft, CreditCard, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const user = getAuthUserServer();

  if (!user?.userId) {
    redirect("/login?volver=/checkout");
  }

  return (
    <StoreLayout>
      <div className="min-h-screen bg-[#FAF8F5] py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 sm:p-10 border border-slate-100 shadow-sm text-center">
          <div className="w-14 h-14 bg-rose-50 text-[#6B1F4A] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-7 h-7" />
          </div>

          <h1 className="font-serif text-3xl font-medium text-slate-900 mb-2">
            Pasarela de Pago y Entrega
          </h1>
          <p className="text-slate-500 text-sm font-light mb-6">
            Hola, <strong className="font-semibold text-slate-700">{user.nombre}</strong>. Esta pantalla es el paso final de pago omnicanal.
          </p>

          <div className="bg-[#FAF9F6] border border-slate-200/70 rounded-2xl p-5 mb-8 text-left space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#6B1F4A]">
              <ShieldCheck className="w-4 h-4" />
              <span>Próxima integración</span>
            </div>
            {/* TODO: Integrar pasarela de pago (Stripe/OpenPay) y selección de entrega omnicanal (recogida en sucursal o envío a domicilio) */}
            <p className="text-xs text-slate-600 font-light leading-relaxed">
              Selección de método de entrega (Recoger en tienda o Envío estándar) y procesamiento seguro de tarjeta bancaria.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/carrito"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm font-medium hover:bg-slate-50 transition active:scale-[0.98]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a mi carrito</span>
            </Link>
            <Link
              href="/catalogo"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#1A1715] text-white text-xs sm:text-sm font-medium hover:bg-[#2C2724] transition active:scale-[0.98]"
            >
              <span>Explorar catálogo</span>
            </Link>
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}

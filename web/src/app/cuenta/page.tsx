import React from "react";
import Link from "next/link";
import { User, Package, CreditCard, MapPin, ArrowRight } from "lucide-react";
import StoreLayout from "@/components/layout/StoreLayout";
import { NOMBRE_MARCA } from "@/lib/marca";

export const dynamic = "force-dynamic";

export default function CuentaPage() {
  return (
    <StoreLayout>
      <div className="min-h-screen bg-[#FAF8F5] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto bg-white rounded-3xl p-8 border border-slate-100 shadow-xs">
          <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
            <div className="w-12 h-12 rounded-full bg-[#1A1715] text-white flex items-center justify-center font-serif text-lg font-bold">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-medium text-slate-900">
                Mi Cuenta · {NOMBRE_MARCA}
              </h1>
              <p className="text-xs text-slate-500 font-light">
                Panel de control de tu cuenta y perfil de piel.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-8">
            <Link
              href="/carrito"
              className="p-5 rounded-2xl border border-slate-200/80 hover:border-[#6B1F4A] transition group text-left"
            >
              <Package className="w-5 h-5 text-[#6B1F4A] mb-2" />
              <h3 className="font-medium text-slate-900 group-hover:text-[#6B1F4A] transition-colors text-sm">
                Bolsa de Compras
              </h3>
              <p className="text-xs text-slate-500 mt-1">Revisa tus fórmulas agregadas.</p>
            </Link>

            <Link
              href="/cuenta/pagos"
              className="p-5 rounded-2xl border border-slate-200/80 hover:border-[#6B1F4A] transition group text-left"
            >
              <CreditCard className="w-5 h-5 text-[#6B1F4A] mb-2" />
              <h3 className="font-medium text-slate-900 group-hover:text-[#6B1F4A] transition-colors text-sm">
                Métodos de Pago
              </h3>
              <p className="text-xs text-slate-500 mt-1">Administra tus tarjetas guardadas.</p>
            </Link>
          </div>

          {/* TODO: Panel de cuenta completo (historial de pedidos, favoritos, perfil dermocosmético) */}
          <div className="bg-[#FAF9F6] border border-slate-200/70 rounded-2xl p-4 text-xs text-slate-600 mb-6">
            <p className="font-semibold text-slate-800 mb-1">Panel de Usuario en Construcción</p>
            <p>
              Próximamente tendrás acceso completo a tu historial de pedidos, seguimiento GPS en vivo de paquetería y recomendaciones dermatológicas personalizadas.
            </p>
          </div>

          <div className="text-center">
            <Link
              href="/catalogo"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#1A1715] hover:bg-[#2C2724] text-white text-xs sm:text-sm font-medium transition"
            >
              <span>Explorar fórmulas</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}

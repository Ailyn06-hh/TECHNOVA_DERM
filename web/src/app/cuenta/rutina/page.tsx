import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { getAuthUserServer } from "@/lib/session";
import { NOMBRE_MARCA } from "@/lib/marca";
import AccountLayout from "@/components/account/AccountLayout";
import FavoriteAlertsToggle from "@/components/routines/FavoriteAlertsToggle";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Mi Rutina y Favoritos | ${NOMBRE_MARCA}`,
  description: `Tus fórmulas favoritas y rutinas dermatológicas guardadas en ${NOMBRE_MARCA}.`,
};

export default function MiRutinaPage() {
  const user = getAuthUserServer();
  if (!user?.userId) {
    redirect("/login?volver=/cuenta/rutina");
  }

  return (
    <AccountLayout usuario={{ nombre: user.nombre, correo: user.correo }}>
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xs">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-[#6B1F4A] flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-medium text-slate-900">
              Mi Rutina y Favoritos
            </h1>
            <p className="text-xs text-slate-500 font-light mt-0.5">
              Administra tus fórmulas guardadas y personaliza tus pasos de cuidado.
            </p>
          </div>
        </div>

        {/* Interruptor de alertas de favoritos conectado a las preferencias omnicanal */}
        <div className="mb-6">
          <FavoriteAlertsToggle />
        </div>

        {/* TODO: Panel avanzado para editar pasos de rutinas guardadas y gestionar lista de favoritos */}
        <div className="bg-[#FAF9F6] border border-slate-200/70 rounded-2xl p-6 text-center text-xs text-slate-600 mb-6">
          <p className="font-semibold text-slate-800 text-sm mb-1">Sección en optimización</p>
          <p className="max-w-md mx-auto text-slate-500">
            Próximamente podrás intercambiar productos paso a paso dentro de tus rutinas guardadas y armar rutinas personalizadas de noche.
          </p>
          <div className="mt-4 flex items-center justify-center gap-4">
            <Link
              href="/rutinas"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#6B1F4A] text-white font-medium hover:bg-[#531839] transition"
            >
              <span>Explorar rutinas de 3 pasos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </AccountLayout>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { MonitorX, KeyRound, ShieldAlert } from "lucide-react";
import { NOMBRE_MARCA } from "@/lib/marca";

export default function DeviceNotRegistered() {
  return (
    <div className="bg-white rounded-3xl sm:rounded-[32px] p-8 sm:p-10 border border-stone-200/90 shadow-xl max-w-md w-full text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center mb-5 border border-amber-200/60 shadow-2xs">
        <MonitorX className="w-8 h-8 stroke-[1.8]" />
      </div>

      <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 block mb-1">
        {NOMBRE_MARCA} · Punto de Venta
      </span>

      <h1 className="font-serif text-xl sm:text-2xl font-medium text-stone-900 mb-2 leading-tight">
        Este dispositivo no está registrado como caja
      </h1>

      <p className="text-xs sm:text-sm text-stone-500 font-light mb-6 leading-relaxed">
        Por seguridad y control omnicanal, el sistema POS requiere que cada computadora o terminal física esté previamente vinculada con un código de registro de sucursal.
      </p>

      <div className="p-3.5 bg-stone-50 border border-stone-200/70 rounded-2xl text-[11px] text-stone-500 mb-6 flex items-start gap-2.5 text-left">
        <ShieldAlert className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
        <span>
          Solicita el código de vinculación de 30 días a tu supervisora o gerente de tienda.
        </span>
      </div>

      <Link
        href="/pos/registrar-dispositivo"
        className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl text-xs sm:text-sm font-semibold text-white bg-[#5B122C] hover:bg-[#480E23] active:scale-[0.98] transition-all shadow-xs cursor-pointer"
      >
        <KeyRound className="w-4 h-4" />
        <span>Registrar este dispositivo</span>
      </Link>
    </div>
  );
}

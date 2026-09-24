"use client";

import React from "react";
import { Truck, MapPin } from "lucide-react";

export interface ShippingInfoProps {
  direccionCompleta?: string;
  calle?: string;
  numero?: string;
  colonia?: string;
  cp?: string;
  ciudad?: string;
  estado?: string;
  referencias?: string;
  rangoEntrega?: string; // Ej: "Llega entre el miércoles 25 y el viernes 27 de septiembre"
}

export default function ShippingInfo({
  direccionCompleta,
  calle,
  numero,
  colonia,
  cp,
  ciudad,
  estado,
  referencias,
  rangoEntrega,
}: ShippingInfoProps) {
  const direccion =
    direccionCompleta ||
    (calle ? `${calle} #${numero}, Col. ${colonia}, C.P. ${cp}, ${ciudad}, ${estado}` : "");

  return (
    <div className="mb-6">
      {/* Recuadro de envío a domicilio con fondo crema */}
      <div className="bg-[#EFEAE2] border border-[#E2D9CC] rounded-2xl p-5 sm:p-6 text-left space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#6B1F4A] uppercase tracking-wider pb-2 border-b border-[#E2D9CC]/60">
          <Truck className="w-4 h-4" aria-hidden="true" />
          <span>Entrega a Domicilio</span>
        </div>

        <div className="flex items-start gap-3">
          <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-xs sm:text-sm text-slate-800 leading-relaxed font-light">
            <p className="font-medium text-slate-900">{direccion}</p>
            {referencias && (
              <p className="text-slate-500 italic text-[11px] mt-0.5">
                Referencias: {referencias}
              </p>
            )}
          </div>
        </div>

        {rangoEntrega && (
          <div className="pt-2 border-t border-[#E2D9CC]/60">
            <p className="text-xs sm:text-sm font-semibold text-[#1b4332] flex items-center gap-1.5">
              <span>📅</span>
              <span>{rangoEntrega}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

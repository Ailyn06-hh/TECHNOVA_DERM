"use client";

import React from "react";
import { Store, MapPin, Clock, CheckCircle2, Navigation } from "lucide-react";
import { NOMBRE_MARCA } from "@/lib/marca";

interface SucursalInfo {
  id: number;
  nombre: string;
  direccion: string;
  ciudad: string;
  latitud: number;
  longitud: number;
  horarioTexto: string;
}

interface InStoreCardProps {
  sucursal: SucursalInfo | null;
  fechaFormateada: string;
}

export default function InStoreCard({
  sucursal,
  fechaFormateada,
}: InStoreCardProps) {
  if (!sucursal) {
    return null;
  }

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${sucursal.latitud},${sucursal.longitud}`;

  return (
    <div className="bg-[#FAF7F2] rounded-3xl p-6 sm:p-7 border border-[#EAE3D9] shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#EAE3D9]">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-[#5B122C]" />
            <h2 className="font-serif text-lg sm:text-xl font-medium text-stone-900">
              Compra en tienda física
            </h2>
          </div>
          <span className="text-[11px] font-semibold tracking-wider uppercase text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Entregado en caja
          </span>
        </div>

        <div className="space-y-3.5 text-xs text-stone-700">
          <div>
            <span className="text-[11px] font-semibold text-[#5B122C] uppercase tracking-wider block">
              Sucursal de compra
            </span>
            <span className="font-serif text-base font-medium text-stone-900 block mt-0.5">
              {NOMBRE_MARCA} {sucursal.nombre}
            </span>
          </div>

          <div className="flex items-start gap-2 text-stone-600">
            <MapPin className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
            <span className="leading-relaxed">{sucursal.direccion}</span>
          </div>

          <div className="flex items-center gap-2 text-stone-600">
            <Clock className="w-4 h-4 text-stone-400 shrink-0" />
            <span>Horario: {sucursal.horarioTexto}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-[#EAE3D9]">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold bg-white border border-[#EAE3D9] text-[#5B122C] hover:bg-stone-50 hover:border-[#5B122C] transition-all shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B122C]"
        >
          <Navigation className="w-3.5 h-3.5 text-[#5B122C]" />
          <span>Ver ubicación de la sucursal</span>
        </a>
      </div>
    </div>
  );
}

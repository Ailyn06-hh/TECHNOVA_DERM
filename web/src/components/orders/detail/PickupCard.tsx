"use client";

import React from "react";
import { MapPin, Navigation, Clock, ShieldCheck, Store } from "lucide-react";
import { NOMBRE_MARCA } from "@/lib/marca";

interface SucursalInfo {
  id: number;
  nombre: string;
  direccion: string;
  direccionCorta?: string;
  ciudad: string;
  latitud: number;
  longitud: number;
  horarioTexto: string;
}

interface PickupCardProps {
  codigoRecogida?: string;
  sucursal: SucursalInfo | null;
  estado: string;
}

export default function PickupCard({
  codigoRecogida,
  sucursal,
  estado,
}: PickupCardProps) {
  if (!sucursal) {
    return null;
  }

  // Formato espaciado accesible para el código de recogida (ej. "4 8 2 7")
  const codigoSpaced = codigoRecogida ? codigoRecogida.split("").join(" ") : "----";
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${sucursal.latitud},${sucursal.longitud}`;

  return (
    <div className="bg-[#FAF7F2] rounded-3xl p-6 sm:p-7 border border-[#EAE3D9] shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#EAE3D9]">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-[#5B122C]" />
            <h2 className="font-serif text-lg sm:text-xl font-medium text-stone-900">
              Recogida en tienda
            </h2>
          </div>
          <span className="text-[11px] font-semibold tracking-wider uppercase text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            Sin costo
          </span>
        </div>

        {/* Caja de Código de Recogida */}
        {codigoRecogida && (
          <div className="bg-white rounded-2xl p-5 border border-[#EAE3D9] text-center mb-6 shadow-2xs">
            <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-widest block mb-1">
              Código de recogida
            </span>
            <div
              className="text-3xl sm:text-4xl font-mono font-bold tracking-widest text-[#5B122C] my-2 select-all"
              aria-label={`Código de recogida: ${codigoSpaced}`}
              role="text"
            >
              {codigoSpaced}
            </div>
            <p className="text-xs text-stone-600 leading-relaxed font-light mt-2 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#5B122C] shrink-0" />
              <span>Presenta este código y tu identificación oficial para recoger.</span>
            </p>
          </div>
        )}

        {/* Información de la Sucursal */}
        <div className="space-y-3.5 text-xs text-stone-700">
          <div>
            <span className="text-[11px] font-semibold text-[#5B122C] uppercase tracking-wider block">
              Sucursal
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

      {/* Botón Cómo Llegar */}
      <div className="mt-6 pt-4 border-t border-[#EAE3D9]">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold bg-white border border-[#EAE3D9] text-[#5B122C] hover:bg-stone-50 hover:border-[#5B122C] transition-all shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B122C]"
          aria-label={`Abrir ruta en Google Maps hacia la sucursal ${NOMBRE_MARCA} ${sucursal.nombre}`}
        >
          <Navigation className="w-3.5 h-3.5 text-[#5B122C]" />
          <span>Cómo llegar en Google Maps</span>
        </a>
      </div>
    </div>
  );
}

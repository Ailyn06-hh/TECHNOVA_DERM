"use client";

import React from "react";

export interface PickupCodeProps {
  codigo?: string | null;
  sucursalNombre?: string;
  direccionCorta?: string;
  disponibilidadTexto?: string; // Ej: "Disponible desde hoy a las 16:00 en Roma Norte"
}

export default function PickupCode({
  codigo,
  sucursalNombre,
  direccionCorta,
  disponibilidadTexto,
}: PickupCodeProps) {
  if (!codigo) return null;

  // Formato accesible: dígito por dígito con espacios para lectores de pantalla (ej: "4 8 2 7")
  const codigoEspaciado = codigo.split("").join(" ");

  return (
    <div className="mb-6">
      {/* Recuadro con fondo crema oscuro */}
      <div className="bg-[#EFEAE2] border border-[#E2D9CC] rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center sm:items-center justify-between gap-4 text-center sm:text-left">
        {/* Código en serif grande */}
        <div className="shrink-0 sm:border-r sm:border-[#DCD2C3] sm:pr-6 sm:mr-2">
          <span
            className="font-serif text-3xl sm:text-4xl font-bold tracking-[0.25em] text-slate-900 block select-all font-mono"
            aria-label={`Código de recogida: ${codigoEspaciado}`}
          >
            {codigo}
          </span>
        </div>

        {/* Mensaje descriptivo a su lado */}
        <div className="flex-1">
          <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
            Tu código de recogida. Muéstralo en caja; también lo tienes en la app y en tu cuenta.
          </p>
          {sucursalNombre && (
            <p className="text-xs text-slate-500 mt-1 font-light">
              Recolección en <span className="font-medium text-slate-700">{sucursalNombre}</span>
            </p>
          )}
        </div>
      </div>

      {/* Debajo del recuadro, texto pequeño discreto en gris */}
      {disponibilidadTexto && (
        <p className="text-[12px] sm:text-xs text-slate-500 font-light mt-2 text-center sm:text-left px-1">
          {disponibilidadTexto}
        </p>
      )}
    </div>
  );
}

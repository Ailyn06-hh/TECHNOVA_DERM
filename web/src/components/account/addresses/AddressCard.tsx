"use client";

import React from "react";
import { MapPin } from "lucide-react";

export interface AddressItem {
  id: number;
  alias: string;
  calle_y_numero: string;
  numero_interior?: string | null;
  colonia: string;
  codigo_postal: string;
  ciudad: string;
  estado: string;
  referencias?: string | null;
  predeterminada: boolean;
}

interface AddressCardProps {
  direccion: AddressItem;
  isEditing?: boolean;
  onEdit: (dir: AddressItem) => void;
  onDelete: (dir: AddressItem) => void;
  onSetDefault: (dir: AddressItem) => void;
}

export default function AddressCard({
  direccion,
  isEditing = false,
  onEdit,
  onDelete,
  onSetDefault,
}: AddressCardProps) {
  const linea1 = [
    direccion.calle_y_numero,
    direccion.numero_interior ? `int. ${direccion.numero_interior}` : null,
    direccion.colonia,
  ]
    .filter(Boolean)
    .join(", ");

  const linea2 = `${direccion.ciudad}, ${direccion.estado} · CP ${direccion.codigo_postal}`;

  return (
    <article
      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        direccion.predeterminada
          ? "border-[#5B122C] ring-1 ring-[#5B122C]/15 bg-white shadow-2xs"
          : isEditing
          ? "border-[#5B122C] bg-[#FAF3F6]/40"
          : "border-stone-200 bg-white hover:border-stone-300"
      }`}
      aria-labelledby={`address-title-${direccion.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <MapPin className="w-4 h-4 text-[#5B122C] shrink-0" />
          <h3
            id={`address-title-${direccion.id}`}
            className="font-semibold text-sm text-stone-900"
          >
            {direccion.alias}
          </h3>

          {direccion.predeterminada && (
            <span className="bg-[#FAF3F6] text-[#6B1F4A] border border-[#F3E1EC] px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide">
              Predeterminada
            </span>
          )}
        </div>

        {/* Acciones Editar y Eliminar */}
        <div className="flex items-center gap-3 text-xs shrink-0">
          <button
            type="button"
            onClick={() => onEdit(direccion)}
            className="text-[#5B122C] hover:underline font-semibold transition-colors cursor-pointer"
            aria-label={`Editar dirección ${direccion.alias}`}
          >
            Editar
          </button>
          <span className="text-stone-300" aria-hidden="true">·</span>
          <button
            type="button"
            onClick={() => onDelete(direccion)}
            className="text-stone-400 hover:text-rose-600 transition-colors cursor-pointer"
            aria-label={`Eliminar dirección ${direccion.alias}`}
          >
            Eliminar
          </button>
        </div>
      </div>

      {/* Líneas de domicilio */}
      <div className="mt-2 text-xs text-stone-500 font-light space-y-0.5 leading-relaxed pl-6">
        <p className="text-stone-700">{linea1}</p>
        <p>{linea2}</p>
        {direccion.referencias && (
          <p className="text-[11px] text-stone-400 italic pt-0.5">
            Ref: {direccion.referencias}
          </p>
        )}
      </div>

      {/* Enlace discreto para hacer predeterminada si no lo es */}
      {!direccion.predeterminada && (
        <div className="mt-3 pt-2.5 border-t border-stone-100 pl-6">
          <button
            type="button"
            onClick={() => onSetDefault(direccion)}
            className="text-[11px] text-stone-500 hover:text-[#5B122C] hover:underline font-medium cursor-pointer"
          >
            Hacer predeterminada
          </button>
        </div>
      )}
    </article>
  );
}

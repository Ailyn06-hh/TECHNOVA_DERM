import React from "react";
import { CheckCircle2, Store, Truck, XCircle } from "lucide-react";
import { DisponibilidadProducto } from "@/lib/disponibilidad";

interface AvailabilityCardProps {
  disponibilidad: DisponibilidadProducto;
}

export default function AvailabilityCard({ disponibilidad }: AvailabilityCardProps) {
  const { isOutOfStock, lineaDisponibilidad, lineaRecogida, lineaEnvio, puedeRecogerHoy } =
    disponibilidad;

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-2xs space-y-3.5 my-6">
      
      {/* Renglón 1: Disponibilidad General */}
      <div className="flex items-start gap-3">
        {isOutOfStock ? (
          <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        )}
        <div className="text-xs">
          <p
            className={`font-medium ${
              isOutOfStock ? "text-rose-700" : "text-emerald-800"
            }`}
          >
            {lineaDisponibilidad}
          </p>
        </div>
      </div>

      {/* Renglón 2: Recogida en Tienda */}
      <div className="flex items-start gap-3">
        <Store
          className={`w-4 h-4 shrink-0 mt-0.5 ${
            puedeRecogerHoy ? "text-[#6B1F4A]" : "text-slate-400"
          }`}
        />
        <div className="text-xs">
          <p
            className={`leading-relaxed ${
              isOutOfStock
                ? "text-slate-400"
                : puedeRecogerHoy
                ? "text-slate-700 font-normal"
                : "text-slate-500 font-light"
            }`}
          >
            {lineaRecogida}
          </p>
        </div>
      </div>

      {/* Renglón 3: Envío a Domicilio */}
      <div className="flex items-start gap-3">
        <Truck
          className={`w-4 h-4 shrink-0 mt-0.5 ${
            isOutOfStock ? "text-slate-300" : "text-slate-600"
          }`}
        />
        <div className="text-xs">
          <p
            className={`leading-relaxed ${
              isOutOfStock ? "text-slate-400" : "text-slate-700 font-normal"
            }`}
          >
            {lineaEnvio}
          </p>
        </div>
      </div>

    </div>
  );
}

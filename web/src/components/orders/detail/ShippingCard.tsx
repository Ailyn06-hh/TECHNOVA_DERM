"use client";

import React from "react";
import { Truck, MapPin, ExternalLink, Package } from "lucide-react";

interface ShippingAddress {
  calle?: string;
  numero?: string;
  colonia?: string;
  cp?: string;
  ciudad?: string;
  estado?: string;
  referencias?: string;
}

interface ShippingCardProps {
  envio?: ShippingAddress;
  paqueteria?: string;
  numeroGuia?: string;
  urlRastreo?: string;
  estado: string;
}

export default function ShippingCard({
  envio,
  paqueteria,
  numeroGuia,
  urlRastreo,
  estado,
}: ShippingCardProps) {
  const direccionCompleta = [
    envio?.calle ? `${envio.calle} ${envio.numero || ""}`.trim() : null,
    envio?.colonia ? `Col. ${envio.colonia}` : null,
    envio?.cp ? `CP ${envio.cp}` : null,
    envio?.ciudad && envio?.estado ? `${envio.ciudad}, ${envio.estado}` : envio?.ciudad,
  ]
    .filter(Boolean)
    .join(", ");

  const trackingLink =
    urlRastreo ||
    (paqueteria && numeroGuia
      ? `https://www.google.com/search?q=rastreo+${encodeURIComponent(
          paqueteria
        )}+${encodeURIComponent(numeroGuia)}`
      : null);

  return (
    <div className="bg-[#FAF7F2] rounded-3xl p-6 sm:p-7 border border-[#EAE3D9] shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#EAE3D9]">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#5B122C]" />
            <h2 className="font-serif text-lg sm:text-xl font-medium text-stone-900">
              Envío a domicilio
            </h2>
          </div>
          <span className="text-[11px] font-semibold tracking-wider uppercase text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
            {estado === "entregado" ? "Entregado" : "En ruta"}
          </span>
        </div>

        {/* Datos de Entrega */}
        <div className="space-y-4 text-xs text-stone-700">
          <div>
            <span className="text-[11px] font-semibold text-[#5B122C] uppercase tracking-wider block mb-1">
              Dirección de entrega
            </span>
            <div className="flex items-start gap-2 text-stone-700">
              <MapPin className="w-4 h-4 text-stone-400 mt-0.5 shrink-0" />
              <p className="leading-relaxed">
                {direccionCompleta || "Dirección registrada con tu cuenta"}
              </p>
            </div>
            {envio?.referencias && (
              <p className="mt-1 text-stone-500 italic pl-6 text-[11px]">
                Ref: {envio.referencias}
              </p>
            )}
          </div>

          {/* Paquetería y Guía */}
          {(paqueteria || numeroGuia) && (
            <div className="bg-white rounded-2xl p-4 border border-[#EAE3D9] space-y-1.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                  Paquetería
                </span>
                <span className="font-medium text-stone-900">{paqueteria || "Mensajería"}</span>
              </div>
              {numeroGuia && (
                <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                  <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                    Número de guía
                  </span>
                  <span className="font-mono text-xs font-semibold text-[#5B122C] select-all">
                    {numeroGuia}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Botón Rastrear */}
      {trackingLink && (
        <div className="mt-6 pt-4 border-t border-[#EAE3D9]">
          <a
            href={trackingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold bg-white border border-[#EAE3D9] text-[#5B122C] hover:bg-stone-50 hover:border-[#5B122C] transition-all shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5B122C]"
            aria-label={`Rastrear envío en ${paqueteria || "la paquetería"}`}
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#5B122C]" />
            <span>Rastrear paquete</span>
          </a>
        </div>
      )}
    </div>
  );
}

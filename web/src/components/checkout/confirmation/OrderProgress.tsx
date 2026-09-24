"use client";

import React from "react";
import { Check } from "lucide-react";
import { PasoSeguimiento } from "@/lib/pedidos";

export interface OrderProgressProps {
  pasos: PasoSeguimiento[];
}

export default function OrderProgress({ pasos }: OrderProgressProps) {
  if (!pasos || pasos.length === 0) return null;

  return (
    <div className="py-4 mb-6">
      <h2 className="sr-only">Estado del pedido</h2>
      <ol
        className="grid grid-cols-4 gap-2 relative text-center"
        aria-label="Progreso del pedido"
      >
        {pasos.map((paso, idx) => {
          const esCompletado = paso.estado === "completado";
          const esActual = paso.estado === "actual";
          const esPendiente = paso.estado === "pendiente";

          return (
            <li
              key={paso.id}
              className="flex flex-col items-center relative"
              aria-current={esActual ? "step" : undefined}
            >
              {/* Barra / Conector horizontal hacia el siguiente paso */}
              {idx < pasos.length - 1 && (
                <div
                  className={`absolute top-3.5 left-[50%] right-[-50%] h-[2px] z-0 transition-colors ${
                    esCompletado && (pasos[idx + 1].estado === "completado" || pasos[idx + 1].estado === "actual")
                      ? "bg-[#1b4332]"
                      : "bg-slate-200"
                  }`}
                  aria-hidden="true"
                />
              )}

              {/* Indicador del paso */}
              <div className="relative z-10 mb-2">
                {esCompletado ? (
                  <div
                    className="w-7 h-7 rounded-full bg-[#1b4332] text-white flex items-center justify-center shadow-xs"
                    aria-hidden="true"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                ) : esActual ? (
                  <div
                    className="w-7 h-7 rounded-full bg-[#1b4332] text-white flex items-center justify-center ring-4 ring-emerald-100 shadow-xs"
                    aria-hidden="true"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                  </div>
                ) : (
                  <div
                    className="w-7 h-7 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                  </div>
                )}
              </div>

              {/* Nombre del paso */}
              <span
                className={`text-xs leading-tight transition-colors ${
                  esActual
                    ? "font-bold text-slate-900"
                    : esCompletado
                    ? "font-medium text-slate-800"
                    : "font-normal text-slate-400"
                }`}
              >
                {paso.nombre}
              </span>

              {/* Hora pequeña en gris para pasos completados */}
              {esCompletado && paso.hora ? (
                <span
                  className="text-[11px] text-slate-400 font-mono mt-0.5"
                  title={`Completado a las ${paso.hora}`}
                >
                  {paso.hora}
                </span>
              ) : (
                <span className="text-[11px] text-transparent select-none mt-0.5" aria-hidden="true">
                  --:--
                </span>
              )}

              {/* Descripción completa para lectores de pantalla */}
              <span className="sr-only">
                {paso.descripcionAccesible}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

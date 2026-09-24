"use client";

import React from "react";
import { Check, Clock, AlertCircle, MessageSquare } from "lucide-react";
import type { PasoSeguimiento } from "@/lib/pedidos-utils";

export type { PasoSeguimiento };

interface OrderTimelineProps {
  pasos: PasoSeguimiento[];
  ultimaActualizacion?: string;
}

export default function OrderTimeline({
  pasos,
  ultimaActualizacion,
}: OrderTimelineProps) {
  if (!pasos || pasos.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-xs">
      <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="font-serif text-lg sm:text-xl font-medium text-stone-900">
            Seguimiento del pedido
          </h2>
        </div>
        {ultimaActualizacion && (
          <span className="text-[11px] text-stone-400 font-light flex items-center gap-1">
            <Clock className="w-3 h-3 text-stone-400" />
            Actualizado en vivo
          </span>
        )}
      </div>

      <ol
        className="relative border-l-2 border-stone-200 ml-4 sm:ml-5 space-y-7 pb-2"
        aria-label="Línea de tiempo del pedido"
      >
        {pasos.map((paso, index) => {
          const isCompleted = paso.estado === "completado";
          const isCurrent = paso.estado === "actual";
          const isCancelled = paso.estado === "cancelado";
          const isPending = paso.estado === "pendiente";

          const titulo = paso.nombre;
          const fechaHora =
            paso.fechaHoraTexto ||
            (paso.fecha && paso.hora ? `${paso.fecha} · ${paso.hora}` : paso.fecha || paso.hora);

          const notaTexto = paso.nota || paso.pista;

          return (
            <li
              key={`${paso.id}-${index}`}
              className="relative pl-6 sm:pl-7 group"
              aria-current={isCurrent ? "step" : undefined}
            >
              {/* Círculo indicador del estado */}
              <div
                className={`absolute -left-[17px] top-0.5 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                  isCompleted
                    ? "bg-[#1B4332] text-white shadow-xs"
                    : isCurrent
                    ? "bg-[#1B4332] text-white ring-4 ring-emerald-100 shadow-sm"
                    : isCancelled
                    ? "bg-rose-700 text-white"
                    : "bg-stone-50 border-2 border-stone-300 text-stone-300"
                }`}
                aria-hidden="true"
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 stroke-[2.5]" />
                ) : isCurrent ? (
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-300 animate-ping" />
                ) : isCancelled ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-stone-300" />
                )}
              </div>

              {/* Contenido del paso */}
              <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                <div>
                  <h3
                    className={`text-sm sm:text-base font-medium tracking-tight ${
                      isCurrent
                        ? "text-[#1B4332] font-semibold"
                        : isCompleted
                        ? "text-stone-900"
                        : isCancelled
                        ? "text-rose-800"
                        : "text-stone-400 font-normal"
                    }`}
                  >
                    {titulo}
                  </h3>

                  {/* Nota o mensaje del estado */}
                  {notaTexto && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-stone-600">
                      {isCurrent && (paso.id === "listo_para_recoger" || paso.nota?.toLowerCase().includes("whatsapp")) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <MessageSquare className="w-3 h-3 text-emerald-600" />
                          {notaTexto}
                        </span>
                      ) : (
                        <span className="text-stone-500 font-light">
                          {notaTexto}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Fecha y hora */}
                {fechaHora ? (
                  <span className="text-xs font-mono text-stone-500 font-normal shrink-0">
                    {fechaHora}
                  </span>
                ) : isPending ? (
                  <span className="text-[11px] text-stone-400 font-light italic shrink-0">
                    Pendiente
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

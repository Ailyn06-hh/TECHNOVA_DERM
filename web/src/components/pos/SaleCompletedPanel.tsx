"use client";

import React from "react";
import { CheckCircle2, Printer, Plus, AlertCircle } from "lucide-react";
import type { ReciboVentaData } from "./PrintableReceipt";

interface SaleCompletedPanelProps {
  recibo: ReciboVentaData;
  onNewSale: () => void;
  onPrint: () => void;
}

export default function SaleCompletedPanel({
  recibo,
  onNewSale,
  onPrint,
}: SaleCompletedPanelProps) {
  let metodoTexto = "Efectivo";
  if (recibo.metodo_pago === "tarjeta_terminal") metodoTexto = "Tarjeta Bancaria";
  if (recibo.metodo_pago === "mixto") metodoTexto = "Pago Mixto";

  const esEfectivo = recibo.metodo_pago === "efectivo" || (recibo.metodo_pago === "mixto" && (recibo.cambio || 0) > 0);

  return (
    <div className="flex-1 flex flex-col justify-between p-6 sm:p-7 bg-white h-full animate-fade-in">
      <div>
        {/* Ícono y Éxito */}
        <div className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center mb-3 shadow-xs">
            <CheckCircle2 className="w-9 h-9 stroke-[2]" />
          </div>

          <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 block mb-0.5">
            Ticket {recibo.folio}
          </span>

          <h3 className="font-serif text-2xl font-bold text-stone-900">
            Venta Cobrada
          </h3>

          <p className="text-xs text-stone-400 font-light mt-0.5">
            {recibo.fechaHoraTexto} · {metodoTexto}
          </p>
        </div>

        {/* Resumen del Monto y Cambio */}
        <div className="my-5 p-5 rounded-2xl bg-stone-50 border border-stone-200/90 text-center space-y-3">
          <div>
            <span className="text-xs text-stone-500 font-medium">Total cobrado</span>
            <p className="font-serif text-3xl font-extrabold text-stone-900 mt-0.5">
              ${recibo.total.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          {esEfectivo && (
            <div className="pt-3 border-t border-stone-200/70">
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
                Cambio a entregar
              </span>
              <p className="font-serif text-3xl font-black text-emerald-700 mt-0.5">
                ${(recibo.cambio || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          )}
        </div>

        {/* Clienta vinculada si aplica */}
        {recibo.clienta && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between mb-4">
            <span className="font-medium">Clienta: {recibo.clienta.nombreCompleto}</span>
            <span className="text-[11px] text-emerald-700">Historial actualizado</span>
          </div>
        )}
      </div>

      {/* Botones de Acción */}
      <div className="space-y-2.5 pt-4 border-t border-stone-100">
        <button
          type="button"
          onClick={onPrint}
          className="w-full py-3.5 rounded-2xl bg-stone-900 text-white text-xs sm:text-sm font-semibold hover:bg-stone-800 active:scale-[0.99] transition shadow-xs flex items-center justify-center gap-2 min-h-[50px] cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir ticket (80 mm)</span>
        </button>

        <button
          type="button"
          onClick={onNewSale}
          className="w-full py-3.5 rounded-2xl bg-[#5B122C] text-white font-serif text-base font-semibold shadow-md hover:bg-[#4A0E24] active:bg-[#3D0B1D] active:scale-[0.99] transition flex items-center justify-center gap-2 min-h-[52px] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva venta</span>
        </button>

        {/* TODO: Cancelar venta cobrada con permiso de supervisora */}
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => {
              alert("TODO: Cancelar o anular venta cobrada (requiere autorización y PIN de supervisora).");
            }}
            className="text-[11px] text-stone-400 hover:text-stone-600 underline font-light"
          >
            Cancelar esta venta cobrada (TODO: PIN Supervisora)
          </button>
        </div>
      </div>
    </div>
  );
}

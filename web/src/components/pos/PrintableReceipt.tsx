"use client";

import React from "react";
import { NOMBRE_MARCA, LEMA } from "@/lib/marca";

export interface ReciboVentaData {
  folio: string;
  fechaHoraTexto: string;
  total: number;
  subtotal: number;
  totalDescuento: number;
  metodo_pago: string;
  efectivo_recibido?: number;
  cambio?: number;
  autorizacion_terminal?: string | null;
  referencia_transferencia?: string | null;
  sucursal: string;
  caja: string;
  cajera: string;
  clienta?: {
    nombreCompleto: string;
    celularEnmascarado?: string;
  } | null;
  items: {
    nombre: string;
    cantidad: number;
    precio_lista: number;
    subtotal: number;
  }[];
  lineasDescuento?: {
    concepto: string;
    monto: number;
  }[];
}

interface PrintableReceiptProps {
  recibo: ReciboVentaData;
}

export default function PrintableReceipt({ recibo }: PrintableReceiptProps) {
  let metodoTexto = "Efectivo";
  if (recibo.metodo_pago === "tarjeta_terminal") metodoTexto = "Tarjeta Bancaria";
  if (recibo.metodo_pago === "transferencia") metodoTexto = "Transferencia SPEI";
  if (recibo.metodo_pago === "mixto") metodoTexto = "Pago Mixto (Efectivo + Tarjeta)";

  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #pos-printable-receipt,
          #pos-printable-receipt * {
            visibility: visible !important;
          }
          #pos-printable-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 !important;
            padding: 4mm !important;
            background: white !important;
            color: black !important;
            font-family: 'Courier New', Courier, monospace !important;
            font-size: 11px !important;
            line-height: 1.3 !important;
          }
          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      `}</style>

      <div
        id="pos-printable-receipt"
        className="hidden print:block text-black bg-white text-[11px] leading-tight font-mono p-4"
      >
        {/* Encabezado */}
        <div className="text-center pb-3 border-b border-dashed border-black">
          <h2 className="text-base font-bold uppercase tracking-wider">
            {NOMBRE_MARCA}
          </h2>
          <p className="text-[10px] italic">{LEMA}</p>
          <p className="text-[10px] mt-1 font-bold">{recibo.sucursal}</p>
          <p className="text-[10px]">{recibo.caja} · Atendió: {recibo.cajera}</p>
        </div>

        {/* Metadatos del ticket */}
        <div className="py-2 border-b border-dashed border-black text-[10px]">
          <div className="flex justify-between">
            <span>TICKET: <strong>{recibo.folio}</strong></span>
            <span>{recibo.fechaHoraTexto}</span>
          </div>

          {recibo.clienta && (
            <div className="mt-1">
              <span>CLIENTA: {recibo.clienta.nombreCompleto}</span>
              {recibo.clienta.celularEnmascarado && (
                <span className="block text-[9px]">{recibo.clienta.celularEnmascarado}</span>
              )}
            </div>
          )}
        </div>

        {/* Lista de productos */}
        <div className="py-2 border-b border-dashed border-black">
          <div className="flex justify-between font-bold text-[10px] mb-1">
            <span>DESCRIPCIÓN</span>
            <span>TOTAL</span>
          </div>

          <div className="space-y-1">
            {recibo.items.map((it, idx) => (
              <div key={idx} className="flex justify-between items-start text-[10px]">
                <div className="pr-2 flex-1">
                  <span>{it.nombre}</span>
                  <span className="block text-[9px] text-stone-600">
                    {it.cantidad} × ${it.precio_lista.toFixed(2)}
                  </span>
                </div>
                <span className="font-bold shrink-0">
                  ${it.subtotal.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Totales y Descuentos */}
        <div className="py-2 border-b border-dashed border-black space-y-1 text-[10px]">
          <div className="flex justify-between">
            <span>SUBTOTAL:</span>
            <span>${recibo.subtotal.toFixed(2)}</span>
          </div>

          {recibo.lineasDescuento && recibo.lineasDescuento.map((desc, dIdx) => (
            <div key={dIdx} className="flex justify-between text-[9px]">
              <span>- {desc.concepto}:</span>
              <span>-${desc.monto.toFixed(2)}</span>
            </div>
          ))}

          <div className="flex justify-between text-xs font-bold pt-1 border-t border-black">
            <span>TOTAL:</span>
            <span>${recibo.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Pago y Cambio */}
        <div className="py-2 border-b border-dashed border-black text-[10px] space-y-0.5">
          <div className="flex justify-between">
            <span>FORMA DE PAGO:</span>
            <span className="font-bold">{metodoTexto}</span>
          </div>

          {recibo.metodo_pago === "efectivo" && recibo.efectivo_recibido && (
            <>
              <div className="flex justify-between">
                <span>EFECTIVO RECIBIDO:</span>
                <span>${recibo.efectivo_recibido.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>CAMBIO:</span>
                <span>${(recibo.cambio || 0).toFixed(2)}</span>
              </div>
            </>
          )}

          {recibo.autorizacion_terminal && (
            <div className="flex justify-between text-[9px]">
              <span>AUTORIZACIÓN:</span>
              <span>{recibo.autorizacion_terminal}</span>
            </div>
          )}

          {recibo.referencia_transferencia && (
            <div className="flex justify-between text-[9px]">
              <span>REF. SPEI:</span>
              <span className="font-mono">{recibo.referencia_transferencia}</span>
            </div>
          )}
        </div>

        {/* Pie institucional */}
        <div className="text-center pt-3 text-[10px]">
          <p className="font-bold">¡Gracias por tu compra!</p>
          <p className="text-[9px] mt-0.5">Conserva este ticket para cualquier aclaración o devolución.</p>
          <p className="text-[8px] text-stone-500 mt-1">technovaderm.com</p>
        </div>
      </div>
    </>
  );
}

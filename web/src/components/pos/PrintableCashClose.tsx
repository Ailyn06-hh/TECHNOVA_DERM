"use client";

import React from "react";
import { NOMBRE_MARCA, LEMA } from "@/lib/marca";
import type { ArqueoValoresEsperados, ArqueoValoresContados } from "./CashCountTable";
import type { ShiftIndicatorsData } from "./ShiftSummaryCards";
import type { ConteoDenominaciones } from "./DenominationCounter";
import { DENOMINACIONES_MXN } from "./DenominationCounter";

export interface CashClosePrintData {
  esParcial: boolean;
  turnoId: number;
  sucursalNombre: string;
  cajaNombre: string;
  cajeraNombre: string;
  inicioTurno: string;
  cierreTurno: string;
  indicadores: ShiftIndicatorsData;
  esperados: ArqueoValoresEsperados;
  contados: ArqueoValoresContados;
  diferenciaTotal: number;
  desglose?: ConteoDenominaciones | null;
  notas?: string | null;
  supervisorNombre?: string | null;
}

interface PrintableCashCloseProps {
  data: CashClosePrintData | null;
}

export default function PrintableCashClose({ data }: PrintableCashCloseProps) {
  if (!data) return null;

  const fmt = (n: number) =>
    `$${Number(n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const diffEfectivo = Math.round((data.contados.efectivo - data.esperados.efectivoEsperado) * 100) / 100;
  const diffTarjeta = Math.round((data.contados.tarjeta - data.esperados.tarjetaEsperado) * 100) / 100;
  const diffTransferencia = Math.round((data.contados.transferencia - data.esperados.transferenciaEsperado) * 100) / 100;
  const totalContado = Math.round((data.contados.efectivo + data.contados.tarjeta + data.contados.transferencia) * 100) / 100;

  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #pos-printable-cash-close,
          #pos-printable-cash-close * {
            visibility: visible !important;
          }
          #pos-printable-cash-close {
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
        id="pos-printable-cash-close"
        className="hidden print:block text-black bg-white text-[11px] leading-tight font-mono p-4"
      >
        {/* Encabezado */}
        <div className="text-center pb-3 border-b border-dashed border-black">
          <h2 className="text-base font-bold uppercase tracking-wider">
            {NOMBRE_MARCA}
          </h2>
          <p className="text-[10px] italic">{LEMA}</p>
          <p className="text-[10px] mt-1 font-bold">{data.sucursalNombre}</p>
          <p className="text-[10px]">{data.cajaNombre} · {data.cajeraNombre}</p>
          <div className="mt-2 py-1 bg-black text-white font-bold text-center text-xs tracking-widest">
            {data.esParcial ? "CORTE PARCIAL (X)" : "CORTE DE CAJA FINAL (Z)"}
          </div>
        </div>

        {/* Metadatos del turno */}
        <div className="py-2 border-b border-dashed border-black text-[10px] space-y-0.5">
          <div className="flex justify-between">
            <span>TURNO: <strong>#{data.turnoId}</strong></span>
            <span>{data.esParcial ? "ESTADO: ABIERTO" : "ESTADO: CERRADO"}</span>
          </div>
          <div className="flex justify-between">
            <span>INICIO:</span>
            <span>{data.inicioTurno}</span>
          </div>
          <div className="flex justify-between">
            <span>CORTE:</span>
            <span>{data.cierreTurno}</span>
          </div>
        </div>

        {/* Resumen operativo */}
        <div className="py-2 border-b border-dashed border-black text-[10px] space-y-1">
          <div className="font-bold uppercase tracking-wider text-[9px]">
            RESUMEN DE OPERACIONES
          </div>
          <div className="flex justify-between">
            <span>Ventas Mostrador:</span>
            <span>{data.indicadores.ventasCount} ({fmt(data.indicadores.ventasTotal)})</span>
          </div>
          <div className="flex justify-between">
            <span>Ticket Promedio:</span>
            <span>{fmt(data.indicadores.ticketPromedio)}</span>
          </div>
          <div className="flex justify-between">
            <span>Pedidos Recogidos:</span>
            <span>{data.indicadores.pedidosEntregados}</span>
          </div>
          <div className="flex justify-between">
            <span>Devoluciones:</span>
            <span>{data.indicadores.devolucionesCount} ({fmt(data.indicadores.devolucionesTotal)})</span>
          </div>
        </div>

        {/* Arqueo de valores */}
        <div className="py-2 border-b border-dashed border-black text-[10px] space-y-1">
          <div className="font-bold uppercase tracking-wider text-[9px]">
            ARQUEO Y CUADRE DE VALORES
          </div>

          <div className="flex justify-between">
            <span>Fondo Inicial:</span>
            <span>{fmt(data.esperados.fondoInicial)}</span>
          </div>
          <div className="flex justify-between">
            <span>Ventas Efectivo:</span>
            <span>{fmt(data.esperados.efectivoVentas)}</span>
          </div>

          <div className="pt-1 border-t border-dotted border-black">
            <div className="flex justify-between">
              <span>EFECTIVO ESPERADO:</span>
              <span>{fmt(data.esperados.efectivoEsperado)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>EFECTIVO CONTADO:</span>
              <span>{fmt(data.contados.efectivo)}</span>
            </div>
            <div className="flex justify-between text-[9px]">
              <span>DIFERENCIA EFECTIVO:</span>
              <span>{fmt(diffEfectivo)}</span>
            </div>
          </div>

          <div className="pt-1 border-t border-dotted border-black">
            <div className="flex justify-between">
              <span>TARJETA ESPERADA:</span>
              <span>{fmt(data.esperados.tarjetaEsperado)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>TARJETA CONTADA:</span>
              <span>{fmt(data.contados.tarjeta)}</span>
            </div>
            <div className="flex justify-between text-[9px]">
              <span>DIFERENCIA TARJETA:</span>
              <span>{fmt(diffTarjeta)}</span>
            </div>
          </div>

          <div className="pt-1 border-t border-dotted border-black">
            <div className="flex justify-between">
              <span>TRANSFERENCIA ESPERADA:</span>
              <span>{fmt(data.esperados.transferenciaEsperado)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>TRANSFERENCIA CONTADA:</span>
              <span>{fmt(data.contados.transferencia)}</span>
            </div>
            <div className="flex justify-between text-[9px]">
              <span>DIFERENCIA TRANSF.:</span>
              <span>{fmt(diffTransferencia)}</span>
            </div>
          </div>

          <div className="pt-2 border-t-2 border-black font-bold">
            <div className="flex justify-between text-[11px]">
              <span>TOTAL ESPERADO:</span>
              <span>{fmt(data.esperados.totalEsperado)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>TOTAL CONTADO:</span>
              <span>{fmt(totalContado)}</span>
            </div>
            <div className="flex justify-between text-[11px] pt-1 border-t border-dashed border-black">
              <span>DIFERENCIA TOTAL:</span>
              <span>{fmt(data.diferenciaTotal)}</span>
            </div>
          </div>
        </div>

        {/* Desglose de billetes y monedas (si existe) */}
        {data.desglose && Object.values(data.desglose).some((c) => c > 0) && (
          <div className="py-2 border-b border-dashed border-black text-[9px] space-y-0.5">
            <div className="font-bold uppercase tracking-wider text-[9px]">
              DESGLOSE DE EFECTIVO
            </div>
            {DENOMINACIONES_MXN.map((d) => {
              const qty = data.desglose?.[d.id] || 0;
              if (qty === 0) return null;
              return (
                <div key={d.id} className="flex justify-between">
                  <span>{qty} × {d.label}</span>
                  <span>{fmt(qty * d.valor)}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Notas y Autorización */}
        {data.supervisorNombre && (
          <div className="py-1.5 border-b border-dashed border-black text-[10px]">
            <span>AUTORIZADO POR: <strong>{data.supervisorNombre}</strong></span>
          </div>
        )}

        {data.notas && (
          <div className="py-1.5 border-b border-dashed border-black text-[9px]">
            <span className="font-bold">NOTAS:</span>
            <p className="mt-0.5 whitespace-pre-wrap">{data.notas}</p>
          </div>
        )}

        {/* Firmas */}
        <div className="pt-8 pb-3 text-center text-[10px] space-y-6">
          <div>
            <div className="w-3/4 mx-auto border-t border-black pt-1">
              {data.cajeraNombre}
            </div>
            <span className="text-[9px] text-gray-700">Firma Cajera</span>
          </div>

          <div>
            <div className="w-3/4 mx-auto border-t border-black pt-1">
              {data.supervisorNombre || "Supervisora de Turno"}
            </div>
            <span className="text-[9px] text-gray-700">Firma Supervisora</span>
          </div>
        </div>

        {/* Pie */}
        <div className="pt-2 text-center text-[9px] border-t border-dashed border-black text-gray-600">
          <p>Comprobante oficial de arqueo POS</p>
          <p>{NOMBRE_MARCA} · HackaTec 2026</p>
        </div>
      </div>
    </>
  );
}

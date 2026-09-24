"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ShieldCheck, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { formatearPrecio } from "@/lib/formato";

function SimuladoMercadoPagoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const prefId = searchParams.get("prefId") || "";
  const folio = searchParams.get("folio") || "TD-000000";
  const total = Number(searchParams.get("total") || "0");
  const successUrl = searchParams.get("success") || `/checkout/confirmacion/${folio}`;
  const failureUrl = searchParams.get("failure") || "/checkout?error=pago_rechazado";

  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = async (status: "aprobado" | "rechazado") => {
    setIsProcessing(true);
    try {
      // Disparar webhook simulado para actualizar la orden en segundo plano
      await fetch("/api/pagos/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            folio,
            estado: status,
            idTransaccion: `sim_mp_tx_${Date.now()}`,
          },
        }),
      });

      if (status === "aprobado") {
        router.push(successUrl);
      } else {
        router.push(failureUrl);
      }
    } catch {
      router.push(status === "aprobado" ? successUrl : failureUrl);
    }
  };

  return (
    <div className="min-h-screen bg-sky-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-sky-100 shadow-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-7 h-7" />
        </div>

        <h1 className="font-serif text-2xl font-medium text-slate-900 mb-1">
          Mercado Pago Sandbox
        </h1>
        <p className="text-xs text-slate-500 font-light mb-6">
          Entorno de pruebas y simulación de Checkout Pro para Technova-Derm
        </p>

        <div className="bg-slate-50 rounded-2xl p-4 mb-6 text-left text-xs text-slate-600 space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-400">Folio de pedido:</span>
            <span className="font-semibold text-slate-800">{folio}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Preferencia ID:</span>
            <span className="font-mono text-[10px] text-slate-500 truncate max-w-[180px]">{prefId}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-slate-200">
            <span className="font-medium text-slate-800">Total a pagar:</span>
            <span className="font-bold text-sm text-slate-900">{formatearPrecio(total)}</span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => handleAction("aprobado")}
            disabled={isProcessing}
            className="w-full py-3.5 px-6 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-medium flex items-center justify-center gap-2 shadow-xs transition active:scale-95"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Simular Pago Aprobado</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleAction("rechazado")}
            disabled={isProcessing}
            className="w-full py-3 px-6 rounded-full bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition active:scale-95"
          >
            <XCircle className="w-4 h-4" />
            <span>Simular Pago Rechazado</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SimuladoMercadoPagoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-sky-50 flex items-center justify-center p-4">
          <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
        </div>
      }
    >
      <SimuladoMercadoPagoContent />
    </Suspense>
  );
}

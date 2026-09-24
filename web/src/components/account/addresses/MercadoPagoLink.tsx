"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import { useCarrito } from "@/contexts/CarritoContext";

interface MercadoPagoLinkProps {
  conectado: boolean;
  cuentaMascara?: string;
  onRefresh: () => Promise<void>;
}

export default function MercadoPagoLink({
  conectado,
  cuentaMascara,
  onRefresh,
}: MercadoPagoLinkProps) {
  const { showToast } = useCarrito();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/cuenta/vinculaciones/mercadopago", {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok || !data.exito) {
        showToast({
          message: data.error || "No fue posible conectar con Mercado Pago.",
          type: "error",
        });
        return;
      }

      showToast({
        message: "Cuenta de Mercado Pago vinculada exitosamente.",
        type: "success",
      });
      await onRefresh();
    } catch {
      showToast({ message: "Error al conectar Mercado Pago.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/cuenta/vinculaciones/mercadopago", {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.exito) {
        showToast({
          message: data.error || "No fue posible desconectar Mercado Pago.",
          type: "error",
        });
        return;
      }

      showToast({
        message: "Cuenta de Mercado Pago desconectada.",
        type: "info",
      });
      setIsConfirmOpen(false);
      await onRefresh();
    } catch {
      showToast({ message: "Error al desconectar Mercado Pago.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="p-4 sm:p-5 rounded-2xl border border-stone-200 bg-white hover:border-stone-300 transition-all flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Badge MP */}
          <div className="bg-[#009EE3]/15 text-[#009EE3] font-bold text-xs px-2.5 py-1.5 rounded-lg select-none shrink-0 tracking-wider">
            MP
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-stone-900">
                Mercado Pago
              </span>
              <span className="text-stone-300">·</span>
              <span
                className={`text-xs font-medium ${
                  conectado ? "text-emerald-700" : "text-stone-400"
                }`}
              >
                {conectado ? "conectado" : "no conectado"}
              </span>
            </div>

            {conectado && cuentaMascara && (
              <p className="text-xs text-stone-500 font-light truncate mt-0.5">
                {cuentaMascara}
              </p>
            )}
          </div>
        </div>

        {/* Acción Conectar / Desconectar */}
        <div>
          {conectado ? (
            <button
              type="button"
              onClick={() => setIsConfirmOpen(true)}
              disabled={isLoading}
              className="text-stone-400 hover:text-rose-600 text-xs font-normal transition-colors cursor-pointer disabled:opacity-50"
              aria-label="Desconectar cuenta de Mercado Pago"
            >
              Desconectar
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              disabled={isLoading}
              className="text-[#5B122C] hover:underline text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              aria-label="Conectar cuenta de Mercado Pago"
            >
              {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
              <span>Conectar</span>
            </button>
          )}
        </div>
      </div>

      {/* Diálogo de Confirmación para Desconectar Mercado Pago */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="¿Desconectar cuenta de Mercado Pago?"
        description="Si desconectas tu cuenta, deberás volver a autorizarla la próxima vez que elijas pagar con Mercado Pago en el checkout."
        confirmText="Desconectar"
        cancelText="Conservar"
        isDestructive
        isLoading={isLoading}
        onConfirm={handleDisconnect}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </>
  );
}

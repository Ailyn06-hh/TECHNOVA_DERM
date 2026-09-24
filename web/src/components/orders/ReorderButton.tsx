"use client";

import React, { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useCarrito } from "@/contexts/CarritoContext";

interface ReorderButtonProps {
  folio: string;
  className?: string;
}

export default function ReorderButton({
  folio,
  className = "",
}: ReorderButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { showToast, refreshCart } = useCarrito();

  const handleReorder = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const res = await fetch(`/api/pedidos/${encodeURIComponent(folio)}/recomprar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data) {
        showToast({
          message: data?.error || "No fue posible procesar la recompra.",
          type: "error",
        });
        return;
      }

      await refreshCart();

      const isSuccess = data.toastTipo === "todo" || data.toastTipo === "parcial";
      showToast({
        message: data.toastMensaje,
        type: isSuccess ? "success" : "info",
        linkHref: isSuccess ? "/carrito" : undefined,
        linkLabel: isSuccess ? "Ver bolsa" : undefined,
        duration: 6000,
      });
    } catch (err: any) {
      console.error("[REORDER ERROR]:", err);
      showToast({
        message: "Ocurrió un error de red al intentar volver a comprar.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleReorder}
      disabled={isLoading}
      aria-label={`Volver a comprar el pedido #${folio}`}
      className={`px-4 py-2 rounded-full text-xs font-semibold border border-slate-300 text-slate-800 bg-white hover:bg-slate-50 hover:border-slate-400 active:scale-[0.98] transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 text-[#6B1F4A] animate-spin" />
          <span>Agregando...</span>
        </>
      ) : (
        <>
          <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
          <span>Volver a comprar</span>
        </>
      )}
    </button>
  );
}

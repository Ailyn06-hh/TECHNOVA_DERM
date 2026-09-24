"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowUpRight, RefreshCw } from "lucide-react";
import type { AlertaInventario } from "@/lib/pos/inventario";

interface LiveInventoryCardProps {
  onRefreshTrigger?: number;
}

export default function LiveInventoryCard({
  onRefreshTrigger = 0,
}: LiveInventoryCardProps) {
  const [alertas, setAlertas] = useState<AlertaInventario[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAlertas = async () => {
    try {
      const res = await fetch("/api/pos/inventario/alertas");
      if (res.ok) {
        const data = await res.json();
        if (data.exito && Array.isArray(data.alertas)) {
          setAlertas(data.alertas);
        }
      }
    } catch (e) {
      console.warn("Error cargando alertas de inventario:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertas();
    const interval = setInterval(fetchAlertas, 20000); // 20 segundos
    return () => clearInterval(interval);
  }, [onRefreshTrigger]);

  const renderBadge = (alerta: AlertaInventario) => {
    switch (alerta.tipoAlerta) {
      case "agotado":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-rose-50 text-rose-800 border border-rose-200/80">
            {alerta.etiquetaAlerta}
          </span>
        );
      case "agotandose":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-amber-50 text-amber-800 border border-amber-200/80">
            {alerta.etiquetaAlerta}
          </span>
        );
      case "sobrestock":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-emerald-50 text-emerald-800 border border-emerald-200/80">
            {alerta.etiquetaAlerta}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-stone-100 text-stone-700">
            {alerta.etiquetaAlerta}
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xs p-5 mt-5">
      <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-3">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700">
            Inventario en vivo{" "}
            <span className="font-normal normal-case text-stone-400">
              (compartido con la web y la app)
            </span>
          </h2>
        </div>
        <Link
          href="/pos/inventario"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#8B2844] hover:text-[#701c34] hover:underline"
        >
          <span>Ver inventario</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading && alertas.length === 0 ? (
        <div className="py-6 flex items-center justify-center text-xs text-stone-400 gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Analizando disponibilidad omnicanal...</span>
        </div>
      ) : alertas.length === 0 ? (
        <p className="text-xs text-stone-400 py-3 text-center">
          Todos los niveles de inventario se encuentran estables en esta sucursal.
        </p>
      ) : (
        <div className="divide-y divide-stone-100">
          {alertas.map((alerta) => (
            <div
              key={alerta.productoId}
              className="py-2.5 flex items-center justify-between text-xs gap-3"
            >
              <div className="min-w-0 flex-1">
                <span className="font-semibold text-stone-900 block truncate">
                  {alerta.nombre}
                </span>
                <span className="text-stone-500 font-normal">
                  <strong className="font-semibold text-stone-700">
                    {alerta.disponibles} disponibles
                  </strong>
                  {" · "}
                  <span>
                    {alerta.apartadas}{" "}
                    {alerta.apartadas === 1 ? "apartada" : "apartadas"}
                  </span>
                </span>
              </div>
              <div className="shrink-0">{renderBadge(alerta)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

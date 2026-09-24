"use client";

import React, { useState, useEffect, useCallback } from "react";
import ActiveOrderCard, { ActiveOrderData } from "./ActiveOrderCard";
import RepurchaseCard from "./RepurchaseCard";
import SkinProfileCard, { SkinProfileData } from "./SkinProfileCard";
import SavedRoutineCard, { SavedRoutineData } from "./SavedRoutineCard";
import RecentOrdersCard, { RecentOrderItem } from "./RecentOrdersCard";
import type { SugerenciaRecompra } from "@/lib/recomendaciones";

export interface AccountDashboardData {
  usuario: {
    nombre: string;
    correo: string;
  };
  pedidoEnCurso: ActiveOrderData | null;
  otrosPedidosEnCursoCount: number;
  recompra: SugerenciaRecompra | null;
  perfilPiel: SkinProfileData | null;
  rutinaGuardada: SavedRoutineData | null;
  ultimosPedidos: RecentOrderItem[];
}

interface AccountDashboardClientProps {
  initialData: AccountDashboardData;
}

export default function AccountDashboardClient({
  initialData,
}: AccountDashboardClientProps) {
  const [data, setData] = useState<AccountDashboardData>(initialData);
  const [hasRepurchase, setHasRepurchase] = useState<boolean>(Boolean(initialData.recompra));

  const refreshSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/cuenta/resumen");
      if (res.ok) {
        const json = await res.json();
        setData((prev) => ({
          ...prev,
          pedidoEnCurso: json.pedidoEnCurso,
          otrosPedidosEnCursoCount: json.otrosPedidosEnCursoCount,
          recompra: json.recompra,
          perfilPiel: json.perfilPiel,
          rutinaGuardada: json.rutinaGuardada,
          ultimosPedidos: json.ultimosPedidos || [],
        }));
        setHasRepurchase(Boolean(json.recompra));
      }
    } catch (err) {
      console.error("Error al refrescar resumen de cuenta:", err);
    }
  }, []);

  // Sondeo cada 60 segundos mientras la pestaña esté visible
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const startPolling = () => {
      if (!intervalId) {
        intervalId = setInterval(() => {
          if (document.visibilityState === "visible") {
            refreshSummary();
          }
        }, 60000);
      }
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshSummary();
        startPolling();
      } else {
        stopPolling();
      }
    };

    const handleFocus = () => {
      refreshSummary();
    };

    startPolling();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refreshSummary]);

  const handleDismissRepurchase = () => {
    setHasRepurchase(false);
  };

  return (
    <div className="space-y-8">
      {/* Saludo con título en serif grande */}
      <div>
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-slate-900 tracking-tight">
          Hola, {data.usuario.nombre}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-light mt-1">
          Bienvenida a tu espacio de cuidado personal y seguimiento omnicanal.
        </p>
      </div>

      {/* Cuadrícula de tarjetas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fila 1: Pedido en curso y Recompra */}
        <div className={hasRepurchase ? "col-span-1" : "col-span-1 md:col-span-2"}>
          <ActiveOrderCard
            pedido={data.pedidoEnCurso}
            otrosCount={data.otrosPedidosEnCursoCount}
          />
        </div>

        {hasRepurchase && (
          <div className="col-span-1">
            <RepurchaseCard
              recompra={data.recompra}
              onDismiss={handleDismissRepurchase}
            />
          </div>
        )}

        {/* Fila 2: Perfil de piel y Rutina guardada */}
        <div className="col-span-1">
          <SkinProfileCard perfil={data.perfilPiel} />
        </div>

        <div className="col-span-1">
          <SavedRoutineCard rutina={data.rutinaGuardada} />
        </div>

        {/* Fila 3: Últimos pedidos (ancho completo) */}
        <div className="col-span-1 md:col-span-2">
          <RecentOrdersCard pedidos={data.ultimosPedidos} />
        </div>
      </div>
    </div>
  );
}

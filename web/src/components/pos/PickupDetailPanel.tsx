"use client";

import React, { useState, useEffect } from "react";
import type { PickupOrder } from "./PickupOrderRow";
import PickupCodeInput from "./PickupCodeInput";
import PrepareChecklist from "./PrepareChecklist";
import DeliverButton from "./DeliverButton";
import SupervisorUnlockModal from "./SupervisorUnlockModal";
import { PackageOpen, Info, ShieldCheck } from "lucide-react";
import { formatearPrecio } from "@/lib/formato";

interface PickupDetailPanelProps {
  order: PickupOrder | null;
  isProcessing: boolean;
  onStartPreparing: (order: PickupOrder) => Promise<void>;
  onMarkReady: (order: PickupOrder) => Promise<void>;
  onDeliverPaid: (order: PickupOrder) => Promise<void>;
  onOpenPayAndDeliver: (order: PickupOrder) => void;
  onCodeVerified: (folio: string) => void;
  onOrderUpdated: () => void;
}

export default function PickupDetailPanel({
  order,
  isProcessing,
  onStartPreparing,
  onMarkReady,
  onDeliverPaid,
  onOpenPayAndDeliver,
  onCodeVerified,
  onOrderUpdated,
}: PickupDetailPanelProps) {
  // Estado de preparación de checklist de items
  const [checkedItemIds, setCheckedItemIds] = useState<Set<number>>(new Set());
  const [supervisorModalOpen, setSupervisorModalOpen] = useState<boolean>(false);

  // Reiniciar estado local al cambiar de pedido
  useEffect(() => {
    setCheckedItemIds(new Set());
  }, [order?.folio]);

  if (!order) {
    return (
      <div
        aria-live="polite"
        className="w-full lg:w-[420px] shrink-0 bg-white border-l border-stone-200/90 min-h-screen p-8 flex flex-col items-center justify-center text-center select-none"
      >
        <div className="w-16 h-16 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mb-4">
          <PackageOpen className="w-8 h-8" />
        </div>
        <h3 className="text-base font-semibold text-stone-700">
          Selecciona un pedido para ver su detalle
        </h3>
        <p className="text-xs text-stone-400 mt-1 max-w-xs leading-relaxed font-light">
          Haz clic en cualquier pedido de la lista para preparar su empaque o validar el código de recogida de la clienta.
        </p>
      </div>
    );
  }

  const folioConHash = order.folio.startsWith("#") ? order.folio : `#${order.folio}`;

  // Forma de pago legible
  const textoMetodoPago = () => {
    if (order.porPagar) return "Paga al recoger en tienda";
    switch (order.metodoPago) {
      case "tarjeta":
        return "Pagado con tarjeta";
      case "mercado_pago":
        return "Pagado vía Mercado Pago";
      case "efectivo":
        return "Pagado en efectivo";
      default:
        return "Pagado";
    }
  };

  const canalTexto = () => {
    switch (order.canal) {
      case "app":
        return "App Móvil";
      case "whatsapp":
        return "WhatsApp";
      case "marketplace":
        return "Marketplace";
      case "tienda":
        return "Tienda";
      case "web":
      default:
        return "Tienda en Línea (Web)";
    }
  };

  const allItemsChecked =
    order.items.length > 0 && checkedItemIds.size === order.items.length;

  const handleToggleItem = (itemId: number) => {
    setCheckedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleMainActionClick = () => {
    if (order.estado === "pagado") {
      onStartPreparing(order);
    } else if (order.estado === "preparando") {
      onMarkReady(order);
    } else if (order.estado === "por_pagar_en_tienda") {
      onOpenPayAndDeliver(order);
    } else if (order.estado === "listo_para_recoger") {
      onDeliverPaid(order);
    }
  };

  return (
    <aside
      aria-live="polite"
      className="w-full lg:w-[420px] shrink-0 bg-white border-l border-stone-200/90 min-h-screen p-6 sm:p-7 flex flex-col justify-between"
    >
      <div className="space-y-6">
        {/* Cabecera del Detalle */}
        <div>
          <span className="text-[11px] font-bold tracking-widest text-stone-400 uppercase block mb-1">
            Detalle
          </span>
          <h2 className="text-2xl font-serif font-medium text-stone-900 leading-tight">
            {folioConHash} · {order.cliente.nombreCompleto}
          </h2>
          <p className="text-xs text-stone-500 font-light mt-1">
            Canal de origen: <span className="font-medium text-stone-700">{canalTexto()}</span>
            {" · "}
            <span className="font-medium text-stone-700">{textoMetodoPago()}</span>
          </p>
        </div>

        {/* Lista de Productos del Pedido */}
        <div className="border-t border-b border-stone-100 py-4">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-2">
            <span>Fórmulas ({order.piezas})</span>
            <span>Estado</span>
          </div>

          <div className="divide-y divide-stone-100">
            {order.items.map((it) => {
              const tomado = order.estado === "preparando" && checkedItemIds.has(it.id);
              const estadoLabel = tomado ? "Tomado" : "Apartado";

              return (
                <div key={it.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-stone-900 block truncate">
                      {it.nombre}
                    </span>
                    <span className="text-stone-400 text-[11px]">
                      {it.cantidad} {it.cantidad === 1 ? "pieza" : "piezas"} · {formatearPrecio(it.precioUnitario)}
                    </span>
                  </div>

                  <div className="shrink-0 text-right">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                        tomado
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200/80"
                          : "bg-stone-50 text-stone-600 border-stone-200/80"
                      }`}
                    >
                      {estadoLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Subtotal y Total */}
          <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-sm">
            <span className="font-medium text-stone-600">Total a entregar</span>
            <span className="font-bold text-stone-900 text-base">
              {formatearPrecio(order.total)}
            </span>
          </div>
        </div>

        {/* Flujo de acción según estado */}
        {order.estado === "preparando" && (
          <PrepareChecklist
            items={order.items}
            checkedIds={checkedItemIds}
            onToggleItem={handleToggleItem}
            disabled={isProcessing}
          />
        )}

        {(order.estado === "listo_para_recoger" || order.estado === "por_pagar_en_tienda") && (
          <div className="pt-1">
            <PickupCodeInput
              folio={order.folio}
              isVerified={Boolean(order.codigoVerificado)}
              isBlocked={order.bloqueado}
              onVerifiedSuccess={() => onCodeVerified(order.folio)}
              onSupervisorUnlockRequested={() => setSupervisorModalOpen(true)}
              disabled={isProcessing}
            />
          </div>
        )}
      </div>

      {/* Pie del Panel: Advertencia Omnicanal y Botón de Acción */}
      <div className="space-y-4 pt-6 mt-6 border-t border-stone-100">
        <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
          <p className="text-xs text-stone-600 leading-relaxed font-light">
            Al entregar, el pedido se marca como entregado en la web y en la app de la clienta, y ella recibe una notificación.
          </p>
        </div>

        <DeliverButton
          estado={order.estado}
          total={order.total}
          isCodeVerified={Boolean(order.codigoVerificado)}
          allChecked={allItemsChecked}
          isLoading={isProcessing}
          disabled={isProcessing}
          onClick={handleMainActionClick}
        />
      </div>

      {/* Modal para Autorización de Supervisora con PIN */}
      <SupervisorUnlockModal
        isOpen={supervisorModalOpen}
        folio={order.folio}
        onClose={() => setSupervisorModalOpen(false)}
        onSuccess={(supervisora) => {
          onCodeVerified(order.folio);
          onOrderUpdated();
        }}
      />
    </aside>
  );
}

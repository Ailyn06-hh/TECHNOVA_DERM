"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import PosShell from "@/components/pos/PosShell";
import type { PosSessionData } from "@/lib/pos-session";
import PickupSearch from "./PickupSearch";
import PickupOrdersTable from "./PickupOrdersTable";
import PickupDetailPanel from "./PickupDetailPanel";
import LiveInventoryCard from "./LiveInventoryCard";
import PickupPaymentModal from "./PickupPaymentModal";
import type { PickupOrder } from "./PickupOrderRow";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";

interface PickupOrdersPageProps {
  session: PosSessionData;
}

export default function PickupOrdersPage({ session }: PickupOrdersPageProps) {
  const [orders, setOrders] = useState<PickupOrder[]>([]);
  const [selectedFolio, setSelectedFolio] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [newFolios, setNewFolios] = useState<Set<string>>(new Set());

  // Estado para el modal de cobro (pedidos por_pagar_en_tienda)
  const [paymentModalOpen, setPaymentModalOpen] = useState<boolean>(false);
  const [orderToPay, setOrderToPay] = useState<PickupOrder | null>(null);

  // Toast / Mensajes de notificación
  const [toast, setToast] = useState<{
    tipo: "exito" | "error";
    mensaje: string;
  } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const previousFoliosRef = useRef<Set<string>>(new Set());

  const showToast = (tipo: "exito" | "error", mensaje: string) => {
    setToast({ tipo, mensaje });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Cargar pedidos por recoger con filtro de búsqueda
  const fetchOrders = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const url = `/api/pos/por-recoger?q=${encodeURIComponent(searchQuery)}`;
      const res = await fetch(url);

      if (res.ok) {
        const data = await res.json();
        if (data.exito && Array.isArray(data.pedidos)) {
          const incomingOrders: PickupOrder[] = data.pedidos;
          setOrders(incomingOrders);

          // Detectar pedidos nuevos para resaltado breve
          if (!isInitial && previousFoliosRef.current.size > 0) {
            const newlyArrived = incomingOrders
              .map((o) => o.folio)
              .filter((f) => !previousFoliosRef.current.has(f));

            if (newlyArrived.length > 0) {
              setNewFolios(new Set(newlyArrived));
              setTimeout(() => {
                setNewFolios(new Set());
              }, 4000);
            }
          }

          previousFoliosRef.current = new Set(incomingOrders.map((o) => o.folio));

          // Si el pedido seleccionado ya no está en la lista (por ejemplo fue entregado), deseleccionar
          setSelectedFolio((prev) => {
            if (!prev) return null;
            const exists = incomingOrders.some((o) => o.folio === prev);
            return exists ? prev : null;
          });
        }
      }
    } catch (err) {
      console.warn("Error cargando pedidos por recoger:", err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [searchQuery]);

  // Carga inicial y auto-actualización cada 20 segundos
  useEffect(() => {
    fetchOrders(true);
    const interval = setInterval(() => {
      fetchOrders(false);
    }, 20000); // 20 segundos

    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Debounced search al teclear en el buscador
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchOrders]);

  // Obtener objeto del pedido seleccionado
  const selectedOrder = orders.find((o) => o.folio === selectedFolio) || null;

  // Manejador de selección de pedido
  const handleSelectOrder = (order: PickupOrder) => {
    setSelectedFolio(order.folio);
  };

  // 1. Empezar a preparar (pasa a 'preparando')
  const handleStartPreparing = async (order: PickupOrder) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/pos/por-recoger/${order.folio}/preparar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "empezar" }),
      });
      const data = await res.json();
      if (res.ok && data.exito) {
        showToast("exito", `Pedido #${order.folio} en preparación`);
        await fetchOrders(false);
      } else {
        showToast("error", data.error || "No se pudo iniciar preparación");
      }
    } catch (err: any) {
      showToast("error", "Error al comunicarse con el servidor");
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Marcar como listo (pasa a 'listo_para_recoger')
  const handleMarkReady = async (order: PickupOrder) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/pos/por-recoger/${order.folio}/preparar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "marcar_listo" }),
      });
      const data = await res.json();
      if (res.ok && data.exito) {
        showToast("exito", `Pedido #${order.folio} listo para recoger · Clienta notificada`);
        await fetchOrders(false);
      } else {
        showToast("error", data.error || "No se pudo marcar como listo");
      }
    } catch (err: any) {
      showToast("error", "Error al comunicarse con el servidor");
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Entregar pedido ya pagado
  const handleDeliverPaid = async (order: PickupOrder) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/pos/por-recoger/${order.folio}/entregar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (res.ok && data.exito) {
        showToast("exito", `Pedido #${order.folio} entregado exitosamente`);
        setSelectedFolio(null);
        await fetchOrders(false);
        searchInputRef.current?.focus();
      } else if (res.status === 409 || data.yaEntregado) {
        // Detección de carrera: otra caja lo entregó
        showToast("error", data.error || "Este pedido ya fue entregado por otra colaboradora");
        setSelectedFolio(null);
        await fetchOrders(false);
      } else {
        showToast("error", data.error || "No se pudo procesar la entrega");
      }
    } catch (err: any) {
      showToast("error", "Error al comunicarse con el servidor");
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. Abrir modal para cobrar y entregar pedidos 'por_pagar_en_tienda'
  const handleOpenPayAndDeliver = (order: PickupOrder) => {
    setOrderToPay(order);
    setPaymentModalOpen(true);
  };

  // Confirmar cobro y entrega en modal
  const handleConfirmPaymentAndDeliver = async (paymentData: any) => {
    if (!orderToPay) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/pos/por-recoger/${orderToPay.folio}/entregar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paymentData),
      });
      const data = await res.json();

      if (res.ok && data.exito) {
        setPaymentModalOpen(false);
        setOrderToPay(null);
        showToast("exito", `Cobro registrado y pedido #${orderToPay.folio} entregado`);
        setSelectedFolio(null);
        await fetchOrders(false);
        searchInputRef.current?.focus();
      } else if (res.status === 409 || data.yaEntregado) {
        setPaymentModalOpen(false);
        showToast("error", data.error || "Este pedido ya fue entregado por otra colaboradora");
        setSelectedFolio(null);
        await fetchOrders(false);
      } else {
        showToast("error", data.error || "No se pudo procesar el cobro");
      }
    } catch (err: any) {
      showToast("error", "Error al comunicarse con el servidor");
    } finally {
      setIsProcessing(false);
    }
  };

  // Callback cuando se valida el código de recogida de un folio
  const handleCodeVerified = (folio: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.folio === folio ? { ...o, codigoVerificado: true } : o))
    );
  };

  return (
    <PosShell session={session}>
      {/* Notificación Toast flotante */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border animate-in slide-in-from-bottom-4 transition-all max-w-md ${
            toast.tipo === "exito"
              ? "bg-stone-900 text-white border-stone-800"
              : "bg-rose-900 text-white border-rose-800"
          }`}
        >
          {toast.tipo === "exito" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 stroke-[2.5]" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-300 shrink-0 stroke-[2.5]" />
          )}
          <span className="text-sm font-medium">{toast.mensaje}</span>
        </div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row min-h-screen bg-[#FDFBF7]">
        {/* Zona Central (fondo crema suave #FDFBF7) */}
        <main className="flex-1 p-6 sm:p-8 lg:p-10 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Cabecera y Buscador */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="font-serif text-3xl font-medium text-stone-900 tracking-tight">
                  Pedidos por recoger
                </h1>
                <p className="text-xs text-stone-500 font-light mt-1">
                  Pedidos de todos los canales que se entregan en esta tienda
                </p>
              </div>

              <div className="flex items-center gap-3">
                <PickupSearch
                  inputRef={searchInputRef}
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onClear={() => setSearchQuery("")}
                />
                <button
                  type="button"
                  onClick={() => fetchOrders(false)}
                  title="Actualizar pedidos"
                  className="p-2.5 rounded-2xl bg-white border border-stone-200/90 text-stone-500 hover:text-stone-800 hover:bg-stone-50 transition-colors shadow-xs"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tabla de Pedidos */}
            {loading ? (
              <div className="bg-white rounded-3xl border border-stone-200/90 p-12 text-center shadow-xs flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 text-[#8B2844] animate-spin" />
                <span className="text-xs text-stone-500 font-medium">
                  Cargando pedidos por recoger...
                </span>
              </div>
            ) : (
              <PickupOrdersTable
                orders={orders}
                selectedFolio={selectedFolio}
                onSelectOrder={handleSelectOrder}
                newFolios={newFolios}
              />
            )}

            {/* Inventario en Vivo (compartido con la web y la app) */}
            <LiveInventoryCard />
          </div>
        </main>

        {/* Panel Derecho (blanco, alto completo) - Detalle del Pedido */}
        <PickupDetailPanel
          order={selectedOrder}
          isProcessing={isProcessing}
          onStartPreparing={handleStartPreparing}
          onMarkReady={handleMarkReady}
          onDeliverPaid={handleDeliverPaid}
          onOpenPayAndDeliver={handleOpenPayAndDeliver}
          onCodeVerified={handleCodeVerified}
          onOrderUpdated={() => fetchOrders(false)}
        />
      </div>

      {/* Modal para Cobro en Tienda de pedidos por_pagar_en_tienda */}
      {orderToPay && (
        <PickupPaymentModal
          isOpen={paymentModalOpen}
          folio={orderToPay.folio}
          clientaNombre={orderToPay.cliente.nombreCompleto}
          total={orderToPay.total}
          onClose={() => {
            setPaymentModalOpen(false);
            setOrderToPay(null);
          }}
          onConfirmPayment={handleConfirmPaymentAndDeliver}
          isLoading={isProcessing}
        />
      )}
    </PosShell>
  );
}

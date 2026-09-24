"use client";

import React, { useState } from "react";
import NotificationList from "./NotificationList";
import NotificationPreferences, { PreferencesState } from "./NotificationPreferences";
import { NotificationData } from "./NotificationItem";
import { Check, Loader2 } from "lucide-react";

export interface NotificationsInitialData {
  notificaciones: NotificationData[];
  unreadCount: number;
  hayMas: boolean;
  nextCursor: number | null;
  preferencias: PreferencesState;
}

interface NotificationsPageProps {
  initialData: NotificationsInitialData;
}

export default function NotificationsPage({ initialData }: NotificationsPageProps) {
  const [unreadCount, setUnreadCount] = useState(initialData.unreadCount);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [ariaLiveMessage, setAriaLiveMessage] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (t: { message: string; type: "success" | "error" | "info" }) => {
    setToast(t);
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0 || isMarkingAll) return;
    setIsMarkingAll(true);

    try {
      const res = await fetch("/api/cuenta/notificaciones/leer-todas", { method: "POST" });
      if (res.ok) {
        setUnreadCount(0);
        window.dispatchEvent(new CustomEvent("technova:notificaciones-todas-leidas"));
        setAriaLiveMessage("Todas las notificaciones han sido marcadas como leídas.");
        showToast({ message: "Todas las notificaciones se marcaron como leídas.", type: "success" });
      } else {
        throw new Error("Error al marcar todas las notificaciones");
      }
    } catch (err: any) {
      console.error("[MARK ALL READ ERROR]:", err);
      showToast({ message: "No se pudieron marcar las notificaciones.", type: "error" });
    } finally {
      setIsMarkingAll(false);
    }
  };

  return (
    <div className="w-full">
      {/* Región aria-live para anuncios de accesibilidad */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {ariaLiveMessage}
      </div>

      {/* Toast flotante */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-lg border text-xs font-medium flex items-center gap-2 transition-all ${
            toast.type === "success"
              ? "bg-[#1E3A2F] text-white border-[#2A5242]"
              : toast.type === "error"
              ? "bg-rose-900 text-white border-rose-800"
              : "bg-stone-900 text-white border-stone-800"
          }`}
        >
          {toast.type === "success" && <Check className="w-4 h-4 text-emerald-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Cabecera principal: Título serif grande y "Marcar todo como leído" */}
      <div className="mb-8 pb-4 border-b border-stone-200/90 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-medium text-stone-900 tracking-tight">
            Notificaciones
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 font-light mt-1">
            Avisos de tus pedidos, recompras oportunas y promociones de Technova-Derm.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0 || isMarkingAll}
            className="text-xs font-semibold text-[#6B1F4A] hover:underline disabled:opacity-35 disabled:hover:no-underline disabled:cursor-not-allowed inline-flex items-center gap-1.5 transition"
          >
            {isMarkingAll ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Actualizando...</span>
              </>
            ) : (
              <span>Marcar todo como leído</span>
            )}
          </button>
        </div>
      </div>

      {/* Dos columnas: Izquierda (Lista) y Derecha (Preferencias) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Columna Izquierda: Lista de Notificaciones (7 cols en desktop) */}
        <section aria-labelledby="notificaciones-list-heading" className="lg:col-span-7">
          <h2 id="notificaciones-list-heading" className="sr-only">
            Listado de notificaciones recibidas
          </h2>
          <NotificationList
            initialNotifications={initialData.notificaciones}
            initialHayMas={initialData.hayMas}
            initialNextCursor={initialData.nextCursor}
            onUnreadCountChange={setUnreadCount}
            showToast={showToast}
          />
        </section>

        {/* Columna Derecha: Tarjeta "¿Cómo quieres enterarte?" (5 cols en desktop) */}
        <section aria-labelledby="preferencias-heading" className="lg:col-span-5 sticky top-24">
          <NotificationPreferences
            initialPreferences={initialData.preferencias}
            showToast={showToast}
          />
        </section>
      </div>
    </div>
  );
}

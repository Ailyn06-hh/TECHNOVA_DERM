"use client";

import React, { useState, useEffect, useCallback } from "react";
import NotificationItem, { NotificationData } from "./NotificationItem";
import { Loader2 } from "lucide-react";

interface NotificationListProps {
  initialNotifications: NotificationData[];
  initialHayMas: boolean;
  initialNextCursor: number | null;
  onUnreadCountChange?: (count: number) => void;
  showToast?: (toast: { message: string; type: "success" | "error" | "info" }) => void;
}

export default function NotificationList({
  initialNotifications,
  initialHayMas,
  initialNextCursor,
  onUnreadCountChange,
  showToast,
}: NotificationListProps) {
  const [notifications, setNotifications] = useState<NotificationData[]>(initialNotifications);
  const [hayMas, setHayMas] = useState(initialHayMas);
  const [nextCursor, setNextCursor] = useState<number | null>(initialNextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Marcar una notificación individual como leída
  const handleMarkAsRead = async (id: number) => {
    // Optimista
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
    );

    // Calcular no leídas restantes
    const remainingUnread = notifications.filter((n) => !n.leida && n.id !== id).length;
    if (onUnreadCountChange) {
      onUnreadCountChange(remainingUnread);
    }

    // Despachar evento global para actualizar la campana del header
    window.dispatchEvent(new CustomEvent("technova:notificacion-leida", { detail: { id } }));

    try {
      await fetch(`/api/cuenta/notificaciones/${id}`, { method: "PATCH" });
    } catch (err) {
      console.error("[MARK AS READ ERROR]:", err);
    }
  };

  // Cargar más notificaciones ("Ver anteriores")
  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);

    try {
      const res = await fetch(`/api/cuenta/notificaciones?cursor=${nextCursor}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications((prev) => [...prev, ...(data.notificaciones || [])]);
        setHayMas(Boolean(data.hayMas));
        setNextCursor(data.nextCursor || null);
      }
    } catch (err) {
      console.error("[LOAD MORE ERROR]:", err);
      if (showToast) {
        showToast({ message: "No se pudieron cargar más notificaciones.", type: "error" });
      }
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Polling cada 60 segundos mientras la página esté visible
  const checkForNewNotifications = useCallback(async () => {
    if (document.hidden) return;
    try {
      const res = await fetch("/api/cuenta/notificaciones");
      if (res.ok) {
        const data = await res.json();
        const incoming: NotificationData[] = data.notificaciones || [];

        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const brandNew = incoming.filter((n) => !existingIds.has(n.id));
          if (brandNew.length > 0) {
            return [...brandNew, ...prev];
          }
          return prev;
        });

        if (typeof data.unreadCount === "number" && onUnreadCountChange) {
          onUnreadCountChange(data.unreadCount);
        }
      }
    } catch (err) {
      console.error("[POLL NOTIFICATIONS ERROR]:", err);
    }
  }, [onUnreadCountChange]);

  useEffect(() => {
    const interval = setInterval(() => {
      checkForNewNotifications();
    }, 60000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkForNewNotifications();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkForNewNotifications]);

  // Escuchar cuando se marquen todas como leídas externamente
  useEffect(() => {
    const handleAllRead = () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, leida: true })));
    };
    window.addEventListener("technova:notificaciones-todas-leidas", handleAllRead);
    return () => window.removeEventListener("technova:notificaciones-todas-leidas", handleAllRead);
  }, []);

  return (
    <div className="w-full">
      {notifications.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-stone-200/90 text-center shadow-xs">
          <p className="text-sm font-medium text-stone-700">No tienes notificaciones todavía</p>
          <p className="text-xs text-stone-400 font-light mt-1">
            Aquí recibirás avisos del estado de tus pedidos, recompras y novedades de tu piel.
          </p>
        </div>
      ) : (
        <ul role="list" className="space-y-3">
          {notifications.map((notif) => (
            <NotificationItem
              key={notif.id}
              notification={notif}
              onMarkAsRead={handleMarkAsRead}
            />
          ))}
        </ul>
      )}

      {/* Botón Ver anteriores */}
      {hayMas && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition active:scale-95 disabled:opacity-50"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Cargando...</span>
              </>
            ) : (
              <span>Ver anteriores</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

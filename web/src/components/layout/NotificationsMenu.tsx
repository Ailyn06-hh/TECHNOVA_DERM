"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Bell, Check, Loader2 } from "lucide-react";

interface NotificationItem {
  id: number;
  titulo: string;
  mensaje: string;
  leida: number;
  creado_en: string;
}

export default function NotificationsMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Cargar notificaciones y contador de no leídas
  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/notificaciones");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(Number(data.unreadCount || 0));
        setNotifications(data.notificaciones || []);
      }
    } catch (err) {
      console.error("Error al consultar notificaciones:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const handleSync = () => {
      fetchNotifications();
    };
    window.addEventListener("technova:notificacion-leida", handleSync);
    window.addEventListener("technova:notificaciones-todas-leidas", handleSync);

    return () => {
      window.removeEventListener("technova:notificacion-leida", handleSync);
      window.removeEventListener("technova:notificaciones-todas-leidas", handleSync);
    };
  }, []);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      setIsMarkingRead(true);
      const res = await fetch("/api/notificaciones", { method: "POST" });
      if (res.ok) {
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, leida: 1 })));
        window.dispatchEvent(new CustomEvent("technova:notificaciones-todas-leidas"));
      }
    } catch (err) {
      console.error("Error al marcar como leídas:", err);
    } finally {
      setIsMarkingRead(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen) fetchNotifications();
        }}
        aria-label={`Notificaciones ${unreadCount > 0 ? `(${unreadCount} no leídas)` : ""}`}
        className="relative p-2 rounded-full text-gray-700 hover:text-[#1A1715] hover:bg-black/5 transition focus:outline-none focus:ring-2 focus:ring-[#6B1F4A]"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-[#6B1F4A] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fade-in">
          {/* Header */}
          <div className="p-3.5 px-4 bg-[#FAF7F5] border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#1A1715]">Notificaciones</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={isMarkingRead}
                className="text-[11px] text-[#6B1F4A] hover:underline font-medium flex items-center gap-1 disabled:opacity-50"
              >
                {isMarkingRead ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
                <span>Marcar todas como leídas</span>
              </button>
            )}
          </div>

          {/* Listado */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {isLoading ? (
              <div className="p-8 text-center text-xs text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#6B1F4A]" />
                <span>Cargando notificaciones...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400 font-light">
                No tienes notificaciones pendientes.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3.5 text-xs transition ${
                    n.leida ? "bg-white opacity-70" : "bg-[#FAF7F5]/50 font-medium"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[#1A1715] font-semibold text-xs">{n.titulo}</p>
                    {!n.leida && (
                      <span className="w-2 h-2 rounded-full bg-[#6B1F4A] shrink-0" />
                    )}
                  </div>
                  <p className="text-gray-600 font-light text-[11px] leading-relaxed">
                    {n.mensaje}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Footer Ver todas */}
          <div className="p-2.5 px-4 bg-[#FAF7F5] border-t border-gray-100 text-center">
            <Link
              href="/cuenta/notificaciones"
              onClick={() => setIsOpen(false)}
              className="text-xs font-semibold text-[#6B1F4A] hover:underline inline-flex items-center gap-1"
            >
              <span>Ver todas las notificaciones</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

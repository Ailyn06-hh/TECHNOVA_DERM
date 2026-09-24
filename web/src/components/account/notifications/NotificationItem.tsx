"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Package,
  RotateCcw,
  Heart,
  Tag,
  CheckCircle2,
  Lock,
  Bell,
} from "lucide-react";

export interface NotificationData {
  id: number;
  tipo: "pedido" | "recompra" | "favorito" | "promocion" | "cuenta";
  evento?: string | null;
  titulo: string;
  mensaje: string;
  enlace?: string | null;
  leida: boolean;
  leida_en?: string | null;
  creado_en: string;
  tiempoRelativo: string;
}

interface NotificationItemProps {
  notification: NotificationData;
  onMarkAsRead: (id: number) => void;
}

export default function NotificationItem({
  notification,
  onMarkAsRead,
}: NotificationItemProps) {
  const router = useRouter();

  const getIcon = () => {
    // Si es pedido entregado, usar el check verde o vino según diseño
    if (notification.evento === "pedido_entregado") {
      return <CheckCircle2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" aria-hidden="true" />;
    }

    switch (notification.tipo) {
      case "pedido":
        return <Package className="w-4 h-4 sm:w-4.5 sm:h-4.5" aria-hidden="true" />;
      case "recompra":
        return <RotateCcw className="w-4 h-4 sm:w-4.5 sm:h-4.5" aria-hidden="true" />;
      case "favorito":
        return <Heart className="w-4 h-4 sm:w-4.5 sm:h-4.5" aria-hidden="true" />;
      case "promocion":
        return <Tag className="w-4 h-4 sm:w-4.5 sm:h-4.5" aria-hidden="true" />;
      case "cuenta":
        return <Lock className="w-4 h-4 sm:w-4.5 sm:h-4.5" aria-hidden="true" />;
      default:
        return <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" aria-hidden="true" />;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!notification.leida) {
      onMarkAsRead(notification.id);
    }
    if (notification.enlace) {
      router.push(notification.enlace);
    }
  };

  const isNoLeida = !notification.leida;

  return (
    <li className="list-none">
      <a
        href={notification.enlace || "#"}
        onClick={handleClick}
        className={`group block transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#6B1F4A] rounded-2xl ${
          isNoLeida
            ? "bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/90 shadow-xs hover:border-stone-300"
            : "p-3 sm:p-4 rounded-xl border-b border-stone-100/90 hover:bg-stone-50/70"
        }`}
      >
        <article className="flex items-start gap-3.5 sm:gap-4">
          {/* Contenedor del ícono */}
          <div className="shrink-0 pt-0.5">
            {isNoLeida ? (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#FDF0ED] text-[#6B1F4A] flex items-center justify-center">
                {getIcon()}
              </div>
            ) : (
              <div className="w-7 h-7 flex items-center justify-center text-[#6B1F4A]">
                {getIcon()}
              </div>
            )}
          </div>

          {/* Contenido textual */}
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <h3
                className={`text-xs sm:text-sm tracking-tight leading-snug line-clamp-1 ${
                  isNoLeida ? "font-semibold text-stone-900" : "font-medium text-stone-700"
                }`}
              >
                {notification.titulo}
              </h3>
              {isNoLeida && <span className="sr-only">No leída</span>}
            </div>

            <p className="text-xs text-stone-600 font-light mt-1 leading-relaxed line-clamp-2">
              {notification.mensaje}
            </p>

            <span className="block text-[11px] text-stone-400 font-light mt-1.5">
              {notification.tiempoRelativo}
            </span>
          </div>

          {/* Punto vino a la derecha para no leídas */}
          {isNoLeida && (
            <div className="shrink-0 self-center pl-1" aria-hidden="true">
              <span className="block w-2.5 h-2.5 rounded-full bg-[#6B1F4A]" />
            </div>
          )}
        </article>
      </a>
    </li>
  );
}

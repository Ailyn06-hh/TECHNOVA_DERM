"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Sparkles,
  CreditCard,
  Bell,
  HelpCircle,
  LogOut,
  Loader2,
} from "lucide-react";
import { useCarrito } from "@/contexts/CarritoContext";

interface AccountSidebarProps {
  usuario: {
    nombre: string;
    correo: string;
  };
  unreadCountInicial?: number;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: "notificaciones";
}

const NAV_ITEMS: NavItem[] = [
  { label: "Resumen", href: "/cuenta", icon: LayoutDashboard },
  { label: "Mis pedidos", href: "/cuenta/pedidos", icon: Package },
  { label: "Mi rutina y favoritos", href: "/cuenta/rutina", icon: Sparkles },
  { label: "Direcciones y pagos", href: "/cuenta/direcciones", icon: CreditCard },
  { label: "Notificaciones", href: "/cuenta/notificaciones", icon: Bell, badgeKey: "notificaciones" },
  { label: "Ayuda y devoluciones", href: "/cuenta/ayuda", icon: HelpCircle },
];

export default function AccountSidebar({ usuario, unreadCountInicial = 0 }: AccountSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { refreshCart } = useCarrito();
  const [unreadCount, setUnreadCount] = useState<number>(unreadCountInicial);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  // Consultar notificaciones no leídas
  useEffect(() => {
    let isMounted = true;
    async function fetchUnread() {
      try {
        const res = await fetch("/api/notificaciones");
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setUnreadCount(Number(data.unreadCount || 0));
          }
        }
      } catch (err) {
        console.error("Error al obtener notificaciones:", err);
      }
    }

    fetchUnread();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      await refreshCart();
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
      setIsLoggingOut(false);
    }
  };

  return (
    <aside className="w-full lg:w-72 shrink-0">
      <div className="bg-transparent pb-6">
        {/* Encabezado de Usuario */}
        <div className="mb-6 px-3">
          <h2 className="font-serif text-2xl font-medium text-slate-900 tracking-tight">
            {usuario.nombre}
          </h2>
          <p className="text-xs text-slate-500 font-light truncate mt-0.5">
            {usuario.correo}
          </p>
        </div>

        {/* Menú de Navegación */}
        <nav aria-label="Mi cuenta" className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            // Activo si coincide exactamente o si es subruta (ej. /cuenta/pedidos/N-1042)
            const isActive =
              item.href === "/cuenta"
                ? pathname === "/cuenta"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            const showBadge = item.badgeKey === "notificaciones" && unreadCount > 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center justify-between px-4 py-3 rounded-2xl text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? "bg-white text-[#6B1F4A] shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-black/5"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? "text-[#6B1F4A]" : "text-slate-400 group-hover:text-slate-600"
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>

                {showBadge && (
                  <span
                    className="w-5 h-5 rounded-full bg-[#6B1F4A] text-white text-[11px] font-bold flex items-center justify-center shrink-0 ml-2"
                    aria-label={`${unreadCount} notificaciones no leídas`}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Separador y botón de cerrar sesión */}
        <div className="mt-8 pt-6 border-t border-slate-200/60 px-3">
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-500 hover:text-rose-700 transition font-normal focus:outline-none"
          >
            {isLoggingOut ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            ) : (
              <LogOut className="w-4 h-4 text-slate-400 hover:text-rose-600" />
            )}
            <span>{isLoggingOut ? "Cerrando sesión..." : "Cerrar sesión"}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

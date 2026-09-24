"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShoppingBag,
  Package,
  Boxes,
  Calculator,
  LogOut,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { NOMBRE_MARCA } from "@/lib/marca";
import type { PosSessionData } from "@/lib/pos-session";

interface PosSidebarProps {
  session: PosSessionData;
  tieneItemsBorrador?: boolean;
}

export default function PosSidebar({
  session,
  tieneItemsBorrador = false,
}: PosSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [pickupCount, setPickupCount] = useState<number>(0);
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  // Polling para "Por recoger" cada 60 segundos
  useEffect(() => {
    let isMounted = true;
    const fetchPickupCount = async () => {
      try {
        const res = await fetch("/api/pos/por-recoger/conteo");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && typeof data?.conteo === "number") {
            setPickupCount(data.conteo);
          }
        }
      } catch {}
    };

    fetchPickupCount();
    const interval = setInterval(fetchPickupCount, 60000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleLogoutClick = () => {
    if (tieneItemsBorrador) {
      setShowLogoutModal(true);
    } else {
      executeLogout();
    }
  };

  const executeLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/pos/auth/logout", { method: "POST" });
      router.push("/pos");
      router.refresh();
    } catch {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const menuItems = [
    {
      label: "Nueva venta",
      href: "/pos/venta",
      icon: ShoppingBag,
      badge: null,
    },
    {
      label: "Por recoger",
      href: "/pos/por-recoger",
      icon: Package,
      badge: pickupCount > 0 ? pickupCount : null,
    },
    {
      label: "Inventario",
      href: "/pos/inventario",
      icon: Boxes,
      badge: null,
    },
    {
      label: "Corte de caja",
      href: "/pos/corte",
      icon: Calculator,
      badge: null,
    },
  ];

  const sucursalSimple = session.sucursalNombre || "Centro";
  const horarioTexto =
    session.horaEntrada && session.horaSalida
      ? `Turno ${session.horaEntrada} a ${session.horaSalida}`
      : "Turno 10:00 a 18:00";

  return (
    <>
      <aside className="w-64 bg-[#181412] text-stone-300 flex flex-col justify-between shrink-0 select-none border-r border-[#2A2320] z-20">
        {/* Cabecera / Identidad */}
        <div className="p-6 border-b border-[#2A2320]">
          <h1 className="font-serif text-2xl font-normal text-white tracking-wide">
            {NOMBRE_MARCA}
          </h1>
          <p className="text-xs text-stone-400 mt-1 font-light tracking-wide truncate">
            POS · Tienda {sucursalSimple} · {session.cajaNombre}
          </p>
        </div>

        {/* Menú de Navegación */}
        <nav aria-label="Punto de venta" className="flex-1 px-3 py-6 space-y-1.5">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-medium transition-colors min-h-[48px] active:scale-[0.98] ${
                  isActive
                    ? "bg-[#FAF7F2] text-stone-900 shadow-sm"
                    : "text-stone-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-5 h-5 ${
                      isActive ? "text-[#5B122C]" : "text-stone-400"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge !== null && (
                  <span className="w-6 h-6 rounded-full bg-[#5B122C] text-white text-xs font-bold flex items-center justify-center shadow-xs">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Pie con Datos de Cajera y Salir */}
        <div className="p-5 border-t border-[#2A2320] bg-[#14100E]">
          <div className="mb-4">
            <p className="text-sm font-medium text-white truncate">
              Cajera: {session.nombre}
            </p>
            <p className="text-xs text-stone-400 font-light mt-0.5">
              {horarioTexto}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogoutClick}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-stone-700/60 text-stone-300 hover:text-white hover:bg-white/5 active:bg-white/10 text-xs font-medium transition min-h-[44px]"
          >
            {isLoggingOut ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4 text-stone-400" />
            )}
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* Modal de Advertencia al Cerrar Sesión con Ticket Abierto */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border border-stone-200 animate-scale-in">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 border border-amber-200">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="font-serif text-xl font-medium text-stone-900 mb-2">
              ¿Cerrar sesión ahora?
            </h3>

            <p className="text-xs sm:text-sm text-stone-600 font-light leading-relaxed mb-6">
              Tienes una venta con artículos en curso. Tu turno en{" "}
              <strong>{session.cajaNombre}</strong> permanecerá abierto y el
              ticket se conservará intacto para cuando vuelvas a iniciar sesión.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-stone-300 text-stone-700 text-xs font-semibold hover:bg-stone-50 active:bg-stone-100 min-h-[48px]"
              >
                Continuar venta
              </button>
              <button
                type="button"
                onClick={executeLogout}
                disabled={isLoggingOut}
                className="flex-1 px-4 py-3 rounded-xl bg-[#5B122C] text-white text-xs font-semibold hover:bg-[#4A0E24] active:bg-[#3D0B1D] min-h-[48px] flex items-center justify-center"
              >
                {isLoggingOut ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Cerrar sesión"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

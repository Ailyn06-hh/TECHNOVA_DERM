"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Boxes,
  ShoppingBag,
  Users,
  Tag,
  Truck,
  BarChart3,
  UserCog,
  Settings,
  LogOut,
  Shield,
  Store,
  ChevronRight,
  Menu,
  X,
  Loader2,
} from "lucide-react";
import { NOMBRE_MARCA } from "@/lib/marca";
import type { AdminSessionData } from "@/lib/admin-session";

interface AdminShellProps {
  admin: AdminSessionData;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: "/admin", label: "Panel", icon: LayoutDashboard },
  { href: "/admin/productos", label: "Productos", icon: Package },
  { href: "/admin/inventario", label: "Inventario y lotes", icon: Boxes },
  { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/admin/clientes", label: "Clientes", icon: Users },
  { href: "/admin/promociones", label: "Promociones y combos", icon: Tag },
  { href: "/admin/reabastecimiento", label: "Reabastecimiento", icon: Truck },
  { href: "/admin/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/admin/usuarios", label: "Usuarios y roles", icon: UserCog },
  { href: "/admin/configuracion", label: "Configuración", icon: Settings },
];

export default function AdminShell({ admin, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } catch {}
    router.push("/admin/login");
    router.refresh();
  };

  const isCurrentActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#FAF7F5] font-sans text-stone-900 select-none">
      {/* Sidebar para pantallas móviles (Overlay) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* BARRA LATERAL BLANCA (SIDEBAR) */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-[260px] bg-white border-r border-stone-200/80 flex flex-col transition-transform duration-200 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Marca e Identificador */}
        <div className="p-6 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-[#5B122C]">
              {NOMBRE_MARCA}
            </h1>
            <p className="text-[11px] uppercase tracking-widest font-semibold text-stone-400 mt-0.5">
              CRM Omnicanal
            </p>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1 text-stone-500 hover:text-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Badge de Ambiente / Rol */}
        <div className="px-4 py-3 bg-stone-50/80 border-b border-stone-100 flex items-center gap-2">
          {admin.rol === "admin" ? (
            <div className="flex items-center gap-2 text-xs text-[#5B122C] font-medium">
              <Shield className="w-4 h-4 shrink-0" />
              <span>Ambiente: Corporativo</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-amber-800 font-medium">
              <Store className="w-4 h-4 shrink-0" />
              <span>Sucursal: Asignada</span>
            </div>
          )}
        </div>

        {/* Menú de Navegación de 10 Secciones */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isCurrentActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? "bg-[#5B122C] text-white shadow-sm"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${active ? "text-white" : "text-stone-500"}`} />
                  <span>{item.label}</span>
                </div>
                {active && <ChevronRight className="w-3.5 h-3.5 text-white/70" />}
              </Link>
            );
          })}
        </nav>

        {/* Usuario al pie y Botón Salir */}
        <div className="p-4 border-t border-stone-100 bg-stone-50/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-[#5B122C] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                {admin.nombre?.[0]}
                {admin.apellido?.[0]}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-stone-800 truncate">
                  {admin.nombre} {admin.apellido}
                </p>
                <p className="text-[10px] text-stone-500 font-medium capitalize">
                  {admin.rol === "admin" ? "Administradora General" : "Gerente de Sucursal"}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full py-2 px-3 bg-white border border-stone-200 hover:border-stone-300 text-stone-700 hover:text-red-700 font-semibold text-xs rounded-lg shadow-2xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loggingOut ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogOut className="w-3.5 h-3.5" />
            )}
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header para móvil */}
        <header className="lg:hidden bg-white border-b border-stone-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-1.5 text-stone-700 hover:bg-stone-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-serif text-lg font-bold text-[#5B122C]">
              {NOMBRE_MARCA}
            </h1>
          </div>
          <span className="text-xs font-semibold text-stone-500">CRM Admin</span>
        </header>

        {/* Contenido scrolleable */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, ShoppingBag, Store, LineChart, ShieldCheck } from "lucide-react";
import { NOMBRE_MARCA } from "@/lib/marca";

export default function Navbar() {
  const pathname = usePathname();

  // Ocultar Navbar en pantallas de autenticación y onboarding
  if (
    pathname === "/login" ||
    pathname === "/registro" ||
    pathname === "/register" ||
    pathname === "/verificar" ||
    pathname.startsWith("/recuperar") ||
    pathname.startsWith("/onboarding")
  ) {
    return null;
  }

  const navItems = [
    { href: "/", label: "Tienda E-Commerce", icon: ShoppingBag, badge: "Canal Web" },
    { href: "/pos", label: "Terminal POS", icon: Store, badge: "Mostrador Físico" },
    { href: "/admin", label: "Cerebro MiPyME (ML & Precios)", icon: LineChart, badge: "Inteligencia Central" },
    { href: "/cart", label: "Carrito Omnicanal", icon: Sparkles, badge: null },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#FAF7F5]/90 backdrop-blur-md border-b border-nacar-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-full bg-nacar-800 text-white flex items-center justify-center font-serif text-lg tracking-wider shadow-sm group-hover:bg-nacar-700 transition">
              T
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-serif text-xl tracking-tight text-nacar-900 font-medium">{NOMBRE_MARCA}</span>
                <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-nacar-200 text-nacar-800 font-semibold">
                  SkinHub
                </span>
              </div>
              <p className="text-[10px] text-nacar-600 tracking-wide font-sans">
                E-Business Omnicanal · HackaTec 2026
              </p>
            </div>
          </Link>

          {/* Navigation Channels */}
          <nav className="flex items-center gap-1 md:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-all ${
                    isActive
                      ? "bg-nacar-800 text-white shadow-sm"
                      : "text-nacar-800 hover:bg-nacar-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                  {item.badge && !isActive && (
                    <span className="hidden lg:inline text-[9px] px-1.5 py-0.2 rounded-full bg-nacar-200 text-nacar-700">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User / Login Link & Omnichannel Status Badge */}
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-nacar-300 text-nacar-800 hover:bg-nacar-100 transition"
            >
              Iniciar Sesión
            </Link>
            <div className="hidden md:flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-xs text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-medium text-[11px]">Stock Único Sincronizado</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

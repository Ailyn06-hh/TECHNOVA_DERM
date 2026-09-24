"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NOMBRE_MARCA } from "@/lib/marca";
import SearchBox from "./SearchBox";
import NotificationsMenu from "./NotificationsMenu";
import UserMenu from "./UserMenu";
import CartBadge from "./CartBadge";

export default function SiteHeader() {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setIsLoggedIn(Boolean(data.user));
        }
      } catch {
        setIsLoggedIn(false);
      }
    }
    checkAuth();
  }, []);

  const [currentHash, setCurrentHash] = useState("");

  useEffect(() => {
    const updateHash = () => {
      if (typeof window !== "undefined") {
        setCurrentHash(window.location.hash);
      }
    };
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, [pathname]);

  const navLinks = [
    { label: "Rutinas", href: "/rutinas", isSpecial: false },
    { label: "Limpieza", href: "/categoria/limpieza", isSpecial: false },
    { label: "Hidratación", href: "/categoria/hidratacion", isSpecial: false },
    { label: "Protección solar", href: "/categoria/proteccion-solar", isSpecial: false },
    { label: "Combos", href: "/rutinas#combos", isSpecial: true },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-100/80 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4">
          {/* 1. Logotipo Technova-Derm */}
          <div className="shrink-0">
            <Link
              href="/"
              className="inline-block group focus:outline-none focus:ring-2 focus:ring-[#6B1F4A] rounded-lg"
            >
              <span className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-[#1A1715] group-hover:text-[#6B1F4A] transition">
                {NOMBRE_MARCA}
              </span>
            </Link>
          </div>

          {/* 2. Menú de Navegación Principal */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            {navLinks.map((link) => {
              let isActive = false;
              if (link.label === "Combos") {
                isActive = pathname === "/rutinas" && currentHash === "#combos";
              } else if (link.label === "Rutinas") {
                isActive = pathname === "/rutinas" && currentHash !== "#combos";
              } else {
                isActive = pathname === link.href;
              }

              if (link.isSpecial) {
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-xs sm:text-sm font-semibold tracking-wide transition ${
                      isActive
                        ? "text-[#6B1F4A] underline underline-offset-8"
                        : "text-[#6B1F4A] hover:text-[#58183D]"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              }

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-xs sm:text-sm transition tracking-wide ${
                    isActive
                      ? "text-[#1A1715] font-semibold underline underline-offset-8 decoration-gray-400"
                      : "text-gray-600 hover:text-[#1A1715] font-normal"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* 3. Buscador, Notificaciones, Usuario y Carrito */}
          <div className="flex items-center gap-2 sm:gap-3">
            <SearchBox />

            {isLoggedIn && <NotificationsMenu />}

            <UserMenu />

            <CartBadge />
          </div>
        </div>
      </div>
    </header>
  );
}

"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, LogOut, Package, UserCircle, Sparkles, ChevronDown, CreditCard } from "lucide-react";

interface SessionUser {
  userId: number;
  correo: string;
  nombre: string;
}

export default function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Consultar sesión activa
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user || null);
        }
      } catch (err) {
        console.error("Error al consultar sesión:", err);
      } finally {
        setIsLoading(false);
      }
    }

    checkSession();
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

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setIsOpen(false);
      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="h-8 w-20 bg-gray-100 rounded-full animate-pulse" />
    );
  }

  // Sin sesión: Mostrar enlace a Iniciar Sesión
  if (!user) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-1.5 text-xs font-semibold text-[#1A1715] hover:text-[#6B1F4A] px-3.5 py-1.5 rounded-full border border-gray-300 hover:border-[#6B1F4A] transition"
      >
        <User className="w-4 h-4" />
        <span>Iniciar sesión</span>
      </Link>
    );
  }

  // Con sesión: Mostrar Ícono + Nombre con desplegable
  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 py-1.5 px-3 rounded-full hover:bg-black/5 text-[#1A1715] text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#6B1F4A]"
      >
        <div className="w-7 h-7 rounded-full bg-[#F3E1E4] text-[#6B1F4A] flex items-center justify-center font-bold text-xs">
          {user.nombre.charAt(0).toUpperCase()}
        </div>
        <span className="max-w-[100px] truncate">{user.nombre}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fade-in divide-y divide-gray-100">
          <div className="p-3.5 px-4 bg-[#FAF7F5]">
            <p className="text-xs font-semibold text-[#1A1715] truncate">{user.nombre}</p>
            <p className="text-[10px] text-gray-500 truncate">{user.correo}</p>
          </div>

          <div className="py-1">
            <Link
              href="/cuenta"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-gray-700 hover:bg-[#FAF7F5] hover:text-[#1A1715] transition"
            >
              <UserCircle className="w-4 h-4 text-gray-400" />
              <span>Mi cuenta</span>
            </Link>

            <Link
              href="/cuenta/pedidos"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-gray-700 hover:bg-[#FAF7F5] hover:text-[#1A1715] transition"
            >
              <Package className="w-4 h-4 text-gray-400" />
              <span>Mis pedidos</span>
            </Link>

            <Link
              href="/cuenta/rutina"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-gray-700 hover:bg-[#FAF7F5] hover:text-[#1A1715] transition"
            >
              <Sparkles className="w-4 h-4 text-[#6B1F4A]" />
              <span>Mi rutina y favoritos</span>
            </Link>

            <Link
              href="/cuenta/direcciones"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-gray-700 hover:bg-[#FAF7F5] hover:text-[#1A1715] transition"
            >
              <CreditCard className="w-4 h-4 text-gray-400" />
              <span>Direcciones y pagos</span>
            </Link>
          </div>

          <div className="py-1">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-rose-700 hover:bg-rose-50 transition text-left"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

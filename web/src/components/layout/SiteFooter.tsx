import React from "react";
import Link from "next/link";
import { NOMBRE_MARCA, LEMA } from "@/lib/marca";

export default function SiteFooter() {
  return (
    <footer className="w-full bg-[#1A1715] text-[#FAF7F5] pt-14 pb-12 mt-auto border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 lg:gap-14 mb-12">
          {/* Marca y Lema */}
          <div className="md:col-span-1">
            <h3 className="font-serif text-2xl font-bold tracking-tight text-white mb-3">
              {NOMBRE_MARCA}
            </h3>
            <p className="text-xs text-gray-400 font-light leading-relaxed max-w-xs">
              {LEMA}
            </p>
          </div>

          {/* Columna 1: Tienda */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-300 mb-4">
              Tienda
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-400 font-light">
              <li>
                <Link href="/rutinas" className="hover:text-white transition">
                  Rutinas
                </Link>
              </li>
              <li>
                <Link href="/catalogo" className="hover:text-white transition">
                  Catálogo
                </Link>
              </li>
              <li>
                <Link href="/combos" className="hover:text-white transition">
                  Combos
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 2: Mi cuenta */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-300 mb-4">
              Mi cuenta
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-400 font-light">
              <li>
                <Link href="/cuenta/pedidos" className="hover:text-white transition">
                  Mis pedidos
                </Link>
              </li>
              <li>
                <Link href="/rutinas/mi-rutina" className="hover:text-white transition">
                  Mi rutina
                </Link>
              </li>
              <li>
                <Link href="/cuenta/notificaciones" className="hover:text-white transition">
                  Notificaciones
                </Link>
              </li>
            </ul>
          </div>

          {/* Columna 3: Ayuda */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-300 mb-4">
              Ayuda
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-400 font-light">
              <li>
                <Link href="/ayuda/envios" className="hover:text-white transition">
                  Envíos y devoluciones
                </Link>
              </li>
              <li>
                <Link href="/ayuda/faq" className="hover:text-white transition">
                  Preguntas frecuentes
                </Link>
              </li>
              <li>
                <Link href="/sucursales" className="hover:text-white transition">
                  Sucursales
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Separador y Copyright inferior */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-500 font-light gap-3">
          <p>© {new Date().getFullYear()} {NOMBRE_MARCA} · E-Business Omnicanal · HackaTec 2026</p>
          <p>Precios expresados en Pesos Mexicanos (MXN) · IVA incluido</p>
        </div>
      </div>
    </footer>
  );
}

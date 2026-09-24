import React from "react";
import Link from "next/link";
import { Check } from "lucide-react";

export default function AuthBrandPanel() {
  const benefits = [
    "Un solo carrito en web, app y tienda",
    "Recoge el mismo día en tu sucursal",
    "Rutinas armadas con lo que hay disponible hoy",
  ];

  return (
    <aside className="w-full lg:w-[43%] bg-[#6B1F4A] text-white p-8 sm:p-12 xl:p-16 flex flex-col justify-between min-h-[460px] lg:min-h-screen">
      {/* Top: Logo */}
      <div>
        <Link href="/" className="inline-block group focus:outline-none focus:ring-2 focus:ring-white/40 rounded-lg">
          <span className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-white hover:text-white/90 transition">
            Technova-Derm
          </span>
        </Link>

        {/* Big Headline */}
        <div className="mt-12 sm:mt-16 xl:mt-24 max-w-md">
          <h1 className="font-serif text-3xl sm:text-4xl xl:text-5xl font-medium leading-[1.15] tracking-tight text-[#FAF7F5]">
            Tu rutina completa,{"\n"}
            en todos tus{"\n"}
            canales.
          </h1>

          {/* Row of 3 cosmetic bottles in styled cards */}
          <div className="flex items-center gap-3 sm:gap-4 mt-8 sm:mt-10">
            {/* Card 1: Pink */}
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center shadow-inner transition-transform hover:scale-105"
              style={{ backgroundColor: "#F3E1E4" }}
              aria-label="Frasco de sérum rosado"
              role="img"
            >
              <svg width="42" height="64" viewBox="0 0 42 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Tapa oscura */}
                <rect x="15" y="2" width="12" height="14" rx="2.5" fill="#2D1A23" />
                {/* Cuello */}
                <rect x="17" y="16" width="8" height="4" fill="#2D1A23" />
                {/* Cuerpo del frasco redondeado */}
                <rect x="5" y="20" width="32" height="42" rx="9" fill="#D08C98" />
              </svg>
            </div>

            {/* Card 2: Mint Green */}
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center shadow-inner transition-transform hover:scale-105"
              style={{ backgroundColor: "#DDE9E1" }}
              aria-label="Frasco de tónico salvia"
              role="img"
            >
              <svg width="42" height="64" viewBox="0 0 42 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Tapa oscura */}
                <rect x="15" y="2" width="12" height="14" rx="2.5" fill="#1C2720" />
                {/* Cuello */}
                <rect x="17" y="16" width="8" height="4" fill="#1C2720" />
                {/* Cuerpo del frasco redondeado */}
                <rect x="5" y="20" width="32" height="42" rx="9" fill="#9BBBA6" />
              </svg>
            </div>

            {/* Card 3: Cream / Mustard */}
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center shadow-inner transition-transform hover:scale-105"
              style={{ backgroundColor: "#FBEFD6" }}
              aria-label="Frasco de crema mostaza"
              role="img"
            >
              <svg width="42" height="64" viewBox="0 0 42 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Tapa oscura */}
                <rect x="15" y="2" width="12" height="14" rx="2.5" fill="#2A2218" />
                {/* Cuello */}
                <rect x="17" y="16" width="8" height="4" fill="#2A2218" />
                {/* Cuerpo del frasco redondeado */}
                <rect x="5" y="20" width="32" height="42" rx="9" fill="#E2B863" />
              </svg>
            </div>
          </div>

          {/* Benefits list with check icons */}
          <ul className="mt-8 sm:mt-10 space-y-3">
            {benefits.map((benefit, index) => (
              <li key={index} className="flex items-center gap-3 text-xs sm:text-sm text-[#F7EBEF] font-light leading-snug">
                <span className="flex items-center justify-center shrink-0 w-4 h-4 rounded-full text-white">
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                </span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Footer copyright */}
      <div className="pt-8 sm:pt-12 text-[11px] sm:text-xs text-white/50 font-light">
        <p>© Technova-Derm</p>
      </div>
    </aside>
  );
}

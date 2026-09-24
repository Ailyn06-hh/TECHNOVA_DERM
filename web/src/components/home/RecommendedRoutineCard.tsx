"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { formatearPrecio } from "@/lib/formato";

interface RoutineStep {
  id: number;
  nombre: string;
  slug: string;
  tipo_rutina: string;
  categoria_nombre: string;
  precio: number;
  precio_especial: number | null;
  color_fondo: string;
  color_frasco: string;
}

interface RoutineData {
  hasSession: boolean;
  hasProfile: boolean;
  nombre?: string;
  tipo_piel?: string;
  paso1?: RoutineStep;
  paso2?: RoutineStep;
  paso3?: RoutineStep;
  totalOriginal: number;
  totalConDescuento: number;
  descuentoPorcentaje: number;
}

export default function RecommendedRoutineCard() {
  const [data, setData] = useState<RoutineData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRoutine() {
      try {
        const res = await fetch("/api/recomendaciones/rutina");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Error al cargar rutina recomendada:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadRoutine();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-sm w-full max-w-md flex flex-col justify-center items-center min-h-[360px]">
        <Loader2 className="w-7 h-7 text-[#6B1F4A] animate-spin mb-3" />
        <p className="text-xs text-gray-400 font-light">Calculando tu rutina recomendada...</p>
      </div>
    );
  }

  // 1. Sin sesión iniciada
  if (!data?.hasSession) {
    return (
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm w-full max-w-md flex flex-col justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F3E1E4] text-[#6B1F4A] text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Recomendación Inteligente</span>
          </div>

          <h3 className="font-serif text-2xl font-normal text-[#1A1715] mb-2 leading-tight">
            Descubre tu rutina personalizada
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 font-light leading-relaxed mb-6">
            Inicia sesión para que adaptemos los productos a tu tipo de piel, tus preocupaciones y tus compras en tienda o en línea.
          </p>
        </div>

        <Link
          href="/login"
          className="w-full py-3.5 px-6 rounded-full bg-[#1A1715] hover:bg-black text-white text-xs sm:text-sm font-semibold tracking-wide transition flex items-center justify-center gap-2"
        >
          <span>Iniciar sesión</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  // 2. Con sesión pero sin perfil completado
  if (!data.hasProfile) {
    return (
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm w-full max-w-md flex flex-col justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F3E1E4] text-[#6B1F4A] text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Paso pendiente</span>
          </div>

          <h3 className="font-serif text-2xl font-normal text-[#1A1715] mb-2 leading-tight">
            Arma tu perfil de piel
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 font-light leading-relaxed mb-6">
            Cuéntanos de tu piel en menos de un minuto y te prepararemos tu rutina ideal con 10% de descuento.
          </p>
        </div>

        <Link
          href="/onboarding/perfil"
          className="w-full py-3.5 px-6 rounded-full bg-[#6B1F4A] hover:bg-[#58183D] text-white text-xs sm:text-sm font-semibold tracking-wide transition flex items-center justify-center gap-2 shadow-xs"
        >
          <span>Completar mi perfil de piel</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  // 3. Con perfil completo: mostrar la rutina de 3 pasos
  const pasos = [
    { label: "PASO 1 · LIMPIADOR", prod: data.paso1 },
    { label: "PASO 2 · SÉRUM", prod: data.paso2 },
    { label: "PASO 3 · PROTECTOR SOLAR", prod: data.paso3 },
  ].filter((p) => Boolean(p.prod));

  const tipoPielFormateado = data.tipo_piel
    ? data.tipo_piel.charAt(0).toUpperCase() + data.tipo_piel.slice(1)
    : "Personalizada";

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-sm w-full max-w-md flex flex-col justify-between">
      {/* Cabecera de la tarjeta */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <h3 className="font-serif text-xl sm:text-2xl font-normal text-[#1A1715]">
            Rutina recomendada para ti
          </h3>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#F3E1E4] text-[#6B1F4A]">
            -{data.descuentoPorcentaje}% combo
          </span>
        </div>

        <p className="text-[11px] text-gray-400 font-light mb-5">
          Piel {tipoPielFormateado} · según tu perfil y tus compras
        </p>

        {/* 3 Pasos */}
        <div className="space-y-4 mb-6">
          {pasos.map((item, idx) => {
            if (!item.prod) return null;
            const precioItem = item.prod.precio_especial ?? item.prod.precio;

            return (
              <div key={idx} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Miniatura frasco en color */}
                  <div
                    className="w-8 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: item.prod.color_fondo }}
                  >
                    <div
                      className="w-3.5 h-6 rounded-xs"
                      style={{ backgroundColor: item.prod.color_frasco }}
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">
                      {item.label}
                    </p>
                    <p className="text-xs sm:text-sm font-medium text-[#1A1715] truncate">
                      {item.prod.nombre}
                    </p>
                  </div>
                </div>

                <span className="text-xs font-semibold text-[#1A1715] shrink-0">
                  {formatearPrecio(Number(precioItem))}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Precios totales y Botón Ver rutina */}
      <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-4">
        <div>
          <span className="text-xs text-gray-400 line-through mr-2">
            {formatearPrecio(data.totalOriginal)}
          </span>
          <span className="font-serif text-xl sm:text-2xl font-bold text-[#1A1715]">
            {formatearPrecio(data.totalConDescuento)}
          </span>
        </div>

        {/* TODO: Integrar botón para agregar la rutina completa al carrito en un solo clic */}
        <Link
          href="/rutinas/mi-rutina"
          className="py-2.5 px-5 sm:px-6 rounded-full bg-[#1A1715] hover:bg-black text-white text-xs font-semibold tracking-wide transition shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#1A1715]"
        >
          Ver rutina
        </Link>
      </div>
    </div>
  );
}

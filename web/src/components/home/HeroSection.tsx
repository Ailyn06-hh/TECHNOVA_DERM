"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, ShieldCheck, Truck, Award } from "lucide-react";
import RecommendedRoutineCard from "./RecommendedRoutineCard";

interface UserProfile {
  id: number;
  nombre: string;
  email: string;
}

export default function HeroSection() {
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated && data.user) {
            setUser(data.user);
          }
        }
      } catch {
        // Ignorar si falla la verificación
      }
    }
    checkAuth();
  }, []);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#FBF8F5] via-white to-white py-12 md:py-16 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Columna Izquierda: Mensaje principal */}
          <div className="lg:col-span-7 flex flex-col justify-center text-left">
            {/* Saludo si hay sesión o badge de calidad */}
            {user ? (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-100 text-[#6B1F4A] text-xs font-medium w-fit mb-4">
                <span>👋</span>
                <span>¡Hola de nuevo, <strong className="font-semibold">{user.nombre.split(" ")[0]}</strong>!</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-50 border border-rose-100 text-[#6B1F4A] text-xs font-medium w-fit mb-4">
                <Sparkles className="w-3.5 h-3.5 text-[#6B1F4A]" />
                <span>Dermatología clínica avanzada</span>
              </div>
            )}

            {/* Título principal con toque serif elegante */}
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-slate-900 leading-[1.2] mb-5">
              Ciencia para tu piel,{" "}
              <span className="italic text-[#6B1F4A] font-normal">resultados que notas.</span>
            </h1>

            {/* Subtítulo */}
            <p className="text-base sm:text-lg text-slate-600 font-light leading-relaxed max-w-2xl mb-8">
              Fórmulas dermatológicas minimalistas desarrolladas con alta concentración de activos para reparar, hidratar y fortalecer tu barrera cutánea sin irritaciones.
            </p>

            {/* Botones de acción principales */}
            <div className="flex flex-wrap items-center gap-4 mb-10">
              <Link
                href="/onboarding/perfil"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#6B1F4A] hover:bg-[#531839] text-white text-sm font-medium transition-all shadow-sm hover:shadow active:scale-[0.98]"
              >
                <span>Armar mi rutina</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/rutinas#combos"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium border border-slate-200 transition-all active:scale-[0.98]"
              >
                <span>Ver combos de la semana</span>
              </Link>
            </div>

            {/* Sellos de confianza */}
            <div className="grid grid-cols-3 gap-3 pt-6 border-t border-slate-100 max-w-lg">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#6B1F4A] shrink-0" />
                <span className="text-[11px] sm:text-xs text-slate-600 font-normal leading-snug">
                  Clínicamente testeado
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[#6B1F4A] shrink-0" />
                <span className="text-[11px] sm:text-xs text-slate-600 font-normal leading-snug">
                  100% Cruelty Free
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#6B1F4A] shrink-0" />
                <span className="text-[11px] sm:text-xs text-slate-600 font-normal leading-snug">
                  Envíos a todo México
                </span>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Tarjeta de rutina recomendada */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <RecommendedRoutineCard />
          </div>

        </div>
      </div>
    </section>
  );
}

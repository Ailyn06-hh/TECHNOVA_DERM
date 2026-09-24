"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import StoreLayout from "@/components/layout/StoreLayout";
import SkinTypeTabs from "./SkinTypeTabs";
import RoutineSection from "./RoutineSection";
import CombosSection from "./CombosSection";
import type { SeccionRutina, ComboRutinasItem } from "@/lib/recomendaciones";

export interface RoutinesPageProps {
  initialActiveTab: string;
  initialSecciones: SeccionRutina[];
  initialCombos: ComboRutinasItem[];
  userSkinType?: string | null;
}

export default function RoutinesPage({
  initialActiveTab,
  initialSecciones,
  initialCombos,
  userSkinType,
}: RoutinesPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<string>(initialActiveTab);
  const [secciones, setSecciones] = useState<SeccionRutina[]>(initialSecciones);
  const [combos, setCombos] = useState<ComboRutinasItem[]>(initialCombos);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [liveMessage, setLiveMessage] = useState<string>("");

  const announce = useCallback((msg: string) => {
    setLiveMessage(msg);
  }, []);

  // Cargar rutinas de un tipo de piel específico
  const fetchRoutinesForTab = useCallback(async (tabId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/rutinas?piel=${encodeURIComponent(tabId)}`);
      if (res.ok) {
        const data = await res.json();
        setSecciones(data.secciones || []);
        if (data.combos) {
          setCombos(data.combos);
        }
      }
    } catch (err) {
      console.error("Error al cargar rutinas:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Manejar selección de pestaña
  const handleSelectTab = useCallback(
    (tabId: string) => {
      if (tabId === activeTab) return;

      setActiveTab(tabId);
      // Actualizar la URL con router.replace sin recargar ni saltar scroll
      const newUrl = tabId === "todas" ? "/rutinas" : `/rutinas?piel=${tabId}`;
      router.replace(newUrl, { scroll: false });

      // Cargar nuevas rutinas con estado de carga
      fetchRoutinesForTab(tabId);
      announce(`Mostrando rutinas para ${tabId === "todas" ? "todos los tipos de piel" : `piel ${tabId}`}.`);
    },
    [activeTab, router, fetchRoutinesForTab, announce]
  );

  // Escuchar cambios de URL (por ejemplo botones Atrás/Adelante del navegador)
  useEffect(() => {
    const currentPiel = searchParams.get("piel") || "todas";
    if (currentPiel !== activeTab) {
      setActiveTab(currentPiel);
      fetchRoutinesForTab(currentPiel);
    }
  }, [searchParams]);

  const refreshCurrentRoutines = useCallback(() => {
    fetchRoutinesForTab(activeTab);
  }, [activeTab, fetchRoutinesForTab]);

  return (
    <StoreLayout>
      {/* Contenedor Principal con Fondo Crema */}
      <div className="min-h-screen bg-[#FAF8F5] text-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          
          {/* 1. Encabezado de la Pantalla */}
          <header className="mb-8 sm:mb-10 text-left">
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-medium tracking-tight text-slate-900 leading-tight mb-3">
              Rutinas y combos
            </h1>
            <p className="text-sm sm:text-base text-slate-600 font-light max-w-3xl leading-relaxed">
              Rutinas completas armadas con productos disponibles hoy, con descuento por llevar todos los pasos.
            </p>
          </header>

          {/* 2. Pestañas tipo píldora de Tipos de Piel */}
          <SkinTypeTabs
            activeTab={activeTab}
            userSkinType={userSkinType}
            onSelectTab={handleSelectTab}
          />

          {/* Región accesible para anuncios a lectores de pantalla */}
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {liveMessage}
          </div>

          {/* 3. Panel de Contenido de Rutinas */}
          <main
            role="tabpanel"
            id={`panel-${activeTab}`}
            aria-labelledby={`tab-${activeTab}`}
            tabIndex={0}
            className="focus:outline-none"
          >
            {isLoading ? (
              // Esqueleto mientras cargan las rutinas
              <div className="mb-14 sm:mb-16">
                <div className="h-8 bg-slate-200/60 rounded w-64 mb-3 animate-pulse" />
                <div className="h-4 bg-slate-200/50 rounded w-96 mb-6 animate-pulse" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 animate-pulse h-96 flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="h-6 bg-slate-100 rounded w-1/2" />
                          <div className="h-5 bg-slate-100 rounded-full w-20" />
                        </div>
                        <div className="h-4 bg-slate-100 rounded w-3/4" />
                        <div className="h-16 bg-slate-50 rounded-2xl" />
                        <div className="space-y-2 mt-4">
                          <div className="h-4 bg-slate-100 rounded w-full" />
                          <div className="h-4 bg-slate-100 rounded w-full" />
                          <div className="h-4 bg-slate-100 rounded w-full" />
                        </div>
                      </div>
                      <div className="h-12 bg-slate-100 rounded-full mt-6" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              secciones.map((seccion) => (
                <RoutineSection
                  key={seccion.tipoPiel}
                  seccion={seccion}
                  onRefresh={refreshCurrentRoutines}
                  onAnnounce={announce}
                />
              ))
            )}
          </main>

          {/* 4. Sección Combos de la Semana */}
          <CombosSection combos={combos} />

        </div>
      </div>
    </StoreLayout>
  );
}

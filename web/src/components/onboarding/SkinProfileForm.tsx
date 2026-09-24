"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import OnboardingProgress from "./OnboardingProgress";
import ChipGroup from "./ChipGroup";
import {
  TIPOS_PIEL,
  PREOCUPACIONES,
  PRESUPUESTOS,
  TipoPielKey,
  PreocupacionKey,
  PresupuestoKey,
} from "@/lib/perfilPiel";

export default function SkinProfileForm() {
  const router = useRouter();

  const [tipoPiel, setTipoPiel] = useState<TipoPielKey | "">("");
  const [preocupaciones, setPreocupaciones] = useState<PreocupacionKey[]>([]);
  const [presupuesto, setPresupuesto] = useState<PresupuestoKey | "">("");

  const [errors, setErrors] = useState<{
    tipoPiel?: string;
    preocupaciones?: string;
    presupuesto?: string;
    general?: string;
  }>({});

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  // 1. Cargar perfil existente si el usuario ya lo había configurado previamente (modo edición)
  useEffect(() => {
    async function fetchExistingProfile() {
      try {
        const res = await fetch("/api/perfil-piel");
        if (res.ok) {
          const data = await res.json();
          if (data && data.perfil) {
            setTipoPiel(data.perfil.tipo_piel || "");
            setPresupuesto(data.perfil.presupuesto || "");
            setPreocupaciones(data.perfil.preocupaciones || []);
          }
        }
      } catch (err) {
        console.error("Error al consultar perfil existente:", err);
      } finally {
        setIsLoadingProfile(false);
      }
    }

    fetchExistingProfile();
  }, []);

  const validate = () => {
    const errs: typeof errors = {};

    if (!tipoPiel) {
      errs.tipoPiel = "Por favor selecciona tu tipo de piel.";
    }

    if (preocupaciones.length === 0) {
      errs.preocupaciones = "Selecciona al menos una preocupación que quieras cuidar.";
    }

    if (!presupuesto) {
      errs.presupuesto = "Por favor selecciona un rango de presupuesto.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Guardar perfil y avanzar al paso 2 (/onboarding/rutina)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate() || isSaving || isSkipping) return;

    try {
      setIsSaving(true);
      setErrors({});

      const res = await fetch("/api/perfil-piel", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo_piel: tipoPiel,
          preocupaciones,
          presupuesto,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors({ general: data.error || "Error al guardar el perfil de piel." });
        return;
      }

      // Redirigir a /onboarding/rutina (paso 2)
      router.push(data.redirectUrl || "/onboarding/rutina");
    } catch {
      setErrors({ general: "Error de conexión con el servidor. Intenta de nuevo." });
    } finally {
      setIsSaving(false);
    }
  };

  // Saltar por ahora -> guarda onboarding_omitido = 1 y va a /
  const handleSkip = async () => {
    if (isSaving || isSkipping) return;

    try {
      setIsSkipping(true);
      setErrors({});

      const res = await fetch("/api/perfil-piel/omitir", {
        method: "POST",
      });

      const data = await res.json();
      router.push(data.redirectUrl || "/");
    } catch {
      // En caso de fallo de red, redirigir igualmente para no bloquear al usuario
      router.push("/");
    } finally {
      setIsSkipping(false);
    }
  };

  if (isLoadingProfile) {
    return (
      <div className="w-full max-w-[560px] mx-auto py-16 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#6B1F4A] mx-auto mb-3" />
        <p className="text-xs text-gray-500 font-light">Cargando tus preferencias de piel...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[560px] mx-auto py-8 sm:py-10">
      {/* 1. Indicador de Progreso: Paso 1 de 3 */}
      <OnboardingProgress currentStep={1} stepTitle="Tu perfil de piel" />

      {/* 2. Título y Subtítulo */}
      <div className="mb-8">
        <h2 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-[#1A1715] mb-2.5">
          Cuéntanos de tu piel
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 font-light leading-relaxed">
          Con esto armamos tu rutina recomendada. Te toma menos de un minuto.
        </p>
      </div>

      {errors.general && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-6 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2 animate-fade-in"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errors.general}</span>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit} noValidate className="space-y-7 sm:space-y-8">
        {/* Grupo 1: ¿Cómo es tu piel? (Selección ÚNICA) */}
        <ChipGroup
          id="tipo-piel"
          label="¿Cómo es tu piel?"
          options={TIPOS_PIEL}
          mode="single"
          value={tipoPiel}
          onChange={(val) => {
            setTipoPiel(val);
            if (errors.tipoPiel) setErrors((prev) => ({ ...prev, tipoPiel: undefined }));
          }}
          error={errors.tipoPiel}
          disabled={isSaving || isSkipping}
        />

        {/* Grupo 2: ¿Qué te gustaría cuidar? (Selección MÚLTIPLE) */}
        <ChipGroup
          id="preocupaciones"
          label="¿Qué te gustaría cuidar? Puedes elegir varias"
          options={PREOCUPACIONES}
          mode="multiple"
          value={preocupaciones}
          onChange={(val) => {
            setPreocupaciones(val);
            if (errors.preocupaciones) setErrors((prev) => ({ ...prev, preocupaciones: undefined }));
          }}
          error={errors.preocupaciones}
          disabled={isSaving || isSkipping}
        />

        {/* Grupo 3: Presupuesto por producto (Selección ÚNICA) */}
        <ChipGroup
          id="presupuesto"
          label="Presupuesto por producto"
          options={PRESUPUESTOS}
          mode="single"
          value={presupuesto}
          onChange={(val) => {
            setPresupuesto(val);
            if (errors.presupuesto) setErrors((prev) => ({ ...prev, presupuesto: undefined }));
          }}
          error={errors.presupuesto}
          disabled={isSaving || isSkipping}
        />

        {/* Nota pequeña gris */}
        <p className="text-[11px] sm:text-xs text-gray-500 font-light leading-relaxed pt-1">
          Tú eliges tu tipo de piel. Solo lo usamos para recomendarte productos y lo puedes cambiar en tu cuenta.
        </p>

        {/* Fila de Botones: Saltar por ahora / Ver mi rutina recomendada */}
        <div className="flex flex-col-reverse sm:flex-row items-center gap-3 pt-2">
          {/* Botón: Saltar por ahora */}
          <button
            type="button"
            onClick={handleSkip}
            disabled={isSaving || isSkipping}
            className="w-full sm:w-auto py-3 px-6 sm:px-7 rounded-full border border-[#2B211E] text-[#2B211E] hover:bg-black/5 active:bg-black/10 text-xs sm:text-sm font-semibold transition shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#2B211E] focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSkipping ? "Saltando..." : "Saltar por ahora"}
          </button>

          {/* Botón: Ver mi rutina recomendada */}
          <button
            type="submit"
            disabled={isSaving || isSkipping}
            className="w-full sm:flex-1 py-3 px-6 sm:px-8 rounded-full bg-[#6B1F4A] hover:bg-[#58183D] active:bg-[#44122F] text-white text-xs sm:text-sm font-semibold tracking-wide transition shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-[#6B1F4A] focus:ring-offset-2 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando perfil...</span>
              </>
            ) : (
              <span>Ver mi rutina recomendada</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

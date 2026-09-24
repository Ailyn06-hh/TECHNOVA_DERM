"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, Check } from "lucide-react";
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

type SaveStatus = "idle" | "saving" | "saved" | "error";

function getSafeReturnUrl(desde: string | null): string {
  if (!desde) return "/";
  // Sanitizar redirección para evitar ataques Open Redirect
  if (desde.startsWith("/") && !desde.startsWith("//") && !desde.includes("\\")) {
    return desde;
  }
  if (desde === "cuenta") return "/cuenta";
  if (desde === "perfil") return "/perfil";
  return "/";
}

function buildProfileHash(
  tipo: TipoPielKey | "",
  preoc: PreocupacionKey[],
  pres: PresupuestoKey | ""
): string {
  return `${tipo}|${[...preoc].sort().join(",")}|${pres}`;
}

export default function SkinProfileForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const desde = searchParams?.get("desde") || null;
  const targetUrl = getSafeReturnUrl(desde);

  const [tipoPiel, setTipoPiel] = useState<TipoPielKey | "">("");
  const [preocupaciones, setPreocupaciones] = useState<PreocupacionKey[]>([]);
  const [presupuesto, setPresupuesto] = useState<PresupuestoKey | "">("");

  const [errors, setErrors] = useState<{
    tipoPiel?: string;
    preocupaciones?: string;
    presupuesto?: string;
  }>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [isSkipping, setIsSkipping] = useState(false);

  const initialLoadedRef = useRef(false);
  const lastSavedHashRef = useRef<string>("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasUserInteractedRef = useRef(false);

  // Perfil completo cuando los 3 grupos tienen selección válida
  const isComplete = Boolean(
    tipoPiel && preocupaciones.length > 0 && presupuesto
  );

  // 1. Cargar perfil existente si ya estaba configurado
  useEffect(() => {
    async function fetchExistingProfile() {
      try {
        const res = await fetch("/api/perfil-piel");
        if (res.ok) {
          const data = await res.json();
          if (data && data.perfil) {
            const loadedTipo = data.perfil.tipo_piel || "";
            const loadedPres = data.perfil.presupuesto || "";
            const loadedPreoc = data.perfil.preocupaciones || [];

            setTipoPiel(loadedTipo);
            setPresupuesto(loadedPres);
            setPreocupaciones(loadedPreoc);

            if (loadedTipo && loadedPreoc.length > 0 && loadedPres) {
              const hash = buildProfileHash(loadedTipo, loadedPreoc, loadedPres);
              lastSavedHashRef.current = hash;
              setSaveStatus("saved");
            }
          }
        }
      } catch (err) {
        console.error("Error al consultar perfil existente:", err);
      } finally {
        setIsLoadingProfile(false);
        initialLoadedRef.current = true;
      }
    }

    fetchExistingProfile();
  }, []);

  // Función atómica para ejecutar el guardado vía PUT /api/perfil-piel
  const executeSave = useCallback(
    async (
      currTipo: TipoPielKey | "",
      currPreoc: PreocupacionKey[],
      currPres: PresupuestoKey | ""
    ): Promise<boolean> => {
      if (!currTipo || currPreoc.length === 0 || !currPres) {
        return false;
      }

      const hash = buildProfileHash(currTipo, currPreoc, currPres);
      if (hash === lastSavedHashRef.current) {
        setSaveStatus("saved");
        return true;
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      setSaveStatus("saving");
      setGeneralError(null);

      try {
        const res = await fetch("/api/perfil-piel", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipo_piel: currTipo,
            preocupaciones: currPreoc,
            presupuesto: currPres,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setSaveStatus("error");
          setGeneralError(
            data.error || "No se pudo guardar el perfil de piel."
          );
          return false;
        }

        lastSavedHashRef.current = hash;
        setSaveStatus("saved");
        return true;
      } catch {
        setSaveStatus("error");
        setGeneralError(
          "Error de conexión con el servidor al guardar. Intenta de nuevo."
        );
        return false;
      }
    },
    []
  );

  // 2. Efecto de auto-guardado con debounce de 600 ms
  useEffect(() => {
    if (!initialLoadedRef.current) return;
    if (!hasUserInteractedRef.current) return;

    // Validación inline si el usuario interactuó y deseleccionó un grupo requerido
    const newErrors: typeof errors = {};
    if (preocupaciones.length === 0) {
      newErrors.preocupaciones =
        "Selecciona al menos una preocupación que quieras cuidar.";
    }
    setErrors(newErrors);

    // Si no está completo, cancelar cualquier temporizador de guardado
    if (!tipoPiel || preocupaciones.length === 0 || !presupuesto) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (saveStatus !== "error") {
        setSaveStatus("idle");
      }
      return;
    }

    const currentHash = buildProfileHash(tipoPiel, preocupaciones, presupuesto);
    if (currentHash === lastSavedHashRef.current) {
      setSaveStatus("saved");
      return;
    }

    // Programar auto-guardado con debounce de 600ms
    setSaveStatus("saving");
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      executeSave(tipoPiel, preocupaciones, presupuesto);
    }, 600);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [tipoPiel, preocupaciones, presupuesto, executeSave]);

  // Manejo del botón único de acción (Saltar por ahora / Continuar)
  const handleActionButton = async () => {
    if (isSkipping) return;

    if (!isComplete) {
      // Perfil incompleto -> Acción: "Saltar por ahora"
      try {
        setIsSkipping(true);
        setGeneralError(null);

        await fetch("/api/perfil-piel/omitir", {
          method: "POST",
        }).catch(() => {});

        router.push(targetUrl);
      } catch {
        router.push(targetUrl);
      } finally {
        setIsSkipping(false);
      }
      return;
    }

    // Perfil completo -> Acción: "Continuar"
    // Si hay un guardado pendiente o en curso, resolverlo antes de redirigir
    const currentHash = buildProfileHash(tipoPiel, preocupaciones, presupuesto);
    if (
      debounceTimerRef.current ||
      saveStatus === "saving" ||
      currentHash !== lastSavedHashRef.current
    ) {
      const success = await executeSave(tipoPiel, preocupaciones, presupuesto);
      if (!success) {
        return; // Detener la navegación para que el usuario pueda reintentar
      }
    }

    router.push(targetUrl);
  };

  if (isLoadingProfile) {
    return (
      <div className="w-full max-w-[560px] mx-auto py-16 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#6B1F4A] mx-auto mb-3" />
        <p className="text-xs text-gray-500 font-light">
          Cargando tus preferencias de piel...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[560px] mx-auto py-8 sm:py-10">
      {/* 1. Indicador de Sección: Tu perfil de piel */}
      <OnboardingProgress />

      {/* 2. Título y Subtítulo */}
      <div className="mb-8">
        <h2 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-[#1A1715] mb-2.5">
          Cuéntanos de tu piel
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 font-light leading-relaxed">
          Con esto armamos tu rutina recomendada. Te toma menos de un minuto.
        </p>
      </div>

      {generalError && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-6 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2 animate-fade-in"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{generalError}</span>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={(e) => e.preventDefault()} noValidate className="space-y-7 sm:space-y-8">
        {/* Grupo 1: ¿Cómo es tu piel? (Selección ÚNICA) */}
        <ChipGroup
          id="tipo-piel"
          label="¿Cómo es tu piel?"
          options={TIPOS_PIEL}
          mode="single"
          value={tipoPiel}
          onChange={(val) => {
            hasUserInteractedRef.current = true;
            setTipoPiel(val);
            if (errors.tipoPiel) setErrors((prev) => ({ ...prev, tipoPiel: undefined }));
          }}
          error={errors.tipoPiel}
          disabled={isSkipping}
        />

        {/* Grupo 2: ¿Qué te gustaría cuidar? (Selección MÚLTIPLE) */}
        <ChipGroup
          id="preocupaciones"
          label="¿Qué te gustaría cuidar? Puedes elegir varias"
          options={PREOCUPACIONES}
          mode="multiple"
          value={preocupaciones}
          onChange={(val) => {
            hasUserInteractedRef.current = true;
            setPreocupaciones(val);
            if (errors.preocupaciones && val.length > 0) {
              setErrors((prev) => ({ ...prev, preocupaciones: undefined }));
            }
          }}
          error={errors.preocupaciones}
          disabled={isSkipping}
        />

        {/* Grupo 3: Presupuesto por producto (Selección ÚNICA) */}
        <ChipGroup
          id="presupuesto"
          label="Presupuesto por producto"
          options={PRESUPUESTOS}
          mode="single"
          value={presupuesto}
          onChange={(val) => {
            hasUserInteractedRef.current = true;
            setPresupuesto(val);
            if (errors.presupuesto) setErrors((prev) => ({ ...prev, presupuesto: undefined }));
          }}
          error={errors.presupuesto}
          disabled={isSkipping}
        />

        {/* Nota pequeña gris e Indicador discreto de auto-guardado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <p className="text-[11px] sm:text-xs text-gray-500 font-light leading-relaxed flex-1">
            Tú eliges tu tipo de piel. Solo lo usamos para recomendarte productos y lo puedes cambiar en tu cuenta.
          </p>

          {/* Indicador de estado discreto con aria-live */}
          <div
            aria-live="polite"
            className="shrink-0 text-xs flex items-center gap-1.5 self-start sm:self-auto"
          >
            {saveStatus === "saving" && (
              <span className="text-gray-500 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#6B1F4A]" />
                <span>Guardando…</span>
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="text-emerald-700 flex items-center gap-1 font-medium">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Guardado ✓</span>
              </span>
            )}
            {saveStatus === "error" && (
              <span className="text-rose-700 flex items-center gap-1">
                <span>No se pudo guardar.</span>
                <button
                  type="button"
                  onClick={() =>
                    executeSave(tipoPiel, preocupaciones, presupuesto)
                  }
                  className="underline font-semibold hover:text-rose-900 focus:outline-none"
                >
                  Reintentar
                </button>
              </span>
            )}
          </div>
        </div>

        {/* Fila de Botón Único de Acción: alineado a la izquierda, píldora, borde oscuro */}
        <div className="flex items-center justify-start pt-3">
          <button
            type="button"
            onClick={handleActionButton}
            disabled={isSkipping}
            aria-label={isComplete ? "Continuar" : "Saltar por ahora"}
            className="py-3 px-8 rounded-full border border-[#2B211E] text-[#2B211E] hover:bg-black/5 active:bg-black/10 text-xs sm:text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#2B211E] focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSkipping ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saltando...</span>
              </>
            ) : isComplete ? (
              <span>Continuar</span>
            ) : (
              <span>Saltar por ahora</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

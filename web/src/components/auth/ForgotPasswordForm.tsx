"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import SuccessBanner from "./SuccessBanner";
import { normalizarIdentificador, MENSAJES_VALIDACION } from "@/lib/validaciones";

export default function ForgotPasswordForm() {
  const [identifier, setIdentifier] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Contador de 60 segundos tras enviar
  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (countdown > 0 || isSubmitting) return;

    // Validación cliente usando el módulo unificado
    if (!identifier.trim()) {
      setFieldError(MENSAJES_VALIDACION.IDENTIFICADOR_REQUERIDO);
      return;
    }

    const norm = normalizarIdentificador(identifier);
    if (!norm.esValido) {
      setFieldError(MENSAJES_VALIDACION.IDENTIFICADOR_INVALIDO);
      return;
    }

    try {
      setIsSubmitting(true);
      setFieldError(null);
      setGeneralError(null);

      const res = await fetch("/api/auth/recuperar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: norm.valor }),
      });

      const data = await res.json();

      if (!res.ok) {
        setGeneralError(data.error || "Ocurrió un error. Intenta de nuevo.");
        return;
      }

      // Éxito: mostrar banner y activar cuenta regresiva de 60s
      setIsSent(true);
      setCountdown(60);
    } catch {
      setGeneralError("Error de conexión al servidor. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedCountdown = `0:${countdown < 10 ? `0${countdown}` : countdown}`;

  return (
    <div className="w-full max-w-[420px] mx-auto py-8">
      {/* Título y Subtítulo */}
      <div className="mb-6 sm:mb-8">
        <h2 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-[#1A1715] mb-2">
          Recupera tu contraseña
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 font-light leading-relaxed">
          Escribe tu correo o celular y te mandamos un enlace para crear una nueva.
        </p>
      </div>

      {/* Error general */}
      {generalError && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2 animate-fade-in"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{generalError}</span>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Campo: Correo o celular */}
        <div>
          <label htmlFor="identifier" className="block text-xs font-semibold text-gray-800 mb-1.5">
            Correo o celular
          </label>
          <input
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              if (fieldError) setFieldError(null);
              if (generalError) setGeneralError(null);
            }}
            placeholder="ana.lopez@correo.com"
            aria-invalid={!!fieldError}
            aria-describedby={fieldError ? "identifier-error" : undefined}
            className={`w-full px-4 py-2.5 rounded-xl border bg-white text-xs sm:text-sm text-gray-900 placeholder-gray-400 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-[#6B1F4A]/30 focus:border-[#6B1F4A] ${
              fieldError ? "border-rose-400 focus:ring-rose-200 focus:border-rose-500" : "border-gray-200"
            }`}
          />
          {fieldError && (
            <p id="identifier-error" className="mt-1 text-[11px] text-rose-600 flex items-center gap-1 font-light">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{fieldError}</span>
            </p>
          )}
        </div>

        {/* Botón Principal: Café oscuro casi negro (#2B211E) */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting || countdown > 0}
            className="w-full py-3 px-6 rounded-full bg-[#2B211E] hover:bg-[#1E1614] active:bg-[#140E0D] text-white text-sm font-semibold tracking-wide transition shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-[#2B211E] focus:ring-offset-2 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enviando enlace...</span>
              </>
            ) : countdown > 0 ? (
              <span>Reenviar enlace en {formattedCountdown}</span>
            ) : (
              <span>Enviarme el enlace</span>
            )}
          </button>
        </div>

        {/* Aviso de éxito anunciado con aria-live */}
        {isSent && (
          <div className="pt-1">
            <SuccessBanner message="Listo. El enlace vence en 30 minutos." />
          </div>
        )}

        {/* Enlace final a Login */}
        <div className="pt-6 text-center">
          <p className="text-xs text-gray-500 font-light">
            ¿La recordaste?{" "}
            <Link
              href="/login"
              className="text-[#6B1F4A] hover:underline font-semibold ml-0.5 transition"
            >
              Volver a iniciar sesión
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}

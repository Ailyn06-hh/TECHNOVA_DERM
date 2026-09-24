"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import CodeInput from "./CodeInput";
import ResendTimer from "./ResendTimer";

interface VerifyFormProps {
  initialEmail?: string;
}

export default function VerifyForm({ initialEmail = "" }: VerifyFormProps) {
  const router = useRouter();

  const [email, setEmail] = useState<string>(initialEmail);
  const [codeDigits, setCodeDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [initialSeconds, setInitialSeconds] = useState(45);
  const [isSessionChecked, setIsSessionChecked] = useState(false);

  // 1. Obtener la información del usuario pendiente desde la cookie httpOnly del servidor
  useEffect(() => {
    async function loadPendingUser() {
      try {
        const res = await fetch("/api/auth/pending-user");
        const data = await res.json();

        if (res.ok && data.pending) {
          setEmail(data.correo);

          // Calcular segundos restantes si se envió recientemente
          if (data.lastSentAt) {
            const elapsedSec = Math.floor((Date.now() - data.lastSentAt) / 1000);
            const remaining = Math.max(45 - elapsedSec, 0);
            setInitialSeconds(remaining);
          }
        }
      } catch (err) {
        console.error("Error al consultar usuario pendiente:", err);
      } finally {
        setIsSessionChecked(true);
      }
    }

    loadPendingUser();
  }, []);

  const fullCode = codeDigits.join("");
  const isComplete = fullCode.length === 6 && /^\d{6}$/.test(fullCode);

  const handleCodeChange = (newDigits: string[]) => {
    setCodeDigits(newDigits);
    if (hasError) {
      setHasError(false);
      setErrorMessage(null);
    }
  };

  // Reenviar código
  const handleResend = async (): Promise<boolean> => {
    try {
      setErrorMessage(null);
      setHasError(false);

      const res = await fetch("/api/auth/reenviar-codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "No se pudo reenviar el código.");
        return false;
      }

      setSuccessBanner("Hemos enviado un nuevo código a tu correo electrónico.");
      // Limpiar casillas tras reenvío
      setCodeDigits(["", "", "", "", "", ""]);
      setTimeout(() => setSuccessBanner(null), 5000);
      return true;
    } catch {
      setErrorMessage("Error de conexión al reenviar código.");
      return false;
    }
  };

  // Enviar verificación
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isComplete || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setHasError(false);

      const res = await fetch("/api/auth/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: fullCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setHasError(true);
        setErrorMessage(data.error || "El código ingresado es incorrecto.");
        // Si el código es incorrecto, limpiar casillas como pide el requerimiento
        setCodeDigits(["", "", "", "", "", ""]);
        return;
      }

      // Éxito: Redirigir a login con parámetro verified=true
      router.push("/login?verified=true");
    } catch {
      setHasError(true);
      setErrorMessage("Error al conectar con el servidor. Intenta de nuevo.");
      setCodeDigits(["", "", "", "", "", ""]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] mx-auto py-8">
      {/* Ícono de burbuja de mensaje dentro de un círculo rosa claro (#F3E1E4) con trazo vino (#6B1F4A) */}
      <div className="flex justify-start mb-6">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-sm"
          style={{ backgroundColor: "#F3E1E4" }}
          aria-hidden="true"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6B1F4A"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
      </div>

      {/* Título Serif */}
      <h2 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-[#1A1715] mb-2">
        Verifica tu cuenta
      </h2>

      {/* Subtítulo Gris con el correo */}
      <div className="mb-8">
        <p className="text-xs sm:text-sm text-gray-500 font-light leading-relaxed">
          Te enviamos un código de 6 dígitos a
        </p>
        <p className="text-xs sm:text-sm text-gray-700 font-normal leading-relaxed break-all">
          {email || (isSessionChecked ? "tu correo electrónico" : "cargando...")}
        </p>
      </div>

      {/* Banner de éxito al reenviar */}
      {successBanner && (
        <div className="mb-6 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-fade-in shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Formulario de Código */}
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        {/* 6 Casillas de Código */}
        <div>
          <CodeInput
            value={codeDigits}
            onChange={handleCodeChange}
            hasError={hasError}
            disabled={isSubmitting}
          />

          {/* Mensaje de error anunciado con aria-live */}
          {errorMessage && (
            <div
              role="alert"
              aria-live="assertive"
              className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2 animate-fade-in"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Botón Principal: Ancho completo, estilo píldora, fondo vino */}
        <div>
          <button
            type="submit"
            disabled={!isComplete || isSubmitting}
            className="w-full py-3.5 px-6 rounded-full bg-[#6B1F4A] hover:bg-[#58183D] active:bg-[#44122F] text-white text-sm font-semibold tracking-wide transition shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-[#6B1F4A] focus:ring-offset-2 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verificando...</span>
              </>
            ) : (
              <span>Verificar</span>
            )}
          </button>
        </div>

        {/* Cuenta regresiva / Reenvío */}
        <div className="pt-1">
          <ResendTimer initialSeconds={initialSeconds} onResend={handleResend} />
        </div>

        {/* ¿Escribiste mal tu correo? Cambiarlo */}
        <div className="text-center pt-2">
          <p className="text-xs text-gray-500 font-light">
            ¿Escribiste mal tu correo?{" "}
            <Link
              href="/registro?edit=true"
              className="text-[#6B1F4A] hover:underline font-semibold ml-0.5 transition"
            >
              Cambiarlo
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}

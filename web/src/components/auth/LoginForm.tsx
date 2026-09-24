"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import SocialButtons from "./SocialButtons";
import { normalizarIdentificador, MENSAJES_VALIDACION } from "@/lib/validaciones";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRegistered = searchParams?.get("registered") === "true";
  const isVerified = searchParams?.get("verified") === "true";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [unverifiedNotice, setUnverifiedNotice] = useState<{ error: string; correo: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successUser, setSuccessUser] = useState<any>(null);

  const validate = () => {
    const newErrors: { identifier?: string; password?: string } = {};

    const norm = normalizarIdentificador(identifier);
    if (!identifier.trim()) {
      newErrors.identifier = MENSAJES_VALIDACION.IDENTIFICADOR_REQUERIDO;
    } else if (!norm.esValido) {
      newErrors.identifier = MENSAJES_VALIDACION.IDENTIFICADOR_INVALIDO;
    }

    if (!password) {
      newErrors.password = MENSAJES_VALIDACION.CONTRASENA_REQUERIDA;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      setIsSubmitting(true);
      setGeneralError(null);
      setUnverifiedNotice(null);

      const norm = normalizarIdentificador(identifier);

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: norm.valor,
          password, // Contraseña sin recortes
          rememberMe,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.unverified) {
          // Cuenta no verificada: mostrar aviso con botón para ir a /verificar
          setUnverifiedNotice({
            error: data.error || "Tu cuenta aún no está verificada.",
            correo: data.correo || identifier,
          });
        } else {
          setGeneralError(data.error || "Ocurrió un error al iniciar sesión.");
        }
        return;
      }

      // Inicio exitoso
      setSuccessUser(data.user);

      if (data.redirectUrl) {
        setTimeout(() => {
          router.push(data.redirectUrl);
        }, 300);
      }
    } catch {
      setGeneralError("Error de conexión al servidor. Verifica que MySQL esté activo en XAMPP.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] mx-auto py-8">
      {/* Título y Subtítulo */}
      <div className="mb-6 sm:mb-8">
        <h2 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-[#1A1715] mb-2">
          Inicia sesión
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 font-light leading-relaxed">
          Tu carrito y tus pedidos te esperan en la web, la app y la tienda.
        </p>
      </div>

      {/* Banner de confirmación cuando llega desde verificación exitosa */}
      {isVerified && (
        <div className="mb-6 p-3.5 bg-[#E3EDE6] border border-[#D3E2D8] text-[#2C523B] text-xs rounded-xl flex items-center gap-2.5 animate-fade-in shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-[#2C523B] shrink-0" />
          <span className="font-medium">Cuenta verificada, ya puedes iniciar sesión.</span>
        </div>
      )}

      {/* Banner de confirmación cuando llega desde registro exitoso previo */}
      {isRegistered && !isVerified && (
        <div className="mb-6 p-3.5 bg-[#E3EDE6] border border-[#D3E2D8] text-[#2C523B] text-xs rounded-xl flex items-center gap-2.5 animate-fade-in shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-[#2C523B] shrink-0" />
          <span className="font-medium">Cuenta creada, ya puedes iniciar sesión.</span>
        </div>
      )}

      {/* Aviso de cuenta no verificada */}
      {unverifiedNotice && (
        <div className="mb-6 p-4 bg-[#FDF4F6] border border-[#F3E1E4] text-[#6B1F4A] text-xs rounded-2xl animate-fade-in shadow-sm">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#6B1F4A] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-[#1A1715] mb-1">
                {unverifiedNotice.error}
              </p>
              <p className="text-gray-600 font-light mb-3">
                Debes ingresar el código de 6 dígitos que enviamos para poder acceder a tu cuenta.
              </p>
              <Link
                href="/verificar"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#6B1F4A] text-white text-[11px] font-semibold hover:bg-[#58183D] transition shadow-xs"
              >
                <span>Ir a verificar cuenta</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Error general */}
      {generalError && (
        <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{generalError}</span>
        </div>
      )}

      {/* Sesión iniciada con éxito */}
      {successUser && (
        <div className="mb-6 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <div>
            <span className="font-semibold">¡Bienvenida de vuelta, {successUser.nombre}!</span>
            <p className="text-[11px] text-emerald-700">Has iniciado sesión correctamente.</p>
          </div>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Campo: Correo o celular */}
        <div>
          <label htmlFor="identifier" className="block text-xs font-semibold text-gray-800 mb-1.5">
            Correo o celular
          </label>
          <div className="relative">
            <input
              id="identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (errors.identifier) setErrors((prev) => ({ ...prev, identifier: undefined }));
                if (generalError) setGeneralError(null);
                if (unverifiedNotice) setUnverifiedNotice(null);
              }}
              placeholder="ana.lopez@correo.com"
              className={`w-full px-4 py-2.5 rounded-xl border bg-white text-xs sm:text-sm text-gray-900 placeholder-gray-400 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-[#6B1F4A]/30 focus:border-[#6B1F4A] ${
                errors.identifier ? "border-rose-400 focus:ring-rose-200 focus:border-rose-500" : "border-gray-200"
              }`}
              aria-invalid={!!errors.identifier}
              aria-describedby={errors.identifier ? "identifier-error" : undefined}
            />
          </div>
          {errors.identifier && (
            <p id="identifier-error" className="mt-1 text-[11px] text-rose-600 flex items-center gap-1 font-light">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{errors.identifier}</span>
            </p>
          )}
        </div>

        {/* Campo: Contraseña */}
        <div>
          <label htmlFor="password" className="block text-xs font-semibold text-gray-800 mb-1.5">
            Contraseña
          </label>
          <div className="relative">
            {/* Ícono de candado a la izquierda */}
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <Lock className="w-4 h-4" />
            </span>

            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                if (generalError) setGeneralError(null);
              }}
              placeholder="••••••••••"
              className={`w-full pl-10 pr-10 py-2.5 rounded-xl border bg-white text-xs sm:text-sm text-gray-900 placeholder-gray-400 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-[#6B1F4A]/30 focus:border-[#6B1F4A] ${
                errors.password ? "border-rose-400 focus:ring-rose-200 focus:border-rose-500" : "border-gray-200"
              }`}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
            />

            {/* Toggle show/hide password */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition p-1"
              aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p id="password-error" className="mt-1 text-[11px] text-rose-600 flex items-center gap-1 font-light">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{errors.password}</span>
            </p>
          )}
        </div>

        {/* Fila: Recordarme + ¿Olvidaste tu contraseña? */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded text-[#6B1F4A] border-gray-300 focus:ring-[#6B1F4A] accent-[#6B1F4A] cursor-pointer"
            />
            <span className="text-xs text-gray-600 font-light">Recordarme</span>
          </label>

          <Link
            href="/recuperar"
            className="text-xs text-[#6B1F4A] hover:underline font-semibold transition"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        {/* Botón Principal: Entrar (Estilo Píldora) */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-6 rounded-full bg-[#6B1F4A] hover:bg-[#58183D] active:bg-[#44122F] text-white text-sm font-semibold tracking-wide transition shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-[#6B1F4A] focus:ring-offset-2 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Entrando...</span>
              </>
            ) : (
              <span>Entrar</span>
            )}
          </button>
        </div>

        {/* Botones Sociales (Google y Apple) */}
        <div className="pt-3">
          <SocialButtons />
        </div>

        {/* Enlace final a Registro */}
        <div className="pt-4 text-center">
          <p className="text-xs text-gray-500 font-light">
            ¿No tienes cuenta?{" "}
            <Link
              href="/registro"
              className="text-[#6B1F4A] hover:underline font-semibold ml-0.5 transition"
            >
              Crea una aquí
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import PasswordRequirements from "./PasswordRequirements";
import {
  validarContrasena,
  validarConfirmacion,
  MENSAJES_VALIDACION,
} from "@/lib/validaciones";

interface ResetPasswordFormProps {
  token: string;
}

const MENSAJE_TOKEN_INVALIDO = "Este enlace ya no es válido. Solicita uno nuevo.";

export default function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();

  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [userContext, setUserContext] = useState<{
    nombre?: string;
    apellido?: string;
    correo?: string;
  }>({});

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Validar token con el servidor al cargar la página
  useEffect(() => {
    async function validateToken() {
      // Validación previa de formato: 64 caracteres hexadecimales
      const tokenRegex = /^[0-9a-fA-F]{64}$/;
      if (!token || !tokenRegex.test(token)) {
        setTokenError(MENSAJE_TOKEN_INVALIDO);
        setIsValidatingToken(false);
        return;
      }

      try {
        const res = await fetch(`/api/auth/recuperar/validar?token=${encodeURIComponent(token)}`);
        const data = await res.json();

        if (!res.ok || !data.valid) {
          setTokenError(data.error || MENSAJE_TOKEN_INVALIDO);
        } else {
          setUserContext({
            nombre: data.nombre,
            apellido: data.apellido,
            correo: data.correo,
          });
        }
      } catch {
        setTokenError("No se pudo verificar el enlace. Comprueba tu conexión a internet.");
      } finally {
        setIsValidatingToken(false);
      }
    }

    validateToken();
  }, [token]);

  // Validación reactiva de contraseña en tiempo real para PasswordRequirements
  const passwordResult = useMemo(() => {
    return validarContrasena(password, userContext);
  }, [password, userContext]);

  // Validación de campo individual
  const validateField = (fieldName: "password" | "confirmPassword") => {
    if (fieldName === "password") {
      const passRes = validarContrasena(password, userContext);
      return passRes.valida
        ? null
        : passRes.errores[0] || MENSAJES_VALIDACION.CONTRASENA_NO_CUMPLE_REQUISITOS;
    }
    if (fieldName === "confirmPassword") {
      const confirmRes = validarConfirmacion(password, confirmPassword);
      return confirmRes.valida ? null : confirmRes.error;
    }
    return null;
  };

  const handleBlur = (fieldName: "password" | "confirmPassword") => {
    if (fieldName === "password") {
      setIsPasswordFocused(false);
    }
    const err = validateField(fieldName);
    if (err) {
      setErrors((prev) => ({ ...prev, [fieldName]: err }));
    } else {
      setErrors((prev) => ({ ...prev, [fieldName]: undefined }));
    }
  };

  const validateAll = () => {
    const errs: { password?: string; confirmPassword?: string } = {};

    const passErr = validateField("password");
    if (passErr) errs.password = passErr;

    const confirmErr = validateField("confirmPassword");
    if (confirmErr) errs.confirmPassword = confirmErr;

    setErrors(errs);

    if (errs.password) {
      document.getElementById("new-password")?.focus();
    } else if (errs.confirmPassword) {
      document.getElementById("confirm-password")?.focus();
    }

    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateAll() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setGeneralError(null);

      const res = await fetch("/api/auth/recuperar/nueva", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Si el token expiró o ya no es válido mientras el usuario estaba en la página
        if (data.invalidToken) {
          setTokenError(data.error || MENSAJE_TOKEN_INVALIDO);
          return;
        }

        if (data.field === "password") {
          setErrors((prev) => ({ ...prev, password: data.error }));
          document.getElementById("new-password")?.focus();
        } else if (data.field === "confirmPassword") {
          setErrors((prev) => ({ ...prev, confirmPassword: data.error }));
          document.getElementById("confirm-password")?.focus();
        } else {
          setGeneralError(data.error || "Error al actualizar la contraseña.");
        }
        return;
      }

      // Éxito: Inicia sesión automáticamente y redirige a la página principal
      router.push(data.redirectUrl || "/");
    } catch {
      setGeneralError("Error de conexión al servidor al guardar la nueva contraseña.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Estado: Validando token
  if (isValidatingToken) {
    return (
      <div className="w-full max-w-[420px] mx-auto py-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#6B1F4A] mx-auto mb-3" />
        <p className="text-xs text-gray-500 font-light">Validando enlace de recuperación...</p>
      </div>
    );
  }

  // Estado: Token inválido, expirado o ya usado (mensaje unificado)
  if (tokenError) {
    return (
      <div className="w-full max-w-[420px] mx-auto py-8">
        <div className="p-6 bg-white border border-rose-200/80 rounded-2xl shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-rose-600" />
          </div>
          <h3 className="font-serif text-2xl font-normal text-gray-900 mb-2">
            Enlace no disponible
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 font-light leading-relaxed mb-6">
            {tokenError}
          </p>
          <Link
            href="/recuperar"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-6 rounded-full bg-[#6B1F4A] hover:bg-[#58183D] text-white text-xs sm:text-sm font-semibold transition shadow-sm"
          >
            <span>Solicitar un nuevo enlace</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // Estado: Formulario para crear nueva contraseña
  return (
    <div className="w-full max-w-[420px] mx-auto py-8">
      {/* Separador con línea fina */}
      <div className="border-t border-gray-200/90 mb-6" />

      {/* Subtítulo Serif */}
      <div className="mb-6">
        <h3 className="font-serif text-2xl sm:text-3xl font-normal tracking-tight text-[#1A1715] mb-2">
          Crear nueva contraseña
        </h3>
        <p className="text-xs text-gray-500 font-light">
          Ingresa y confirma tu nueva clave de acceso segura.
        </p>
      </div>

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

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Campo: Nueva contraseña */}
        <div>
          <label htmlFor="new-password" className="block text-xs font-semibold text-gray-800 mb-1.5">
            Nueva contraseña
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <Lock className="w-4 h-4" />
            </span>
            <input
              id="new-password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                const val = e.target.value;
                setPassword(val);
                if (errors.password) {
                  const passRes = validarContrasena(val, userContext);
                  if (passRes.valida) {
                    setErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }
                if (generalError) setGeneralError(null);
              }}
              onFocus={() => setIsPasswordFocused(true)}
              onBlur={() => handleBlur("password")}
              placeholder="••••••••••"
              aria-invalid={!!errors.password}
              aria-describedby="password-requirements password-error"
              className={`w-full pl-10 pr-10 py-2.5 rounded-xl border bg-white text-xs sm:text-sm text-gray-900 placeholder-gray-400 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-[#6B1F4A]/30 focus:border-[#6B1F4A] ${
                errors.password ? "border-rose-400 focus:ring-rose-200 focus:border-rose-500" : "border-gray-200"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition p-1"
              aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Componente visual de requisitos en tiempo real */}
          <div id="password-requirements">
            <PasswordRequirements
              reglas={passwordResult.reglas}
              visible={isPasswordFocused || password.length > 0}
            />
          </div>

          {errors.password && (
            <p id="password-error" className="mt-1.5 text-[11px] text-rose-600 flex items-center gap-1 font-light">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{errors.password}</span>
            </p>
          )}
        </div>

        {/* Campo: Confirmar contraseña */}
        <div>
          <label htmlFor="confirm-password" className="block text-xs font-semibold text-gray-800 mb-1.5">
            Confirmar contraseña
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <Lock className="w-4 h-4" />
            </span>
            <input
              id="confirm-password"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                const val = e.target.value;
                setConfirmPassword(val);
                if (errors.confirmPassword) {
                  const confirmRes = validarConfirmacion(password, val);
                  if (confirmRes.valida) {
                    setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }
                }
                if (generalError) setGeneralError(null);
              }}
              onBlur={() => handleBlur("confirmPassword")}
              placeholder="••••••••••"
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={errors.confirmPassword ? "confirm-error" : undefined}
              className={`w-full pl-10 pr-10 py-2.5 rounded-xl border bg-white text-xs sm:text-sm text-gray-900 placeholder-gray-400 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-[#6B1F4A]/30 focus:border-[#6B1F4A] ${
                errors.confirmPassword
                  ? "border-rose-400 focus:ring-rose-200 focus:border-rose-500"
                  : "border-gray-200"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition p-1"
              aria-label={showConfirmPassword ? "Ocultar confirmación" : "Ver confirmación"}
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p id="confirm-error" className="mt-1 text-[11px] text-rose-600 flex items-center gap-1 font-light">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{errors.confirmPassword}</span>
            </p>
          )}
        </div>

        {/* Botón Principal: Píldora, fondo vino (#6B1F4A) */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-6 rounded-full bg-[#6B1F4A] hover:bg-[#58183D] active:bg-[#44122F] text-white text-sm font-semibold tracking-wide transition shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-[#6B1F4A] focus:ring-offset-2 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Guardando y entrando...</span>
              </>
            ) : (
              <span>Guardar y entrar</span>
            )}
          </button>
        </div>

        {/* Enlace final a Login */}
        <div className="pt-4 text-center">
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

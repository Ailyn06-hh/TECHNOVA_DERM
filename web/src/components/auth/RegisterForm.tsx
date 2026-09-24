"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Eye, EyeOff, Phone, AlertCircle, Loader2 } from "lucide-react";
import InfoBanner from "./InfoBanner";
import PasswordRequirements from "./PasswordRequirements";
import {
  validarContrasena,
  normalizarTexto,
  normalizarCorreo,
  normalizarCelular,
  MENSAJES_VALIDACION,
} from "@/lib/validaciones";

export default function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditing = searchParams?.get("edit") === "true";

  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    correo: "",
    celular: "",
    password: "",
    acepta_terminos: false,
    acepta_promociones: false,
  });

  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  // Precargar datos si viene de "Cambiarlo" en /verificar (?edit=true)
  useEffect(() => {
    if (isEditing) {
      fetch("/api/auth/pending-user")
        .then((res) => res.json())
        .then((data) => {
          if (data && data.pending) {
            setFormData((prev) => ({
              ...prev,
              nombre: data.nombre || prev.nombre,
              apellido: data.apellido || prev.apellido,
              correo: data.correo || prev.correo,
              celular: data.celular || prev.celular,
              acepta_terminos: true,
            }));
          }
        })
        .catch((err) => console.error("Error al precargar datos:", err));
    }
  }, [isEditing]);

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Validación reactiva de contraseña en tiempo real para PasswordRequirements
  const passwordResult = useMemo(() => {
    return validarContrasena(formData.password, {
      nombre: formData.nombre,
      apellido: formData.apellido,
      correo: formData.correo,
    });
  }, [formData.password, formData.nombre, formData.apellido, formData.correo]);

  const validateClient = () => {
    const errs: Record<string, string> = {};

    const cleanNombre = normalizarTexto(formData.nombre);
    if (!cleanNombre) {
      errs.nombre = MENSAJES_VALIDACION.NOMBRE_REQUERIDO;
    } else if (cleanNombre.length < 2) {
      errs.nombre = MENSAJES_VALIDACION.NOMBRE_MIN_LONGITUD;
    }

    const cleanApellido = normalizarTexto(formData.apellido);
    if (!cleanApellido) {
      errs.apellido = MENSAJES_VALIDACION.APELLIDO_REQUERIDO;
    } else if (cleanApellido.length < 2) {
      errs.apellido = MENSAJES_VALIDACION.APELLIDO_MIN_LONGITUD;
    }

    const cleanEmail = normalizarCorreo(formData.correo);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail) {
      errs.correo = MENSAJES_VALIDACION.CORREO_REQUERIDO;
    } else if (!emailRegex.test(cleanEmail)) {
      errs.correo = MENSAJES_VALIDACION.CORREO_INVALIDO;
    }

    const cleanPhone = normalizarCelular(formData.celular);
    if (!cleanPhone) {
      errs.celular = MENSAJES_VALIDACION.CELULAR_REQUERIDO;
    } else if (cleanPhone.length !== 10) {
      errs.celular = MENSAJES_VALIDACION.CELULAR_INVALIDO;
    }

    // Validación estricta de contraseña compartida con backend
    const passRes = validarContrasena(formData.password, {
      nombre: cleanNombre,
      apellido: cleanApellido,
      correo: cleanEmail,
    });
    if (!passRes.valida) {
      errs.password =
        passRes.errores[0] || MENSAJES_VALIDACION.CONTRASENA_NO_CUMPLE_REQUISITOS;
    }

    if (!formData.acepta_terminos) {
      errs.acepta_terminos = MENSAJES_VALIDACION.TERMINOS_REQUERIDOS;
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    // Limpiar error del campo editado
    if (errors[name]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
    if (generalError) setGeneralError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateClient()) return;

    try {
      setIsSubmitting(true);
      setGeneralError(null);

      // Enviamos datos normalizados; la contraseña va íntegra sin recortes
      const payload = {
        nombre: normalizarTexto(formData.nombre),
        apellido: normalizarTexto(formData.apellido),
        correo: normalizarCorreo(formData.correo),
        celular: normalizarCelular(formData.celular),
        password: formData.password,
        acepta_terminos: formData.acepta_terminos,
        acepta_promociones: formData.acepta_promociones,
      };

      const res = await fetch("/api/auth/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.field) {
          setErrors((prev) => ({ ...prev, [data.field]: data.error }));
        } else {
          setGeneralError(data.error || "Ocurrió un error al registrar tu cuenta.");
        }
        return;
      }

      // Redirección exitosa a la pantalla de verificación
      router.push(data.redirectUrl || "/verificar");
    } catch (err: any) {
      setGeneralError("Error de conexión al servidor. Verifica que MySQL esté activo en XAMPP.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-[420px] mx-auto py-6 sm:py-8">
      {/* Título y Subtítulo */}
      <div className="mb-6 sm:mb-8">
        <h2 className="font-serif text-3xl sm:text-4xl font-normal tracking-tight text-[#1A1715] mb-2">
          Crea tu cuenta
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 font-light leading-relaxed">
          Un solo registro para comprar en línea, en la app y en tienda.
        </p>
      </div>

      {generalError && (
        <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{generalError}</span>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Fila Nombre y Apellido (lado a lado en desktop, apilados en móvil) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3">
          {/* Nombre */}
          <div>
            <label htmlFor="nombre" className="block text-xs font-semibold text-gray-800 mb-1">
              Nombre
            </label>
            <input
              id="nombre"
              name="nombre"
              type="text"
              autoComplete="given-name"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ana"
              className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-xs sm:text-sm text-gray-900 placeholder-gray-400 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-[#6B1F4A]/30 focus:border-[#6B1F4A] ${
                errors.nombre ? "border-rose-400 focus:ring-rose-200 focus:border-rose-500" : "border-gray-200"
              }`}
              aria-invalid={!!errors.nombre}
              aria-describedby={errors.nombre ? "nombre-error" : undefined}
            />
            {errors.nombre && (
              <p id="nombre-error" className="mt-1 text-[11px] text-rose-600 font-light">
                {errors.nombre}
              </p>
            )}
          </div>

          {/* Apellido */}
          <div>
            <label htmlFor="apellido" className="block text-xs font-semibold text-gray-800 mb-1">
              Apellido
            </label>
            <input
              id="apellido"
              name="apellido"
              type="text"
              autoComplete="family-name"
              value={formData.apellido}
              onChange={handleChange}
              placeholder="López"
              className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-xs sm:text-sm text-gray-900 placeholder-gray-400 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-[#6B1F4A]/30 focus:border-[#6B1F4A] ${
                errors.apellido ? "border-rose-400 focus:ring-rose-200 focus:border-rose-500" : "border-gray-200"
              }`}
              aria-invalid={!!errors.apellido}
              aria-describedby={errors.apellido ? "apellido-error" : undefined}
            />
            {errors.apellido && (
              <p id="apellido-error" className="mt-1 text-[11px] text-rose-600 font-light">
                {errors.apellido}
              </p>
            )}
          </div>
        </div>

        {/* Campo: Correo */}
        <div>
          <label htmlFor="correo" className="block text-xs font-semibold text-gray-800 mb-1">
            Correo
          </label>
          <input
            id="correo"
            name="correo"
            type="email"
            autoComplete="email"
            value={formData.correo}
            onChange={handleChange}
            placeholder="ana.lopez@correo.com"
            className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-xs sm:text-sm text-gray-900 placeholder-gray-400 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-[#6B1F4A]/30 focus:border-[#6B1F4A] ${
              errors.correo ? "border-rose-400 focus:ring-rose-200 focus:border-rose-500" : "border-gray-200"
            }`}
            aria-invalid={!!errors.correo}
            aria-describedby={errors.correo ? "correo-error" : undefined}
          />
          {errors.correo && (
            <p id="correo-error" className="mt-1 text-[11px] text-rose-600 flex items-center gap-1 font-light">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{errors.correo}</span>
            </p>
          )}
        </div>

        {/* Campo: Celular (con ícono de teléfono) */}
        <div>
          <label htmlFor="celular" className="block text-xs font-semibold text-gray-800 mb-1">
            Celular
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <Phone className="w-4 h-4" />
            </span>
            <input
              id="celular"
              name="celular"
              type="tel"
              autoComplete="tel"
              maxLength={15}
              value={formData.celular}
              onChange={handleChange}
              placeholder="449 123 4567"
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white text-xs sm:text-sm text-gray-900 placeholder-gray-400 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-[#6B1F4A]/30 focus:border-[#6B1F4A] ${
                errors.celular ? "border-rose-400 focus:ring-rose-200 focus:border-rose-500" : "border-gray-200"
              }`}
              aria-invalid={!!errors.celular}
              aria-describedby={errors.celular ? "celular-error" : undefined}
            />
          </div>
          {errors.celular && (
            <p id="celular-error" className="mt-1 text-[11px] text-rose-600 flex items-center gap-1 font-light">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{errors.celular}</span>
            </p>
          )}
        </div>

        {/* Campo: Contraseña (con candado, botón de mostrar/ocultar y PasswordRequirements) */}
        <div>
          <label htmlFor="password" className="block text-xs font-semibold text-gray-800 mb-1">
            Contraseña
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <Lock className="w-4 h-4" />
            </span>
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              onFocus={() => setIsPasswordFocused(true)}
              onBlur={() => setIsPasswordFocused(false)}
              placeholder="••••••••••"
              className={`w-full pl-10 pr-10 py-2.5 rounded-xl border bg-white text-xs sm:text-sm text-gray-900 placeholder-gray-400 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-[#6B1F4A]/30 focus:border-[#6B1F4A] ${
                errors.password ? "border-rose-400 focus:ring-rose-200 focus:border-rose-500" : "border-gray-200"
              }`}
              aria-invalid={!!errors.password}
              aria-describedby="password-requirements password-error"
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
              visible={isPasswordFocused || formData.password.length > 0}
            />
          </div>

          {errors.password && (
            <p id="password-error" className="mt-1.5 text-[11px] text-rose-600 flex items-center gap-1 font-light">
              <AlertCircle className="w-3 h-3 shrink-0" />
              <span>{errors.password}</span>
            </p>
          )}
        </div>

        {/* Checkbox: Términos y condiciones (Obligatorio) */}
        <div className="pt-1">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              id="acepta_terminos"
              name="acepta_terminos"
              checked={formData.acepta_terminos}
              onChange={handleChange}
              className="w-4 h-4 mt-0.5 rounded text-[#6B1F4A] border-gray-300 focus:ring-[#6B1F4A] accent-[#6B1F4A] cursor-pointer"
            />
            <span className="text-xs text-gray-600 font-light leading-snug">
              Acepto el aviso de privacidad y los términos
            </span>
          </label>
          {errors.acepta_terminos && (
            <p className="mt-1 text-[11px] text-rose-600 font-light ml-6">
              {errors.acepta_terminos}
            </p>
          )}
        </div>

        {/* Checkbox: Promociones (Opcional, desmarcado por defecto) */}
        <div>
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              id="acepta_promociones"
              name="acepta_promociones"
              checked={formData.acepta_promociones}
              onChange={handleChange}
              className="w-4 h-4 mt-0.5 rounded text-[#6B1F4A] border-gray-300 focus:ring-[#6B1F4A] accent-[#6B1F4A] cursor-pointer"
            />
            <span className="text-xs text-gray-600 font-light leading-snug">
              Quiero recibir promociones por WhatsApp o correo
            </span>
          </label>
        </div>

        {/* Botón Principal: Crear cuenta (Estilo Píldora) */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-6 rounded-full bg-[#6B1F4A] hover:bg-[#58183D] active:bg-[#44122F] text-white text-sm font-semibold tracking-wide transition shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-[#6B1F4A] focus:ring-offset-2 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creando tu cuenta...</span>
              </>
            ) : (
              <span>Crear cuenta</span>
            )}
          </button>
        </div>

        {/* Aviso informativo: compras previas como invitada */}
        <div className="pt-2">
          <InfoBanner />
        </div>

        {/* Enlace final a Login */}
        <div className="pt-4 text-center">
          <p className="text-xs text-gray-500 font-light">
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/login"
              className="text-[#6B1F4A] hover:underline font-semibold ml-0.5 transition"
            >
              Inicia sesión
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Eye, EyeOff, Phone, AlertCircle, Loader2 } from "lucide-react";
import InfoBanner from "./InfoBanner";
import PasswordRequirements from "./PasswordRequirements";
import {
  validarNombre,
  validarApellido,
  validarCorreo,
  validarCelular,
  validarContrasena,
  validarTerminos,
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
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

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

  // Validación reactiva de contraseña en tiempo real para el widget PasswordRequirements
  const passwordResult = useMemo(() => {
    return validarContrasena(formData.password, {
      nombre: formData.nombre,
      apellido: formData.apellido,
      correo: formData.correo,
    });
  }, [formData.password, formData.nombre, formData.apellido, formData.correo]);

  // Validador de un campo individual usando el módulo centralizado lib/validaciones
  const validateField = (fieldName: string, value: any, currentValues = formData) => {
    switch (fieldName) {
      case "nombre": {
        const res = validarNombre(value);
        return res.valida ? null : res.error;
      }
      case "apellido": {
        const res = validarApellido(value);
        return res.valida ? null : res.error;
      }
      case "correo": {
        const res = validarCorreo(value);
        return res.valida ? null : res.error;
      }
      case "celular": {
        const res = validarCelular(value);
        return res.valida ? null : res.error;
      }
      case "password": {
        const res = validarContrasena(value, {
          nombre: currentValues.nombre,
          apellido: currentValues.apellido,
          correo: currentValues.correo,
        });
        return res.valida
          ? null
          : res.errores[0] || MENSAJES_VALIDACION.CONTRASENA_NO_CUMPLE_REQUISITOS;
      }
      case "acepta_terminos": {
        const res = validarTerminos(value);
        return res.valida ? null : res.error;
      }
      default:
        return null;
    }
  };

  // Al salir del campo (blur): se valida el campo por primera vez
  const handleBlur = (fieldName: string) => {
    if (fieldName === "password") {
      setIsPasswordFocused(false);
    }

    const errorMsg = validateField(
      fieldName,
      formData[fieldName as keyof typeof formData]
    );

    if (errorMsg) {
      setErrors((prev) => ({ ...prev, [fieldName]: errorMsg }));
    } else {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[fieldName];
        return updated;
      });
    }
  };

  // Al escribir (change): solo se revalida si ya tenía error previo, para quitarlo de inmediato
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;
    const updatedData = { ...formData, [name]: val };
    setFormData(updatedData);

    // Si ya tenía error, se revalida mientras el usuario escribe para quitar el error en cuanto lo corrija
    if (errors[name]) {
      const errorMsg = validateField(name, val, updatedData);
      if (!errorMsg) {
        setErrors((prev) => {
          const updated = { ...prev };
          delete updated[name];
          return updated;
        });
      } else {
        setErrors((prev) => ({ ...prev, [name]: errorMsg }));
      }
    }

    if (generalError) setGeneralError(null);
  };

  // Al enviar: se validan todos los campos y el foco va al primer campo con error
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const fields = [
      "nombre",
      "apellido",
      "correo",
      "celular",
      "password",
      "acepta_terminos",
    ] as const;

    const newErrors: Record<string, string> = {};

    for (const f of fields) {
      const err = validateField(f, formData[f], formData);
      if (err) {
        newErrors[f] = err;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);

      // Foco va al primer campo con error
      const firstErrorField = fields.find((f) => newErrors[f]);
      if (firstErrorField) {
        const el = document.getElementById(firstErrorField);
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
      return;
    }

    try {
      setIsSubmitting(true);
      setGeneralError(null);

      // Enviamos el payload al backend
      const res = await fetch("/api/auth/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: formData.nombre,
          apellido: formData.apellido,
          correo: formData.correo,
          celular: formData.celular,
          password: formData.password,
          acepta_terminos: formData.acepta_terminos,
          acepta_promociones: formData.acepta_promociones,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errores) {
          setErrors(data.errores);

          if (data.errores.general) {
            setGeneralError(data.errores.general);
          }

          // Foco al primer campo con error devuelto por el servidor
          const firstErrorField = fields.find((f) => data.errores[f]);
          if (firstErrorField) {
            const el = document.getElementById(firstErrorField);
            if (el) {
              el.focus();
              el.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }
        } else {
          setGeneralError(data.error || "Ocurrió un error al registrar tu cuenta.");
        }
        return;
      }

      // Redirección exitosa a la pantalla de verificación
      router.push(data.redirectUrl || "/verificar");
    } catch {
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
              maxLength={50}
              value={formData.nombre}
              onChange={handleChange}
              onBlur={() => handleBlur("nombre")}
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
              maxLength={50}
              value={formData.apellido}
              onChange={handleChange}
              onBlur={() => handleBlur("apellido")}
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
            maxLength={254}
            value={formData.correo}
            onChange={handleChange}
            onBlur={() => handleBlur("correo")}
            placeholder="ana.lopez@correo.com"
            className={`w-full px-3.5 py-2.5 rounded-xl border bg-white text-xs sm:text-sm text-gray-900 placeholder-gray-400 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-[#6B1F4A]/30 focus:border-[#6B1F4A] ${
              errors.correo ? "border-rose-400 focus:ring-rose-200 focus:border-rose-500" : "border-gray-200"
            }`}
            aria-invalid={!!errors.correo}
            aria-describedby={errors.correo ? "correo-error" : undefined}
          />
          {errors.correo && (
            <div id="correo-error" className="mt-1 text-[11px] text-rose-600 flex items-start gap-1 font-light">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <div>
                <span>{errors.correo}</span>
                {errors.correo.includes("Este correo ya tiene una cuenta") && (
                  <>
                    <span>. </span>
                    <Link
                      href="/login"
                      className="text-[#6B1F4A] font-semibold underline hover:text-[#58183D] transition ml-0.5"
                    >
                      Iniciar sesión
                    </Link>
                  </>
                )}
              </div>
            </div>
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
              onBlur={() => handleBlur("celular")}
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
              onBlur={() => handleBlur("password")}
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
              onBlur={() => handleBlur("acepta_terminos")}
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

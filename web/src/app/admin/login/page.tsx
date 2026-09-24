"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  Lock,
  Shield,
  Copy,
  Check,
  QrCode,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";
import { NOMBRE_MARCA } from "@/lib/marca";

export default function AdminLoginPage() {
  const router = useRouter();

  // Paso 1: credenciales, Paso 2: 2FA
  const [step, setStep] = useState<1 | 2>(1);

  // Campos de formulario
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [totpCode, setTotpCode] = useState("");

  // Estado de 2FA retornado por API
  const [isSetup, setIsSetup] = useState(false);
  const [manualKey, setManualKey] = useState("");
  const [qrSvg, setQrSvg] = useState("");
  const [codeHint, setCodeHint] = useState("");
  const [copiedKey, setCopiedKey] = useState(false);

  // Estados de carga y error
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [bloqueado, setBloqueado] = useState(false);
  const [minutosRestantes, setMinutosRestantes] = useState<number | null>(null);

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correo.trim() || !password) {
      setErrorMsg("Ingresa tu correo institucional y contraseña.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: correo.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        if (data.bloqueado) {
          setBloqueado(true);
          setMinutosRestantes(data.minutosRestantes || 15);
          setErrorMsg(data.error);
        } else {
          setErrorMsg(data.error || "Credenciales no válidas");
        }
        setLoading(false);
        return;
      }

      if (data.requires2FA) {
        setIsSetup(Boolean(data.isSetup));
        if (data.manualKey) setManualKey(data.manualKey);
        if (data.qrSvg) setQrSvg(data.qrSvg);
        if (data.codeHint) setCodeHint(data.codeHint);
        setStep(2);
      }
    } catch (err) {
      setErrorMsg("Error de conexión con el servidor. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = totpCode.trim().replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      setErrorMsg("El código de verificación debe contener 6 dígitos.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correo: correo.trim(),
          password,
          totpCode: cleanCode,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        if (data.bloqueado) {
          setBloqueado(true);
          setMinutosRestantes(data.minutosRestantes || 15);
          setErrorMsg(data.error);
          setStep(1);
        } else {
          setErrorMsg(data.error || "Credenciales no válidas");
        }
        setLoading(false);
        return;
      }

      // Login exitoso -> Redirigir al panel de administración
      router.push(data.redirectTo || "/admin");
      router.refresh();
    } catch (err) {
      setErrorMsg("Error de conexión con el servidor. Intenta de nuevo.");
      setLoading(false);
    }
  };

  const handleCopyKey = () => {
    if (!manualKey) return;
    navigator.clipboard.writeText(manualKey.replace(/\s+/g, ""));
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  return (
    <div className="w-full max-w-md p-4">
      {/* Header institucional */}
      <div className="text-center mb-6">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-[#5B122C]">
          {NOMBRE_MARCA}
        </h1>
        <p className="text-xs uppercase tracking-widest font-semibold text-stone-500 mt-1">
          Panel de Administración
        </p>
      </div>

      {/* Tarjeta de Inicio de Sesión */}
      <div className="bg-white rounded-2xl shadow-xl border border-stone-200/80 p-8">
        {bloqueado ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 bg-red-100 text-red-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8" />
            </div>
            <h2 className="font-serif text-xl font-bold text-stone-900 mb-2">
              Acceso Bloqueado Temporalmente
            </h2>
            <p className="text-sm text-stone-600 mb-4">
              Se han detectado demasiados intentos fallidos por seguridad.
            </p>
            <div className="bg-red-50 text-red-800 text-xs p-3 rounded-lg border border-red-200 font-medium">
              Intenta nuevamente en aproximadamente {minutosRestantes || 15} minutos.
            </div>
            <button
              onClick={() => {
                setBloqueado(false);
                setStep(1);
                setPassword("");
                setTotpCode("");
                setErrorMsg(null);
              }}
              className="mt-6 text-xs text-[#5B122C] font-semibold hover:underline"
            >
              Reintentar ingresar credenciales
            </button>
          </div>
        ) : step === 1 ? (
          /* PASO 1: CORREO Y CONTRASEÑA */
          <form onSubmit={handleStep1Submit} className="space-y-5">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3 mb-4">
              <KeyRound className="w-5 h-5 text-[#5B122C]" />
              <h2 className="font-semibold text-stone-800 text-base">
                Iniciar Sesión
              </h2>
            </div>

            {errorMsg && (
              <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Correo Electrónico Institucional
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="admin@technovaderm.mx"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B122C] focus:bg-white transition-all text-stone-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B122C] focus:bg-white transition-all text-stone-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#5B122C] text-white font-semibold text-sm rounded-lg hover:bg-[#430c20] transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verificando credenciales...</span>
                </>
              ) : (
                <span>Continuar con verificación 2FA</span>
              )}
            </button>
          </form>
        ) : (
          /* PASO 2: VERIFICACIÓN 2FA TOTP */
          <form onSubmit={handleStep2Submit} className="space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-2">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#5B122C]" />
                <h2 className="font-semibold text-stone-800 text-base">
                  {isSetup ? "Configurar 2FA" : "Autenticación en Dos Pasos"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setErrorMsg(null);
                }}
                className="text-xs text-stone-500 hover:text-stone-800 underline"
              >
                Cambiar usuario
              </button>
            </div>

            {errorMsg && (
              <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {isSetup ? (
              <div className="space-y-4 bg-stone-50 p-4 rounded-xl border border-stone-200">
                <p className="text-xs text-stone-600 leading-relaxed">
                  <strong>Paso 1:</strong> Escanea este código QR con{" "}
                  <span className="font-semibold text-stone-900">
                    Google Authenticator
                  </span>
                  , 1Password o tu aplicación 2FA preferida.
                </p>

                {/* Código QR SVG */}
                {qrSvg && (
                  <div className="flex justify-center p-3 bg-white rounded-lg border border-stone-200 shadow-sm w-48 h-48 mx-auto">
                    <div
                      className="w-full h-full"
                      dangerouslySetInnerHTML={{ __html: qrSvg }}
                    />
                  </div>
                )}

                <div className="text-center">
                  <p className="text-[11px] text-stone-500 mb-1">
                    ¿No puedes escanear el código? Usa la clave manual:
                  </p>
                  <div className="flex items-center justify-center gap-2 bg-white px-3 py-1.5 rounded border border-stone-300 text-xs font-mono text-stone-800">
                    <span>{manualKey}</span>
                    <button
                      type="button"
                      onClick={handleCopyKey}
                      className="p-1 hover:bg-stone-100 rounded text-stone-600 hover:text-[#5B122C] transition-colors"
                      title="Copiar clave secreta"
                    >
                      {copiedKey ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  {copiedKey && (
                    <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">
                      ¡Clave copiada al portapapeles!
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-600">
                Ingresa el código de 6 dígitos que aparece en tu aplicación de autenticación para{" "}
                <strong className="text-stone-900">{correo}</strong>.
              </p>
            )}

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Código de Verificación (6 dígitos)
              </label>
              <div className="relative">
                <QrCode className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={6}
                  placeholder={codeHint ? codeHint.split("").join(" ") : "1 2 3 4 5 6"}
                  value={totpCode}
                  onChange={(e) =>
                    setTotpCode(e.target.value.replace(/\D/g, ""))
                  }
                  className="w-full pl-9 pr-3 py-2.5 text-center tracking-[0.4em] font-mono text-lg bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B122C] focus:bg-white transition-all text-stone-900"
                />
              </div>

              {/* Banner de Ayuda con Código Simulado */}
              {codeHint && (
                <div className="mt-3 p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-2 shadow-2xs">
                  <div>
                    <span className="font-semibold text-amber-800 text-[10px] uppercase tracking-wider block">
                      Código Simulado de Prueba
                    </span>
                    <span className="font-mono font-bold text-sm tracking-widest text-[#5B122C]">
                      {codeHint}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTotpCode(codeHint)}
                    className="text-[11px] font-semibold bg-[#5B122C] hover:bg-[#430c20] text-white px-3 py-1.5 rounded-lg transition-colors shadow-2xs cursor-pointer shrink-0"
                  >
                    Usar código
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || totpCode.trim().length !== 6}
              className="w-full py-3 bg-[#5B122C] text-white font-semibold text-sm rounded-lg hover:bg-[#430c20] transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verificando 2FA...</span>
                </>
              ) : (
                <span>Confirmar y Entrar</span>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Footer corporativo */}
      <div className="text-center mt-6 text-[11px] text-stone-500">
        &copy; {new Date().getFullYear()} {NOMBRE_MARCA} Skincare Omnicanal. Todos los derechos reservados.
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Monitor, KeyRound, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { NOMBRE_MARCA } from "@/lib/marca";

export default function RegisterDeviceForm() {
  const router = useRouter();

  const [codigo, setCodigo] = useState("");
  const [nombreDispositivo, setNombreDispositivo] = useState("Caja Principal Mostrador");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!codigo.trim()) {
      setErrorMsg("Ingresa el código de registro.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/pos/dispositivos/registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: codigo.trim(),
          nombre_dispositivo: nombreDispositivo.trim() || "Terminal Caja",
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setErrorMsg(data?.error || "Error al registrar la terminal.");
        return;
      }

      setIsSuccess(true);
      setTimeout(() => {
        router.push("/pos");
        router.refresh();
      }, 1200);
    } catch {
      setErrorMsg("Error de conexión al registrar el dispositivo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl sm:rounded-[32px] p-8 sm:p-10 border border-stone-200/90 shadow-xl max-w-md w-full">
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-[#FAF3F6] text-[#5B122C] mx-auto flex items-center justify-center mb-4 border border-[#5B122C]/10 shadow-2xs">
          <Monitor className="w-7 h-7 stroke-[1.8]" />
        </div>

        <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 block mb-1">
          {NOMBRE_MARCA} · Punto de Venta
        </span>

        <h1 className="font-serif text-2xl sm:text-3xl font-medium text-stone-900 leading-tight">
          Registro de Terminal
        </h1>

        <p className="text-xs sm:text-sm text-stone-500 font-light mt-1.5">
          Vincula esta computadora a una sucursal para habilitar el cobro en caja.
        </p>
      </div>

      {isSuccess ? (
        <div className="py-6 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="font-serif text-lg font-medium text-stone-900 mb-1">
            ¡Terminal vinculada con éxito!
          </h2>
          <p className="text-xs text-stone-500 mb-4">Redirigiendo a inicio de turno...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {errorMsg && (
            <div
              role="alert"
              className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5 text-xs"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label htmlFor="codigo-reg" className="block text-xs font-semibold text-stone-700 mb-1.5">
              Código de registro *
            </label>
            <div className="relative">
              <input
                id="codigo-reg"
                type="text"
                required
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                placeholder="ej. POS-CENTRO-2026"
                className="w-full px-4 py-3 rounded-2xl border border-stone-300 font-mono text-sm tracking-wider uppercase text-stone-900 focus:border-[#5B122C] focus:ring-2 focus:ring-[#5B122C]/10 outline-none uppercase"
              />
              <KeyRound className="w-4 h-4 text-stone-400 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
            <p className="text-[10px] text-stone-400 mt-1">
              Código de 30 días emitido para tu sucursal.
            </p>
          </div>

          <div>
            <label htmlFor="nombre-disp" className="block text-xs font-semibold text-stone-700 mb-1.5">
              Nombre de este equipo *
            </label>
            <input
              id="nombre-disp"
              type="text"
              required
              value={nombreDispositivo}
              onChange={(e) => setNombreDispositivo(e.target.value)}
              placeholder="ej. Caja 1 Mostrador"
              className="w-full px-4 py-3 rounded-2xl border border-stone-300 text-xs text-stone-900 focus:border-[#5B122C] focus:ring-2 focus:ring-[#5B122C]/10 outline-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-6 rounded-2xl text-xs sm:text-sm font-semibold text-white bg-[#5B122C] hover:bg-[#480E23] active:scale-[0.98] transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validando y registrando...</span>
                </>
              ) : (
                <>
                  <span>Vincular y registrar caja</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <div className="text-center pt-2">
            <Link
              href="/pos"
              className="text-[11px] text-stone-400 hover:text-stone-700 transition"
            >
              Volver al inicio del POS
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}

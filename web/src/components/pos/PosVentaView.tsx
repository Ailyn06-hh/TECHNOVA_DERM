"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Store, User, LogOut, Clock, ShieldCheck, ShoppingCart, Loader2 } from "lucide-react";
import { PosSessionData, DispositivoPos } from "@/lib/pos-session";
import { NOMBRE_MARCA } from "@/lib/marca";

interface PosVentaViewProps {
  dispositivo: DispositivoPos;
  session: PosSessionData;
}

export default function PosVentaView({
  dispositivo,
  session,
}: PosVentaViewProps) {
  const router = useRouter();
  const [isClosing, setIsClosing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleCerrarTurno = async () => {
    setIsClosing(true);
    try {
      const res = await fetch("/api/pos/turnos/cerrar", {
        method: "POST",
      });

      if (res.ok) {
        router.push("/pos");
        router.refresh();
      }
    } catch (error) {
      console.error("[CERRAR TURNO ERROR]:", error);
    } finally {
      setIsClosing(false);
    }
  };

  const rolLabel =
    session.rol.charAt(0).toUpperCase() + session.rol.slice(1).toLowerCase();

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
      {/* Barra Superior del POS */}
      <header className="bg-white rounded-3xl p-4 sm:p-6 border border-stone-200/90 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#5B122C] text-white flex items-center justify-center font-serif text-lg font-bold">
            T
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg font-semibold text-stone-900">
                {NOMBRE_MARCA}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[10px] font-semibold tracking-wider uppercase">
                POS
              </span>
            </div>
            <p className="text-xs text-stone-500 font-light flex items-center gap-1.5 mt-0.5">
              <Store className="w-3.5 h-3.5 text-stone-400" />
              <span>{session.sucursalNombreCompleto}</span>
              <span>·</span>
              <span className="font-medium text-stone-700">{session.cajaNombre}</span>
            </p>
          </div>
        </div>

        {/* Empleada y Cierre de Turno */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-semibold text-stone-900 block">
              {session.nombre} {session.apellido}
            </span>
            <span className="text-[11px] text-stone-400 font-light flex items-center justify-end gap-1">
              <User className="w-3 h-3" />
              <span>{rolLabel}</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 active:scale-95 transition-all cursor-pointer shadow-2xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Cerrar turno</span>
          </button>
        </div>
      </header>

      {/* Contenido Principal de Demostración del POS */}
      <div className="bg-white rounded-3xl p-8 sm:p-10 border border-stone-200/90 shadow-md text-center">
        <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-5 border border-emerald-200/60 shadow-2xs">
          <ShieldCheck className="w-8 h-8 stroke-[2]" />
        </div>

        <h2 className="font-serif text-2xl sm:text-3xl font-medium text-stone-900 mb-2">
          Turno #{session.turnoId} Activo
        </h2>

        <p className="text-xs sm:text-sm text-stone-500 font-light max-w-md mx-auto mb-6">
          Terminal operando con éxito en <strong className="font-semibold text-stone-700">{session.cajaNombre}</strong> a nombre de <strong className="font-semibold text-stone-700">{session.nombre} {session.apellido}</strong>.
        </p>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-50 border border-stone-200/80 text-xs text-stone-600 mb-8">
          <Clock className="w-3.5 h-3.5 text-stone-400" />
          <span>Turno iniciado a las {new Date(session.inicioTurno).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })} hrs.</span>
        </div>

        <div className="p-6 rounded-2xl bg-[#FAF9F6] border border-dashed border-stone-300 max-w-lg mx-auto text-left text-xs text-stone-600 space-y-3">
          <div className="flex items-center justify-between font-semibold text-stone-800 pb-2 border-b border-stone-200">
            <span>Control de Caja y Operaciones</span>
            <span className="text-emerald-700 font-mono">LISTO</span>
          </div>
          <p className="text-stone-500 font-light text-[11px] leading-relaxed">
            Todas las ventas, cobros con tarjeta, cobro en efectivo y entregas de pedidos <em>Click & Collect</em> quedarán vinculadas al identificador único de este turno y al empleado en sesión para auditoría omnicanal.
          </p>
        </div>
      </div>

      {/* Modal de Confirmación de Cierre de Turno */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-stone-200 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center mb-4">
              <LogOut className="w-6 h-6 stroke-[2]" />
            </div>

            <h3 className="font-serif text-lg font-medium text-stone-900 mb-1">
              ¿Deseas cerrar tu turno?
            </h3>

            <p className="text-xs text-stone-500 font-light mb-6">
              Se registrará el fin de jornada en {session.cajaNombre} a nombre de {session.nombre} y la caja quedará disponible para otra empleada.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isClosing}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors"
              >
                Continuar turno
              </button>

              <button
                type="button"
                onClick={handleCerrarTurno}
                disabled={isClosing}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isClosing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Sí, cerrar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

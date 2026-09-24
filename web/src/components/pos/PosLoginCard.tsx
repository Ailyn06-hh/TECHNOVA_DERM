"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Store, User, Lock, AlertCircle, ShieldAlert } from "lucide-react";
import PinDots from "./PinDots";
import PinPad from "./PinPad";
import { NOMBRE_MARCA } from "@/lib/marca";

export interface PosCaja {
  id: number;
  nombre: string;
  enUso: boolean;
  ocupadaPor?: {
    empleadoId: number;
    nombre: string;
  } | null;
  label: string;
}

export interface PosEmpleado {
  id: number;
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  rol: string;
  rolLabel: string;
  bloqueada: boolean;
  bloqueadaHasta?: string | null;
  label: string;
}

export interface PosDispositivoInfo {
  id: number;
  nombre: string;
  sucursalId: number;
  sucursalNombre: string;
  sucursalNombreCompleto: string;
}

interface PosLoginCardProps {
  dispositivo: PosDispositivoInfo;
  cajas: PosCaja[];
  empleadas: PosEmpleado[];
}

export default function PosLoginCard({
  dispositivo,
  cajas,
  empleadas,
}: PosLoginCardProps) {
  const router = useRouter();

  // Selección de caja (primera libre o primera disponible)
  const defaultCaja = cajas.find((c) => !c.enUso)?.id || (cajas[0] ? cajas[0].id : "");
  const [selectedCajaId, setSelectedCajaId] = useState<number | string>(defaultCaja);

  // Selección de empleada (primera no bloqueada)
  const defaultEmpleado = empleadas.find((e) => !e.bloqueada)?.id || (empleadas[0] ? empleadas[0].id : "");
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState<number | string>(defaultEmpleado);

  // Estado del PIN
  const [pin, setPin] = useState<string>("");
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Limpiar PIN al cambiar de caja o empleada
  const handleCajaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCajaId(Number(e.target.value));
    setPin("");
    setIsError(false);
    setErrorMessage(null);
  };

  const handleEmpleadoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedEmpleadoId(Number(e.target.value));
    setPin("");
    setIsError(false);
    setErrorMessage(null);
  };

  // Manejo de dígitos
  const handleDigit = useCallback((d: string) => {
    setPin((prev) => {
      if (prev.length >= 4) return prev;
      setIsError(false);
      setErrorMessage(null);
      return prev + d;
    });
  }, []);

  const handleDelete = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
    setIsError(false);
    setErrorMessage(null);
  }, []);

  // Enviar inicio de turno
  const handleSubmit = useCallback(async () => {
    if (pin.length !== 4 || isLoading || !selectedCajaId || !selectedEmpleadoId) return;

    setIsLoading(true);
    setIsError(false);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/pos/turnos/iniciar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caja_id: Number(selectedCajaId),
          empleado_id: Number(selectedEmpleadoId),
          pin,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setIsError(true);
        setPin(""); // Vaciar círculos tras error
        if (data?.noRegistrado) {
          setErrorMessage("Esta terminal no está autorizada. Redirigiendo a registro...");
          setTimeout(() => {
            router.push("/pos/registrar-dispositivo");
          }, 1500);
          return;
        }
        setErrorMessage(data?.error || "PIN incorrecto. Intenta de nuevo.");
        return;
      }

      // Redirigir a la pantalla de venta del POS
      router.push(data.redirect || "/pos/venta");
      router.refresh();
    } catch {
      setIsError(true);
      setPin("");
      setErrorMessage("Error de conexión con el servidor del POS.");
    } finally {
      setIsLoading(false);
    }
  }, [pin, isLoading, selectedCajaId, selectedEmpleadoId, router]);

  // Soporte de teclado físico (dígitos 0-9, Backspace, Enter)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Si el foco está en un input o select, permitir navegación nativa
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "SELECT"
      ) {
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleDelete();
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleDigit, handleDelete, handleSubmit]);

  const canUseKeypad = Boolean(selectedCajaId) && Boolean(selectedEmpleadoId);
  const canSubmit = pin.length === 4;

  const currentEmpleado = empleadas.find((e) => e.id === Number(selectedEmpleadoId));

  return (
    <div className="bg-white rounded-3xl sm:rounded-[36px] p-6 sm:p-9 border border-stone-200/90 shadow-2xl max-w-sm sm:max-w-md w-full transition-all">
      {/* Encabezado: Logotipo y Subtítulo */}
      <div className="text-center mb-5 sm:mb-6">
        <h1 className="font-serif text-2xl sm:text-3xl font-medium text-stone-900 tracking-tight">
          {NOMBRE_MARCA}
        </h1>
        <p className="text-xs sm:text-sm text-stone-400 font-light mt-1">
          Punto de venta · Inicia tu turno
        </p>
      </div>

      {/* Fila con dos selectores: Tienda y Caja */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mb-3">
        {/* Selector Tienda (fija y deshabilitada) */}
        <div>
          <label className="block text-[11px] font-semibold text-stone-600 mb-1">
            Tienda
          </label>
          <div className="relative">
            <select
              disabled
              value={dispositivo.sucursalNombreCompleto}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 bg-stone-100 text-stone-600 text-xs font-medium cursor-not-allowed appearance-none truncate pr-6"
            >
              <option>{dispositivo.sucursalNombreCompleto}</option>
            </select>
            <Store className="w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-3 pointer-events-none" />
          </div>
        </div>

        {/* Selector Caja */}
        <div>
          <label htmlFor="select-caja" className="block text-[11px] font-semibold text-stone-700 mb-1">
            Caja
          </label>
          <select
            id="select-caja"
            value={selectedCajaId}
            onChange={handleCajaChange}
            className="w-full px-3 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-xs font-medium focus:border-[#5B122C] focus:ring-1 focus:ring-[#5B122C] outline-none transition truncate cursor-pointer"
          >
            {cajas.map((c) => (
              <option key={c.id} value={c.id} disabled={c.enUso}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selector Empleada */}
      <div className="mb-5 sm:mb-6">
        <label htmlFor="select-empleada" className="block text-[11px] font-semibold text-stone-700 mb-1">
          Empleada
        </label>
        <div className="relative">
          <select
            id="select-empleada"
            value={selectedEmpleadoId}
            onChange={handleEmpleadoChange}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-900 text-xs font-medium focus:border-[#5B122C] focus:ring-1 focus:ring-[#5B122C] outline-none transition cursor-pointer"
          >
            {empleadas.map((e) => (
              <option key={e.id} value={e.id} disabled={e.bloqueada}>
                {e.label}
              </option>
            ))}
          </select>
          <User className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
        </div>

        {currentEmpleado?.bloqueada && (
          <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
            <span>Bloqueada temporalmente por intentos fallidos.</span>
          </p>
        )}
      </div>

      {/* Título de PIN y Círculos */}
      <div className="text-center mb-4">
        <h2 className="font-bold text-xs sm:text-sm text-stone-800 tracking-wide">
          Ingresa tu PIN de 4 dígitos
        </h2>

        {/* 4 Círculos de PIN */}
        <PinDots pinLength={pin.length} isError={isError} />

        {/* Mensaje de Error */}
        {errorMessage && (
          <div
            role="alert"
            className="mt-2 text-rose-600 text-xs font-medium flex items-center justify-center gap-1.5 animate-fade-in"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Teclado Numérico */}
      <div className="mb-5">
        <PinPad
          onDigit={handleDigit}
          onDelete={handleDelete}
          onSubmit={handleSubmit}
          canSubmit={canSubmit}
          disabled={!canUseKeypad || currentEmpleado?.bloqueada}
          isLoading={isLoading}
        />
      </div>

      {/* Pie pequeño gris con candado */}
      <div className="text-center border-t border-stone-100 pt-3">
        <p className="text-[11px] text-stone-400 font-light flex items-center justify-center gap-1.5">
          <Lock className="w-3 h-3 text-stone-400" />
          <span>Cada venta queda registrada a nombre de quien la hace.</span>
        </p>
      </div>
    </div>
  );
}

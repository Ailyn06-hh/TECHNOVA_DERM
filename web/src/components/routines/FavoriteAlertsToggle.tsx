"use client";

import React, { useState, useEffect } from "react";
import PreferenceSwitch from "@/components/account/notifications/PreferenceSwitch";

interface FavoriteAlertsToggleProps {
  initialActivo?: boolean;
  onCambio?: (activo: boolean) => void;
}

export default function FavoriteAlertsToggle({
  initialActivo = true,
  onCambio,
}: FavoriteAlertsToggleProps) {
  const [activo, setActivo] = useState(initialActivo);
  const [cargando, setCargando] = useState(false);

  // Cargar estado real desde las preferencias
  useEffect(() => {
    async function fetchEstado() {
      try {
        const res = await fetch("/api/cuenta/preferencias-notificacion");
        if (res.ok) {
          const data = await res.json();
          const favs = data?.preferencias?.favoritos;
          if (favs) {
            const isAnyActive = Boolean(favs.push || favs.whatsapp || favs.correo);
            setActivo(isAnyActive);
          }
        }
      } catch (err) {
        console.error("Error al cargar estado de favoritos:", err);
      }
    }
    fetchEstado();
  }, []);

  const handleToggle = async (nuevoValor: boolean) => {
    setActivo(nuevoValor);
    setCargando(true);
    if (onCambio) onCambio(nuevoValor);

    try {
      // Si se activa, encendemos push (y mantenemos otros si estaban); si se apaga, apagamos todos
      const canales: Array<"push" | "whatsapp" | "correo"> = ["push", "whatsapp", "correo"];

      for (const canal of canales) {
        await fetch("/api/cuenta/preferencias-notificacion", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            categoria: "favoritos",
            canal,
            activo: nuevoValor && canal === "push" ? true : nuevoValor ? false : false,
          }),
        });
      }
    } catch (err) {
      console.error("Error al actualizar alertas de favoritos:", err);
      setActivo(!nuevoValor);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs">
      <div className="pr-4">
        <label htmlFor="toggle-alertas-favoritos" className="text-xs sm:text-sm font-semibold text-stone-900 block cursor-pointer">
          Alertas de favoritos
        </label>
        <p className="text-[11px] sm:text-xs text-stone-500 font-light mt-0.5 leading-relaxed">
          Recibe avisos automáticos cuando tus productos favoritos bajen de precio o queden pocas piezas en stock.
        </p>
      </div>

      <div className="shrink-0">
        <PreferenceSwitch
          id="toggle-alertas-favoritos"
          checked={activo}
          ariaLabel="Activar o desactivar alertas de favoritos"
          loading={cargando}
          onChange={handleToggle}
        />
      </div>
    </div>
  );
}

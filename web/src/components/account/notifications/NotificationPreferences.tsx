"use client";

import React, { useState, useEffect } from "react";
import PreferenceSwitch from "./PreferenceSwitch";
import {
  isPushSupported,
  getPushPermissionState,
  solicitarPermisoYSuscribir,
} from "./PushPermissionHelper";

export interface PreferencesState {
  pedidos: { push: boolean; whatsapp: boolean; correo: boolean };
  recompras: { push: boolean; whatsapp: boolean; correo: boolean };
  favoritos: { push: boolean; whatsapp: boolean; correo: boolean };
  promociones: { push: boolean; whatsapp: boolean; correo: boolean };
}

interface NotificationPreferencesProps {
  initialPreferences: PreferencesState;
  showToast?: (toast: { message: string; type: "success" | "error" | "info" }) => void;
}

export default function NotificationPreferences({
  initialPreferences,
  showToast,
}: NotificationPreferencesProps) {
  const [prefs, setPrefs] = useState<PreferencesState>(initialPreferences);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    setPushPermission(getPushPermissionState());
  }, []);

  const handleToggle = async (
    categoria: keyof PreferencesState,
    canal: "push" | "whatsapp" | "correo",
    nuevoValor: boolean
  ) => {
    const key = `${categoria}-${canal}`;
    setLoadingKey(key);

    // Si intenta encender Push y aún no se ha otorgado permiso en el navegador
    if (canal === "push" && nuevoValor) {
      if (!isPushSupported()) {
        if (showToast) {
          showToast({ message: "Tu navegador no soporta notificaciones Push.", type: "error" });
        }
        setLoadingKey(null);
        return;
      }

      if (pushPermission !== "granted") {
        const subRes = await solicitarPermisoYSuscribir();
        const nuevoEstado = getPushPermissionState();
        setPushPermission(nuevoEstado);

        if (!subRes.success) {
          if (showToast) {
            showToast({
              message: subRes.error || "No se otorgaron permisos para notificaciones del navegador.",
              type: "error",
            });
          }
          setLoadingKey(null);
          return;
        }
      }
    }

    // Actualización optimista
    const prevPrefs = { ...prefs, [categoria]: { ...prefs[categoria] } };
    setPrefs((current) => ({
      ...current,
      [categoria]: {
        ...current[categoria],
        [canal]: nuevoValor,
      },
    }));

    try {
      const res = await fetch("/api/cuenta/preferencias-notificacion", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoria,
          canal,
          activo: nuevoValor,
        }),
      });

      if (!res.ok) {
        throw new Error("No se pudo actualizar la preferencia");
      }

      if (showToast) {
        showToast({
          message: "Preferencia de aviso actualizada.",
          type: "success",
        });
      }
    } catch (err: any) {
      // Reversión optimista
      setPrefs(prevPrefs);
      if (showToast) {
        showToast({
          message: err.message || "Error al actualizar la preferencia.",
          type: "error",
        });
      }
    } finally {
      setLoadingKey(null);
    }
  };

  const isPushBloqueado = pushPermission === "denied" || pushPermission === "unsupported";

  const rows: Array<{
    id: keyof PreferencesState;
    titulo: string;
    descripcion: string;
  }> = [
    {
      id: "pedidos",
      titulo: "Estado de pedidos",
      descripcion: "Pagado, listo, enviado, entregado",
    },
    {
      id: "recompras",
      titulo: "Recompras",
      descripcion: "Cuando un producto se te esté terminando",
    },
    {
      id: "favoritos",
      titulo: "Favoritos",
      descripcion: "Stock y cambios de precio",
    },
    {
      id: "promociones",
      titulo: "Promociones",
      descripcion: "Combos y descuentos",
    },
  ];

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/90 shadow-xs">
      <h2 className="font-serif text-xl sm:text-2xl font-medium text-stone-900 tracking-tight mb-1">
        ¿Cómo quieres enterarte?
      </h2>
      <p className="text-xs text-stone-500 font-light mb-6">
        Elige por cuáles canales recibir cada tipo de aviso.
      </p>

      {/* Tabla accesible de preferencias */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" aria-label="Preferencias de notificación por canal">
          <thead>
            <tr className="border-b border-stone-100 text-xs font-medium text-stone-500 pb-3">
              <th scope="col" className="pb-3 pr-4 font-normal text-stone-400">
                Categoría
              </th>
              <th scope="col" className="pb-3 px-3 text-center font-medium text-stone-700">
                Push
              </th>
              <th scope="col" className="pb-3 px-3 text-center font-medium text-stone-700">
                <span className="block">WhatsApp</span>
                <span className="block text-[9px] font-normal text-stone-400">Próximamente</span>
              </th>
              <th scope="col" className="pb-3 pl-3 text-center font-medium text-stone-700">
                Correo
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100/70">
            {rows.map((row) => (
              <tr key={row.id} className="py-4">
                <th scope="row" className="py-4 pr-4 font-normal align-middle">
                  <p className="text-xs sm:text-sm font-semibold text-stone-800 tracking-tight">
                    {row.titulo}
                  </p>
                  <p className="text-[11px] sm:text-xs text-stone-500 font-light mt-0.5 leading-snug">
                    {row.descripcion}
                  </p>
                </th>
                {/* Push */}
                <td className="py-4 px-3 text-center align-middle">
                  <div className="flex justify-center">
                    <PreferenceSwitch
                      checked={prefs[row.id].push}
                      disabled={isPushBloqueado}
                      ariaLabel={`${row.titulo} por notificación Push en el navegador`}
                      loading={loadingKey === `${row.id}-push`}
                      onChange={(val) => handleToggle(row.id, "push", val)}
                    />
                  </div>
                </td>
                {/* WhatsApp */}
                <td className="py-4 px-3 text-center align-middle">
                  <div className="flex justify-center">
                    <PreferenceSwitch
                      checked={prefs[row.id].whatsapp}
                      ariaLabel={`${row.titulo} por WhatsApp`}
                      loading={loadingKey === `${row.id}-whatsapp`}
                      onChange={(val) => handleToggle(row.id, "whatsapp", val)}
                    />
                  </div>
                </td>
                {/* Correo */}
                <td className="py-4 pl-3 text-center align-middle">
                  <div className="flex justify-center">
                    <PreferenceSwitch
                      checked={prefs[row.id].correo}
                      ariaLabel={`${row.titulo} por Correo electrónico`}
                      loading={loadingKey === `${row.id}-correo`}
                      onChange={(val) => handleToggle(row.id, "correo", val)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Nota en caso de permiso Push denegado */}
      {isPushBloqueado && (
        <div className="mt-4 p-3 rounded-xl bg-amber-50/80 border border-amber-200/60 text-[11px] text-amber-800">
          Activa las notificaciones del navegador en los permisos de tu sitio para usar notificaciones Push.
        </div>
      )}

      {/* Aviso institucional inferior */}
      <p className="text-[11px] text-stone-400 font-light mt-6 pt-4 border-t border-stone-100 leading-relaxed">
        Los correos de compra y seguridad de tu cuenta siempre se envían.
      </p>
    </div>
  );
}

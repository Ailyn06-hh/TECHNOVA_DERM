"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Sparkles, CheckCircle2 } from "lucide-react";
import CartSyncBanner from "./CartSyncBanner";
import CartGroup from "./CartGroup";
import CartItemRow from "./CartItemRow";
import CartSummary from "./CartSummary";
import CartSuggestions from "./CartSuggestions";
import EmptyCart from "./EmptyCart";
import { useCarrito } from "@/contexts/CarritoContext";
import type { CarritoCalculado } from "@/lib/carrito";
import type { SugerenciaProducto } from "@/lib/recomendaciones";

export interface CartPageProps {
  initialCarrito: CarritoCalculado;
  initialSugerencias?: SugerenciaProducto[];
  isLoggedIn: boolean;
}

export default function CartPage({
  initialCarrito,
  initialSugerencias = [],
  isLoggedIn,
}: CartPageProps) {
  const [carrito, setCarrito] = useState<CarritoCalculado>(initialCarrito);
  const [sugerencias, setSugerencias] = useState<SugerenciaProducto[]>(initialSugerencias);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [screenReaderAnnouncement, setScreenReaderAnnouncement] = useState("");

  const { refreshCart: refreshGlobalBadge, showToast } = useCarrito();

  const announce = useCallback((msg: string) => {
    setScreenReaderAnnouncement(msg);
    setTimeout(() => setScreenReaderAnnouncement(""), 4000);
  }, []);

  const broadcastUpdate = useCallback(() => {
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        const channel = new BroadcastChannel("technova_cart_channel");
        channel.postMessage({ type: "CART_UPDATED" });
        channel.close();
      }
    } catch {
      // Ignore broadcast errors
    }
  }, []);

  // Recargar carrito desde la API
  const fetchCart = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await fetch("/api/carrito", { cache: "no-store" });
      if (res.ok) {
        const data: CarritoCalculado = await res.json();
        setCarrito(data);
      }
    } catch (err) {
      console.error("Error al actualizar carrito:", err);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, []);

  // Recargar sugerencias
  const fetchSugerencias = useCallback(async () => {
    try {
      const res = await fetch("/api/carrito/sugerencias", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setSugerencias(data.sugerencias || []);
      }
    } catch (err) {
      console.error("Error al obtener sugerencias:", err);
    }
  }, []);

  // Si no llegaron sugerencias iniciales, cargarlas al montar
  useEffect(() => {
    if (initialSugerencias.length === 0) {
      fetchSugerencias();
    }
  }, [initialSugerencias.length, fetchSugerencias]);

  // Sincronización omnicanal: BroadcastChannel, window focus y polling de 60s
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        channel = new BroadcastChannel("technova_cart_channel");
        channel.onmessage = (event) => {
          if (event.data?.type === "CART_UPDATED") {
            fetchCart(true);
            refreshGlobalBadge();
            setSyncNotice("Tu carrito se actualizó desde otra pestaña");
            setTimeout(() => setSyncNotice(null), 5000);
          }
        };
      }
    } catch {
      // Ignore
    }

    const handleFocusOrVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchCart(true);
        refreshGlobalBadge();
      }
    };

    window.addEventListener("focus", handleFocusOrVisibility);
    document.addEventListener("visibilitychange", handleFocusOrVisibility);

    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchCart(true);
        refreshGlobalBadge();
      }
    }, 60000);

    return () => {
      channel?.close();
      window.removeEventListener("focus", handleFocusOrVisibility);
      document.removeEventListener("visibilitychange", handleFocusOrVisibility);
      clearInterval(intervalId);
    };
  }, [fetchCart, refreshGlobalBadge]);

  // Cambiar cantidad con rollback y respuesta del servidor
  const handleUpdateQuantity = async (itemId: number, newQty: number) => {
    try {
      const res = await fetch(`/api/carrito/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cantidad: newQty }),
      });

      const data = await res.json();

      if (!res.ok || !data.exito) {
        showToast({
          message: data.error || "No se pudo actualizar la cantidad.",
          type: "error",
        });
        announce(data.error || "Error al actualizar cantidad.");
        await fetchCart(true);
        return;
      }

      setCarrito(data.carrito);
      await refreshGlobalBadge();
      broadcastUpdate();
      announce(`Cantidad actualizada a ${newQty}`);
    } catch {
      showToast({
        message: "Error de red al actualizar la cantidad.",
        type: "error",
      });
      await fetchCart(true);
    }
  };

  // Quitar artículo con Toast de 6 segundos y botón "Deshacer"
  const handleRemoveItem = async (itemId: number) => {
    try {
      const res = await fetch(`/api/carrito/items/${itemId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok || !data.exito) {
        showToast({
          message: data.error || "No se pudo eliminar el artículo.",
          type: "error",
        });
        return;
      }

      const itemEliminado = data.itemEliminado;
      const avisoGrupo = data.avisoGrupo;

      setCarrito(data.carrito);
      await refreshGlobalBadge();
      broadcastUpdate();

      announce(`${itemEliminado?.nombre || "Artículo"} eliminado de la bolsa.`);

      // Toast de 6s con botón Deshacer
      const toastMsg = avisoGrupo
        ? `${itemEliminado?.nombre || "Artículo"} eliminado. ${avisoGrupo}`
        : `${itemEliminado?.nombre || "Artículo"} eliminado de tu bolsa`;

      showToast({
        message: toastMsg,
        type: "info",
        actionLabel: "Deshacer",
        duration: 6000,
        onAction: async () => {
          try {
            const restoreRes = await fetch(`/api/carrito/items/${itemId}/restaurar`, {
              method: "POST",
            });
            const restoreData = await restoreRes.json();
            if (restoreRes.ok && restoreData.exito) {
              setCarrito(restoreData.carrito);
              await refreshGlobalBadge();
              broadcastUpdate();
              announce("Artículo restaurado con éxito.");
              showToast({
                message: "Artículo restaurado a tu bolsa",
                type: "success",
              });
            } else {
              showToast({
                message: restoreData.error || "No se pudo restaurar el artículo.",
                type: "error",
              });
            }
          } catch {
            showToast({
              message: "Error de red al restaurar artículo.",
              type: "error",
            });
          }
        },
      });
    } catch {
      showToast({
        message: "Error de conexión al eliminar artículo.",
        type: "error",
      });
    }
  };

  // Agregar paso faltante en un grupo para recuperar descuento
  const handleReAddMissing = async (
    productoId: number,
    grupoId: string,
    grupoTipo: "rutina" | "combo",
    grupoClave: string,
    descuentoPct: number
  ) => {
    try {
      const res = await fetch("/api/carrito/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          producto_id: productoId,
          cantidad: 1,
          grupo_id: grupoId,
          grupo_tipo: grupoTipo,
          grupo_clave: grupoClave,
          descuento_porcentaje: descuentoPct,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast({
          message: data.message || data.error || "No se pudo agregar el paso.",
          type: "error",
        });
        return;
      }

      await fetchCart(true);
      await refreshGlobalBadge();
      broadcastUpdate();
      announce("Paso agregado a la rutina. Descuento restablecido.");
      showToast({
        message: "Paso agregado a la rutina con descuento",
        type: "success",
      });
    } catch {
      showToast({
        message: "Error de conexión al agregar el paso.",
        type: "error",
      });
    }
  };

  // Agregar producto desde "También te puede gustar"
  const handleAddSuggestion = async (productoId: number) => {
    try {
      const res = await fetch("/api/carrito/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          producto_id: productoId,
          cantidad: 1,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast({
          message: data.message || data.error || "No se pudo agregar el producto.",
          type: "error",
        });
        return;
      }

      await fetchCart(true);
      await refreshGlobalBadge();
      await fetchSugerencias();
      broadcastUpdate();
      announce("Fórmula agregada a tu bolsa.");
      showToast({
        message: "Agregado a tu bolsa",
        type: "success",
      });
    } catch {
      showToast({
        message: "Error de conexión al agregar el producto.",
        type: "error",
      });
    }
  };

  const hasItems = carrito.tieneArticulos && carrito.totalItems > 0;

  return (
    <div className="min-h-screen bg-[#FAF8F5] py-8 sm:py-12">
      {/* Contenedor aria-live para lectores de pantalla */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {screenReaderAnnouncement}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Barra superior de navegación y título */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link
                href="/catalogo"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#6B1F4A] transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Seguir explorando</span>
              </Link>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-medium text-slate-900 tracking-tight flex items-center gap-3">
              <span>Bolsa de Compras</span>
              {hasItems && (
                <span className="text-sm font-sans font-normal text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  {carrito.totalItems} {carrito.totalItems === 1 ? "artículo" : "artículos"}
                </span>
              )}
            </h1>
          </div>

          {/* Botón discreto de refrescar si el usuario desea actualizar manualmente */}
          {hasItems && (
            <button
              type="button"
              onClick={() => fetchCart(false)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-500 hover:text-slate-800 bg-white border border-slate-200/80 shadow-2xs hover:shadow-xs transition self-start sm:self-auto"
              title="Actualizar disponibilidad y precios"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Actualizar</span>
            </button>
          )}
        </div>

        {/* Aviso de sincronización desde otra pestaña si ocurrió */}
        {syncNotice && (
          <div className="mb-6 p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200/80 text-amber-900 text-xs sm:text-sm flex items-center gap-2 animate-fade-in shadow-2xs">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{syncNotice}</span>
          </div>
        )}

        {/* Si el carrito está vacío */}
        {!hasItems ? (
          <div>
            <EmptyCart />
            {sugerencias.length > 0 && (
              <div className="max-w-4xl mx-auto mt-12">
                <CartSuggestions
                  sugerencias={sugerencias}
                  onAddSuggestion={handleAddSuggestion}
                />
              </div>
            )}
          </div>
        ) : (
          /* Cuadrícula de 2 Columnas: Lista de Artículos + Resumen Sticky */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Columna Principal: 8 columnas */}
            <div className="lg:col-span-8 space-y-6">
              {/* Aviso Omnicanal (Web / App / Tienda física) */}
              {carrito.avisoOmnicanal && (
                <CartSyncBanner aviso={carrito.avisoOmnicanal} />
              )}

              {/* 1. Grupos (Rutinas y Combos) */}
              {carrito.grupos.map((grupo) => (
                <CartGroup
                  key={grupo.grupo_id}
                  grupo={grupo}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemoveItem={handleRemoveItem}
                  onReAddMissing={handleReAddMissing}
                />
              ))}

              {/* 2. Artículos Individuales */}
              {carrito.otrosItems.length > 0 && (
                <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-100 shadow-xs mb-6 transition-all">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <h3 className="font-serif text-lg sm:text-xl font-medium text-slate-900 leading-snug">
                      Fórmulas individuales
                    </h3>
                    <span className="text-xs text-slate-400 font-light">
                      {carrito.otrosItems.length}{" "}
                      {carrito.otrosItems.length === 1 ? "artículo" : "artículos"}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 mt-1">
                    {carrito.otrosItems.map((item) => (
                      <CartItemRow
                        key={item.id}
                        item={item}
                        onUpdateQuantity={handleUpdateQuantity}
                        onRemoveItem={handleRemoveItem}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Sugerencias "También te puede gustar" */}
              <CartSuggestions
                sugerencias={sugerencias}
                onAddSuggestion={handleAddSuggestion}
              />
            </div>

            {/* Columna Lateral Sticky: 4 columnas */}
            <div className="lg:col-span-4">
              <CartSummary
                carrito={carrito}
                isLoggedIn={isLoggedIn}
                onRefresh={() => fetchCart(false)}
                onAnnounce={announce}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  ShoppingBag,
  Sparkles,
  Loader2,
  Check,
  AlertCircle,
  ArrowRight,
  Barcode,
} from "lucide-react";
import StoreStockCard, { TiendaStockInfo } from "./StoreStockCard";
import RestockBadge from "./RestockBadge";
import LotList, { LoteItemData } from "./LotList";
import StockStatusBadge from "./StockStatusBadge";

interface StoreAvailabilityPanelProps {
  productoId: number | null;
  onClose: () => void;
  onItemAdded?: () => void;
}

export default function StoreAvailabilityPanel({
  productoId,
  onClose,
  onItemAdded,
}: StoreAvailabilityPanelProps) {
  const router = useRouter();

  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<{
    producto: {
      id: number;
      nombre: string;
      sku: string;
      codigoBarras: string | null;
      precio: number;
      colorFondo: string;
      colorFrasco: string;
      tipoRutina: string | null;
      descripcion?: string;
    };
    sucursalActual: {
      id: number;
      nombre: string;
      nombreCompleto: string;
    };
    tiendas: TiendaStockInfo[];
    lotes: LoteItemData[];
    ordenCompra: {
      folio: string;
      proveedor: string;
      cantidad: number;
      llegadaTexto: string;
    } | null;
  } | null>(null);

  const [addingToSale, setAddingToSale] = useState<boolean>(false);
  const [addSuccess, setAddSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!productoId) {
      setData(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setErrorMessage(null);
    setAddSuccess(false);

    const fetchDetail = async () => {
      try {
        const res = await fetch(`/api/pos/inventario/${productoId}`);
        if (!res.ok) throw new Error("Error al obtener disponibilidad del producto");
        const json = await res.json();
        if (isMounted) {
          setData(json);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMessage(err.message || "No se pudo cargar el detalle del producto.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetail();

    return () => {
      isMounted = false;
    };
  }, [productoId]);

  const handleAddToSale = async () => {
    if (!data?.producto) return;
    setAddingToSale(true);
    setErrorMessage(null);

    try {
      // 1. Obtener o crear borrador actual
      const draftRes = await fetch("/api/pos/ventas/actual");
      if (!draftRes.ok) {
        throw new Error("No se pudo obtener el ticket actual de venta");
      }
      const draftData = await draftRes.json();
      const ticketId = draftData.ticket?.id;

      if (!ticketId) {
        throw new Error("ID de ticket no disponible");
      }

      // 2. Agregar el producto al ticket
      const addRes = await fetch(`/api/pos/ventas/${ticketId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          producto_id: data.producto.id,
          cantidad: 1,
        }),
      });

      if (!addRes.ok) {
        const addErr = await addRes.json();
        throw new Error(addErr.error || "No se pudo agregar el producto a la venta");
      }

      setAddSuccess(true);
      if (onItemAdded) onItemAdded();

      setTimeout(() => {
        setAddSuccess(false);
      }, 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "Error al agregar a la venta");
    } finally {
      setAddingToSale(false);
    }
  };

  if (!productoId) {
    return (
      <aside className="w-96 bg-[#FAF7F2] border-l border-stone-200/90 p-6 flex flex-col items-center justify-center text-center select-none text-stone-400 font-light">
        <div className="w-16 h-16 rounded-3xl bg-stone-200/50 flex items-center justify-center mb-3 text-stone-400">
          <ShoppingBag className="w-7 h-7" />
        </div>
        <h4 className="text-sm font-medium text-stone-700">
          Disponibilidad en tiendas
        </h4>
        <p className="text-xs text-stone-400 mt-1 max-w-[220px]">
          Selecciona un producto de la tabla para ver el stock en otras sucursales, lotes FEFO y órdenes de reabastecimiento.
        </p>
      </aside>
    );
  }

  if (loading) {
    return (
      <aside className="w-96 bg-[#FAF7F2] border-l border-stone-200/90 p-6 flex flex-col items-center justify-center select-none">
        <Loader2 className="w-8 h-8 text-[#5B122C] animate-spin mb-2" />
        <span className="text-xs text-stone-500 font-light">
          Consultando stock omnicanal...
        </span>
      </aside>
    );
  }

  if (errorMessage && !data) {
    return (
      <aside className="w-96 bg-[#FAF7F2] border-l border-stone-200/90 p-6 flex flex-col select-none">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold text-stone-900">Error</h4>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-stone-200 text-stone-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200 font-light">
          {errorMessage}
        </p>
      </aside>
    );
  }

  if (!data) return null;

  const { producto, tiendas, lotes, ordenCompra } = data;
  const tiendaActual = tiendas.find((t) => t.esTiendaActual);
  const stockDisponibleActual = tiendaActual?.disponibles || 0;
  const sinStockActual = stockDisponibleActual <= 0;

  return (
    <aside className="w-96 bg-[#FAF7F2] border-l border-stone-200/90 flex flex-col h-full overflow-hidden select-none z-10 shadow-sm">
      {/* Cabecera del panel */}
      <div className="p-5 border-b border-stone-200/90 bg-white/80 backdrop-blur-xs flex items-center justify-between gap-3 shrink-0">
        <div>
          <h3 className="font-serif text-lg font-medium text-stone-900">
            Disponibilidad en tiendas
          </h3>
          <p className="text-[11px] text-stone-400 font-light truncate">
            Inventario omnicanal en tiempo real
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
          title="Cerrar detalle"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Contenido con scroll */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Ficha rápida del producto */}
        <div className="p-4 rounded-3xl bg-white border border-stone-200/90 shadow-2xs space-y-3">
          <div className="flex items-start gap-3">
            {/* Miniatura representativa del frasco */}
            <div
              className="w-14 h-16 rounded-2xl flex items-center justify-center shrink-0 border border-black/5"
              style={{ backgroundColor: producto.colorFondo || "#F3E1E4" }}
            >
              <div className="flex flex-col items-center">
                <div
                  className="w-2.5 h-1.5 rounded-t-xs"
                  style={{ backgroundColor: "#2A2320" }}
                />
                <div
                  className="w-5 h-8 rounded-b-sm shadow-xs border border-black/10 flex items-center justify-center"
                  style={{ backgroundColor: producto.colorFrasco || "#D08C98" }}
                >
                  <div className="w-3 h-4 bg-white/70 rounded-2xs flex items-center justify-center">
                    <span className="text-[5px] font-serif text-stone-800 font-bold">N</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold text-stone-900 leading-snug">
                {producto.nombre}
              </h4>

              <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-stone-500 font-light">
                <span className="font-mono bg-stone-100 px-1.5 py-0.5 rounded text-[10px] text-stone-700">
                  {producto.sku}
                </span>

                {producto.codigoBarras && (
                  <span className="flex items-center gap-1 font-mono text-[10px] text-stone-400">
                    <Barcode className="w-3 h-3 text-stone-400" />
                    <span>{producto.codigoBarras}</span>
                  </span>
                )}
              </div>

              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-base font-bold text-stone-900">
                  ${producto.precio.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                </span>
                {producto.tipoRutina && (
                  <span className="text-[10px] text-stone-500 capitalize">
                    {producto.tipoRutina}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Alerta de reabastecimiento si hay OC en tránsito */}
        {ordenCompra && <RestockBadge orden={ordenCompra} />}

        {/* Tarjetas de stock por tienda */}
        <div className="space-y-2">
          <h5 className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider px-1">
            Existencias por sucursal
          </h5>

          <div className="space-y-2">
            {tiendas.map((t) => (
              <StoreStockCard key={t.id} tienda={t} />
            ))}
          </div>
        </div>

        {/* Desglose de Lotes (FEFO) para esta sucursal */}
        <div className="space-y-2">
          <h5 className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider px-1">
            Lotes en {data.sucursalActual.nombre} (FEFO)
          </h5>

          <LotList lotes={lotes} />
        </div>

        {errorMessage && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Pie de acción fija */}
      <div className="p-5 border-t border-stone-200/90 bg-white/95 backdrop-blur-xs space-y-2 shrink-0">
        <button
          type="button"
          onClick={handleAddToSale}
          disabled={addingToSale || sinStockActual}
          className={`w-full py-3 px-4 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer ${
            addSuccess
              ? "bg-emerald-600 text-white"
              : sinStockActual
              ? "bg-stone-200 text-stone-400 cursor-not-allowed"
              : "bg-[#181412] hover:bg-[#2A2320] text-white active:scale-[0.98]"
          }`}
        >
          {addingToSale ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Agregando a venta...</span>
            </>
          ) : addSuccess ? (
            <>
              <Check className="w-4 h-4" />
              <span>¡Agregado a la venta!</span>
            </>
          ) : (
            <>
              <ShoppingBag className="w-4 h-4" />
              <span>
                {sinStockActual ? "Sin stock en esta tienda" : "Agregar a la venta"}
              </span>
            </>
          )}
        </button>

        {addSuccess && (
          <button
            type="button"
            onClick={() => router.push("/pos/venta")}
            className="w-full py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-amber-200/70"
          >
            <span>Ir al mostrador de venta</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </aside>
  );
}

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Boxes, RefreshCw, ShoppingBag, Check, ArrowRight } from "lucide-react";
import InventorySearch from "./InventorySearch";
import InventoryFilterTabs, { InventoryFilterType } from "./InventoryFilterTabs";
import InventoryTable from "./InventoryTable";
import StoreAvailabilityPanel from "./StoreAvailabilityPanel";
import type { PosSessionData } from "@/lib/pos-session";
import type { ItemInventarioPos } from "@/app/api/pos/inventario/route";

interface InventoryPageProps {
  session: PosSessionData;
}

export default function InventoryPage({ session }: InventoryPageProps) {
  const router = useRouter();

  const [filtro, setFiltro] = useState<InventoryFilterType>("todos");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [orden, setOrden] = useState<string>("nombre");
  const [direccion, setDireccion] = useState<"asc" | "desc">("asc");

  const [items, setItems] = useState<ItemInventarioPos[]>([]);
  const [counts, setCounts] = useState<{ todos: number; agotandose: number; caducando: number }>({
    todos: 0,
    agotandose: 0,
    caducando: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Producto seleccionado para el panel lateral de disponibilidad
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  // Feedback al agregar a venta
  const [addingId, setAddingId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchInventory = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const params = new URLSearchParams();
      if (filtro !== "todos") params.set("filtro", filtro);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      if (orden) params.set("orden", orden);
      if (direccion) params.set("direccion", direccion);

      const res = await fetch(`/api/pos/inventario?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.productos || []);
        if (data.conteo) {
          setCounts(data.conteo);
        }

        // Si no hay producto seleccionado, pre-seleccionar el Sérum Niacinamida (prod 2) o el primero
        setSelectedProductId((prev) => {
          if (prev !== null) return prev;
          const prods: ItemInventarioPos[] = data.productos || [];
          const serum = prods.find((p) => p.id === 2);
          if (serum) return serum.id;
          return prods.length > 0 ? prods[0].id : null;
        });
      }
    } catch (e) {
      console.warn("Error al cargar inventario:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filtro, searchQuery, orden, direccion]);

  // Cargar inventario inicial y cuando cambian filtros
  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Polling automático cada 20 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      fetchInventory(true);
    }, 20000);
    return () => clearInterval(interval);
  }, [fetchInventory]);

  const handleSort = (columna: string) => {
    if (orden === columna) {
      setDireccion((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setOrden(columna);
      setDireccion("asc");
    }
  };

  const handleQuickAdd = async (item: ItemInventarioPos) => {
    if (item.disponiblesTienda <= 0) return;
    setAddingId(item.id);

    try {
      const draftRes = await fetch("/api/pos/ventas/actual");
      if (!draftRes.ok) throw new Error("No se pudo obtener el ticket");
      const draftData = await draftRes.json();
      const ticketId = draftData.ticket?.id;

      if (!ticketId) throw new Error("Ticket no disponible");

      const addRes = await fetch(`/api/pos/ventas/${ticketId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          producto_id: item.id,
          cantidad: 1,
        }),
      });

      if (!addRes.ok) throw new Error("No se pudo agregar el artículo");

      setToastMessage(`Se agregó 1 pza de "${item.nombre}" a la venta.`);
      setTimeout(() => setToastMessage(null), 4000);
      fetchInventory(true);
    } catch (e: any) {
      setToastMessage(e.message || "Error al agregar a la venta");
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setAddingId(null);
    }
  };

  const sucursalSimple = session.sucursalNombre || "Centro";

  return (
    <div className="flex-1 flex overflow-hidden relative">
      {/* Zona principal con encabezado, filtros y tabla */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0 border border-amber-200/60 shadow-2xs">
              <Boxes className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-medium text-stone-900 leading-tight">
                Inventario omnicanal
              </h1>
              <p className="text-xs text-stone-500 font-light mt-0.5">
                Tienda {sucursalSimple} · Existencias físicas, apartadas y lotes FEFO
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchInventory(false)}
              disabled={refreshing}
              title="Actualizar existencias"
              className="p-2.5 rounded-2xl bg-white hover:bg-stone-50 border border-stone-200/90 text-stone-600 shadow-2xs transition-colors cursor-pointer active:scale-95 flex items-center gap-1.5 text-xs font-medium"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#5B122C]" : ""}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
          </div>
        </div>

        {/* Barra de Búsqueda y Filtros */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4 shrink-0">
          <InventorySearch
            value={searchQuery}
            onChange={(val) => setSearchQuery(val)}
            onClear={() => setSearchQuery("")}
          />

          <InventoryFilterTabs
            activeFilter={filtro}
            onChange={(f) => setFiltro(f)}
            counts={counts}
          />
        </div>

        {/* Notificación flotante de Toast */}
        {toastMessage && (
          <div className="mb-3 px-4 py-2.5 rounded-2xl bg-[#181412] text-white text-xs flex items-center justify-between shadow-lg animate-in fade-in duration-200 shrink-0">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{toastMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => router.push("/pos/venta")}
              className="ml-4 font-semibold text-amber-200 hover:text-amber-100 flex items-center gap-1 cursor-pointer"
            >
              <span>Ir a cobrar</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Tabla de Inventario */}
        <InventoryTable
          items={items}
          loading={loading}
          selectedId={selectedProductId}
          onSelectItem={(item) => setSelectedProductId(item.id)}
          onQuickAdd={handleQuickAdd}
          addingId={addingId}
          orden={orden}
          direccion={direccion}
          onSort={handleSort}
          sucursalNombre={sucursalSimple}
        />
      </div>

      {/* Panel lateral derecho: Disponibilidad en tiendas */}
      <StoreAvailabilityPanel
        productoId={selectedProductId}
        onClose={() => setSelectedProductId(null)}
        onItemAdded={() => fetchInventory(true)}
      />
    </div>
  );
}

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Package, RefreshCw, ShoppingBag } from "lucide-react";
import AccountLayout from "@/components/account/AccountLayout";
import OrderStatusTabs, { OrderStatusTabId } from "./OrderStatusTabs";
import ChannelMenu, { OrderChannelId } from "./ChannelMenu";
import OrderListItem, { OrderItemData } from "./OrderListItem";
import LoadMoreButton from "@/components/catalog/LoadMoreButton";
import { GRUPOS_ESTADO } from "@/lib/pedidos-utils";

interface OrdersPageProps {
  initialPedidos: OrderItemData[];
  initialHayMas: boolean;
  initialCounts: Record<string, number>;
  initialEstado: OrderStatusTabId;
  initialCanal: OrderChannelId;
  user: {
    nombre: string;
    correo: string;
  };
}

export default function OrdersPage({
  initialPedidos,
  initialHayMas,
  initialCounts,
  initialEstado,
  initialCanal,
  user,
}: OrdersPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Estados locales de filtrado y lista
  const [estado, setEstado] = useState<OrderStatusTabId>(initialEstado);
  const [canal, setCanal] = useState<OrderChannelId>(initialCanal);
  const [pedidos, setPedidos] = useState<OrderItemData[]>(initialPedidos);
  const [hayMas, setHayMas] = useState<boolean>(initialHayMas);
  const [counts, setCounts] = useState<Record<string, number>>(initialCounts);
  const [pagina, setPagina] = useState<number>(1);

  // Estados de carga y feedback
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [isFiltering, setIsFiltering] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string>("");

  // Referencia para mover el foco al primer ítem nuevo al cargar más
  const firstNewItemIndexRef = useRef<number | null>(null);
  const orderRefs = useRef<(HTMLElement | null)[]>([]);

  // Sincronización con la URL cuando cambia el navegador (botón Atrás/Adelante o link compartido)
  useEffect(() => {
    const urlEstado = searchParams.get("estado") as OrderStatusTabId;
    const urlCanal = searchParams.get("canal") as OrderChannelId;
    const validEstado = urlEstado && Object.keys(GRUPOS_ESTADO).includes(urlEstado) ? urlEstado : "todos";
    const validCanal = urlCanal && ["todos", "web", "app", "whatsapp", "tienda"].includes(urlCanal) ? urlCanal : "todos";

    if (validEstado !== estado || validCanal !== canal) {
      setEstado(validEstado);
      setCanal(validCanal);
      setPagina(1);
      cargarPedidos(validEstado, validCanal, 1, false);
    }
  }, [searchParams]);

  // Enfocar el primer nuevo pedido cargado tras paginar
  useEffect(() => {
    if (firstNewItemIndexRef.current !== null) {
      const idx = firstNewItemIndexRef.current;
      orderRefs.current[idx]?.focus();
      firstNewItemIndexRef.current = null;
    }
  }, [pedidos]);

  // Función principal para consultar la API de pedidos
  const cargarPedidos = useCallback(
    async (
      nuevoEstado: OrderStatusTabId,
      nuevoCanal: OrderChannelId,
      nuevaPagina: number,
      esPaginacion: boolean
    ) => {
      if (esPaginacion) {
        setIsLoadingMore(true);
      } else {
        setIsFiltering(true);
      }
      setError(null);

      try {
        const query = new URLSearchParams({
          estado: nuevoEstado,
          canal: nuevoCanal,
          pagina: String(nuevaPagina),
        });

        const res = await fetch(`/api/cuenta/pedidos?${query.toString()}`);
        if (!res.ok) {
          throw new Error("Error al consultar los pedidos");
        }

        const data = await res.json();

        if (esPaginacion) {
          firstNewItemIndexRef.current = pedidos.length;
          setPedidos((prev) => [...prev, ...data.pedidos]);
          setAnnouncement(
            `Cargados ${data.pedidos.length} pedidos adicionales. Total mostrado: ${
              pedidos.length + data.pedidos.length
            }.`
          );
        } else {
          setPedidos(data.pedidos);
          setAnnouncement(
            `Se encontraron ${data.pedidos.length} pedidos con los filtros aplicados.`
          );
        }

        setHayMas(Boolean(data.hayMas));
        setCounts(data.conteosPorCanal || {});
        setPagina(nuevaPagina);
      } catch (err: any) {
        console.error("[ERROR CARGAR PEDIDOS]:", err);
        setError("Ocurrió un problema al cargar los pedidos. Por favor intenta de nuevo.");
      } finally {
        setIsLoadingMore(false);
        setIsFiltering(false);
      }
    },
    [pedidos.length]
  );

  // Manejador de cambio de pestaña (Estado)
  const handleTabChange = (newTab: OrderStatusTabId) => {
    if (newTab === estado) return;
    setEstado(newTab);
    setPagina(1);

    // Actualizar URL sin recargar ni alterar el scroll
    const params = new URLSearchParams();
    if (newTab !== "todos") params.set("estado", newTab);
    if (canal !== "todos") params.set("canal", canal);
    params.set("pagina", "1");

    const newUrl = `/cuenta/pedidos${params.toString() ? `?${params.toString()}` : ""}`;
    router.replace(newUrl, { scroll: false });

    cargarPedidos(newTab, canal, 1, false);
  };

  // Manejador de cambio de Canal
  const handleChannelChange = (newChannel: OrderChannelId) => {
    if (newChannel === canal) return;
    setCanal(newChannel);
    setPagina(1);

    // Actualizar URL sin recargar ni alterar el scroll
    const params = new URLSearchParams();
    if (estado !== "todos") params.set("estado", estado);
    if (newChannel !== "todos") params.set("canal", newChannel);
    params.set("pagina", "1");

    const newUrl = `/cuenta/pedidos${params.toString() ? `?${params.toString()}` : ""}`;
    router.replace(newUrl, { scroll: false });

    cargarPedidos(estado, newChannel, 1, false);
  };

  // Manejador para cargar más pedidos (paginación infinita / botón)
  const handleLoadMore = () => {
    if (isLoadingMore || !hayMas) return;
    const siguientePagina = pagina + 1;

    const params = new URLSearchParams();
    if (estado !== "todos") params.set("estado", estado);
    if (canal !== "todos") params.set("canal", canal);
    params.set("pagina", String(siguientePagina));

    const newUrl = `/cuenta/pedidos?${params.toString()}`;
    router.replace(newUrl, { scroll: false });

    cargarPedidos(estado, canal, siguientePagina, true);
  };

  // Restablecer todos los filtros
  const handleResetFilters = () => {
    setEstado("todos");
    setCanal("todos");
    setPagina(1);
    router.replace("/cuenta/pedidos", { scroll: false });
    cargarPedidos("todos", "todos", 1, false);
  };

  // Texto para estado vacío con filtros
  const getFiltroVacioTexto = () => {
    const estadoLabels: Record<string, string> = {
      en_curso: "en curso",
      entregados: "entregados",
      cancelados: "cancelados",
    };
    const canalLabels: Record<string, string> = {
      web: "por web",
      app: "por app",
      whatsapp: "por WhatsApp",
      tienda: "en tienda física",
    };

    const parteEstado = estadoLabels[estado] || "";
    const parteCanal = canalLabels[canal] || "";

    if (parteEstado && parteCanal) {
      return `No tienes pedidos ${parteEstado} ${parteCanal}.`;
    }
    if (parteEstado) {
      return `No tienes pedidos ${parteEstado}.`;
    }
    if (parteCanal) {
      return `No tienes pedidos ${parteCanal}.`;
    }
    return "No se encontraron pedidos con estos filtros.";
  };

  const totalHistorico = counts.todos || 0;
  const esUsuarioSinPedidos = totalHistorico === 0 && estado === "todos" && canal === "todos" && !isFiltering;

  return (
    <AccountLayout usuario={user}>
      {/* Región viva para accesibilidad (lectores de pantalla) */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      <div className="space-y-6">
        {/* Encabezado de la página */}
        <div>
          <h1 className="font-serif text-3xl md:text-4xl font-normal text-slate-900 tracking-tight">
            Mis pedidos
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Todos tus pedidos, sin importar dónde compraste: web, app, WhatsApp o tienda.
          </p>
        </div>

        {/* Fila de Filtros: Pestañas a la izquierda, Selector de Canal a la derecha */}
        {!esUsuarioSinPedidos && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <OrderStatusTabs
              activeTab={estado}
              onChange={handleTabChange}
            />

            <div className="flex justify-end">
              <ChannelMenu
                selectedChannel={canal}
                counts={counts}
                onChange={handleChannelChange}
              />
            </div>
          </div>
        )}

        {/* Panel de Contenido de Pedidos */}
        <section
          role="tabpanel"
          id="panel-pedidos"
          aria-labelledby={`tab-${estado}`}
          className="space-y-3 focus:outline-hidden"
        >
          {/* 1. Estado de carga / Skeleton mientras se filtra */}
          {isFiltering && (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 animate-pulse flex items-center justify-between h-20"
                >
                  <div className="space-y-2 w-1/4">
                    <div className="h-4 bg-slate-200 rounded-sm w-3/4" />
                    <div className="h-3 bg-slate-100 rounded-sm w-1/2" />
                  </div>
                  <div className="h-6 bg-slate-100 rounded-full w-16" />
                  <div className="space-y-2 w-1/3 hidden md:block">
                    <div className="h-3 bg-slate-200 rounded-sm w-full" />
                    <div className="h-3 bg-slate-100 rounded-sm w-2/3" />
                  </div>
                  <div className="h-8 bg-slate-200 rounded-full w-24" />
                </div>
              ))}
            </div>
          )}

          {/* 2. Error de Red con opción de Reintentar */}
          {!isFiltering && error && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center">
              <p className="text-sm text-rose-800 font-medium mb-3">{error}</p>
              <button
                type="button"
                onClick={() => cargarPedidos(estado, canal, pagina, false)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-[#6B1F4A] text-white hover:bg-[#58183D] active:scale-[0.98] transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reintentar</span>
              </button>
            </div>
          )}

          {/* 3. Estado Vacío: Usuario sin ningún pedido en su historial */}
          {!isFiltering && !error && esUsuarioSinPedidos && (
            <div className="bg-white rounded-2xl p-10 border border-slate-200/80 text-center shadow-2xs">
              <div className="w-14 h-14 bg-[#FAF3F6] rounded-full flex items-center justify-center mx-auto mb-4 text-[#6B1F4A]">
                <Package className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">
                Todavía no tienes pedidos
              </h2>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6">
                Descubre tus rutinas y productos esenciales de skincare diseñados para tu tipo de piel.
              </p>
              <Link
                href="/catalogo"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-semibold bg-[#1A1A1A] text-white hover:bg-black active:scale-[0.98] transition-all shadow-xs"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Ver catálogo</span>
              </Link>
            </div>
          )}

          {/* 4. Estado Vacío: Filtros aplicados sin resultados */}
          {!isFiltering && !error && !esUsuarioSinPedidos && pedidos.length === 0 && (
            <div className="bg-white rounded-2xl p-10 border border-slate-200/80 text-center shadow-2xs">
              <p className="text-sm font-medium text-slate-800 mb-1">
                {getFiltroVacioTexto()}
              </p>
              <p className="text-xs text-slate-500 mb-5">
                Prueba cambiando los filtros de estado o canal para ver tus compras.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center px-5 py-2 rounded-full text-xs font-semibold border border-slate-300 text-slate-800 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer"
              >
                Ver todos
              </button>
            </div>
          )}

          {/* 5. Lista de Tarjetas de Pedidos */}
          {!isFiltering && !error && pedidos.length > 0 && (
            <div className="space-y-3">
              {pedidos.map((order, index) => (
                <OrderListItem
                  key={order.id || order.folio}
                  order={order}
                  ref={(el) => {
                    orderRefs.current[index] = el;
                  }}
                />
              ))}

              {/* Botón de paginación 'Ver más pedidos' */}
              {hayMas && (
                <LoadMoreButton
                  isLoading={isLoadingMore}
                  onClick={handleLoadMore}
                  label="Ver más pedidos"
                  loadingLabel="Cargando más pedidos..."
                />
              )}
            </div>
          )}
        </section>
      </div>
    </AccountLayout>
  );
}

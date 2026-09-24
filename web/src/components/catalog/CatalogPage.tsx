"use client";

import React, { useState, useEffect, useRef, useTransition, useCallback } from "react";
import { Search, Loader2, Sparkles, AlertCircle } from "lucide-react";
import StoreLayout from "@/components/layout/StoreLayout";
import Breadcrumbs from "./Breadcrumbs";
import FiltersPanel, { FacetCounts } from "./FiltersPanel";
import ActiveFilterChips, { ChipItem } from "./ActiveFilterChips";
import SortMenu from "./SortMenu";
import ProductGrid, { CatalogProduct } from "./ProductGrid";
import LoadMoreButton from "./LoadMoreButton";
import EmptyState from "./EmptyState";
import { useCatalogFilters } from "@/hooks/useCatalogFilters";
import { TIPOS_PIEL, PRESUPUESTOS } from "@/lib/perfilPiel";

export interface CatalogPageProps {
  categorySlug?: string;
  initialSearchParams?: { [key: string]: string | string[] | undefined };
}

const CATEGORIA_LABELS: Record<string, string> = {
  limpieza: "Limpieza",
  tonico: "Tónicos",
  serum: "Sérums",
  hidratacion: "Hidratantes",
  "proteccion-solar": "Protección solar",
  contorno: "Contorno",
  mascarilla: "Mascarilla",
  bruma: "Bruma",
};

export default function CatalogPage({ categorySlug }: CatalogPageProps) {
  const {
    filters,
    lastFilterApplied,
    toggleFilter,
    setSearch,
    setOrden,
    setPagina,
    removeFilter,
    clearAllFilters,
  } = useCatalogFilters(categorySlug);

  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [hayMas, setHayMas] = useState<boolean>(false);
  const [counts, setCounts] = useState<FacetCounts | undefined>(undefined);
  const [sucursal, setSucursal] = useState<{ id: number; nombre: string }>({ id: 1, nombre: "Centro" });
  const [userSkinType, setUserSkinType] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [firstNewItemIndex, setFirstNewItemIndex] = useState<number | null>(null);

  // Input de búsqueda local con debounce
  const [localSearch, setLocalSearch] = useState<string>(filters.q);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sincronizar input local si filters.q cambia externamente
  useEffect(() => {
    setLocalSearch(filters.q);
  }, [filters.q]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalSearch(val);

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      setSearch(val.trim());
    }, 300);
  };

  // Cargar productos desde la API
  const loadProducts = useCallback(
    async (isAppending: boolean = false) => {
      try {
        if (isAppending) {
          setIsLoadingMore(true);
        } else {
          setIsLoading(true);
          setFirstNewItemIndex(null);
        }
        setFetchError(null);

        const params = new URLSearchParams();
        if (filters.q) params.set("q", filters.q);
        if (filters.categoria.length > 0) params.set("categoria", filters.categoria.join(","));
        if (filters.tipo_piel.length > 0) params.set("tipo_piel", filters.tipo_piel.join(","));
        if (filters.precio.length > 0) params.set("precio", filters.precio.join(","));
        if (filters.disponibilidad.length > 0) params.set("disponibilidad", filters.disponibilidad.join(","));
        if (filters.orden) params.set("orden", filters.orden);
        params.set("limite", "12");

        if (isAppending) {
          // Si estamos anexando la siguiente página
          params.set("pagina", filters.pagina.toString());
        } else {
          // Si es carga inicial o cambio de filtros: si pagina > 1, acumular hasta esa página
          if (filters.pagina > 1) {
            params.set("pagina", filters.pagina.toString());
            params.set("acumular", "true");
          } else {
            params.set("pagina", "1");
          }
        }

        const res = await fetch(`/api/productos?${params.toString()}`);
        if (!res.ok) {
          throw new Error("No se pudo cargar el catálogo de productos.");
        }

        const data = await res.json();

        if (isAppending) {
          setFirstNewItemIndex(products.length);
          setProducts((prev) => [...prev, ...(data.productos || [])]);
        } else {
          setProducts(data.productos || []);
        }

        setTotal(data.total || 0);
        setHayMas(Boolean(data.hayMas));
        setCounts(data.conteos);
        if (data.sucursal) setSucursal(data.sucursal);
        if (data.userSkinType) setUserSkinType(data.userSkinType);
      } catch (err: any) {
        console.error("Error al cargar productos:", err);
        setFetchError(err.message || "Error al conectar con el servidor.");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [filters, products.length]
  );

  // Reaccionar a cambios en filtros (excepto si solo cambió la página por botón "Ver más")
  const prevFiltersRef = useRef<string>("");
  useEffect(() => {
    const currentKey = `${filters.q}|${filters.categoria.join(",")}|${filters.tipo_piel.join(",")}|${filters.precio.join(",")}|${filters.disponibilidad.join(",")}|${filters.orden}`;

    if (prevFiltersRef.current !== currentKey) {
      prevFiltersRef.current = currentKey;
      loadProducts(false);
    }
  }, [filters, loadProducts]);

  // Manejar botón "Ver más productos"
  const handleLoadMore = () => {
    const nextPage = filters.pagina + 1;
    setPagina(nextPage);

    // Cargar siguiente bloque y anexar
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.categoria.length > 0) params.set("categoria", filters.categoria.join(","));
    if (filters.tipo_piel.length > 0) params.set("tipo_piel", filters.tipo_piel.join(","));
    if (filters.precio.length > 0) params.set("precio", filters.precio.join(","));
    if (filters.disponibilidad.length > 0) params.set("disponibilidad", filters.disponibilidad.join(","));
    if (filters.orden) params.set("orden", filters.orden);
    params.set("pagina", nextPage.toString());
    params.set("limite", "12");

    setIsLoadingMore(true);
    fetch(`/api/productos?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setFirstNewItemIndex(products.length);
        setProducts((prev) => [...prev, ...(data.productos || [])]);
        setHayMas(Boolean(data.hayMas));
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoadingMore(false));
  };

  // Construir chips activos
  const activeChips: ChipItem[] = [];

  if (filters.q) {
    activeChips.push({
      id: `q-${filters.q}`,
      group: "q",
      label: `«${filters.q}»`,
      value: filters.q,
    });
  }

  for (const cat of filters.categoria) {
    activeChips.push({
      id: `cat-${cat}`,
      group: "categoria",
      label: CATEGORIA_LABELS[cat] || cat,
      value: cat,
    });
  }

  for (const tp of filters.tipo_piel) {
    const found = TIPOS_PIEL.find((t) => t.id === tp);
    activeChips.push({
      id: `piel-${tp}`,
      group: "tipo_piel",
      label: found ? `Piel ${found.label}` : tp,
      value: tp,
    });
  }

  for (const pr of filters.precio) {
    const found = PRESUPUESTOS.find((p) => p.id === pr);
    activeChips.push({
      id: `precio-${pr}`,
      group: "precio",
      label: found ? found.label : pr,
      value: pr,
    });
  }

  for (const d of filters.disponibilidad) {
    activeChips.push({
      id: `disp-${d}`,
      group: "disponibilidad",
      label: d === "recoger" ? "Recoger hoy" : "Para envío",
      value: d,
    });
  }

  const hasActiveFilters = activeChips.length > 0;

  // Determinar título de la página
  const pageTitle = categorySlug
    ? CATEGORIA_LABELS[categorySlug.toLowerCase()] ||
      categorySlug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    : "Todos los productos";

  return (
    <StoreLayout>
      <div className="min-h-screen bg-[#FBF8F5] py-8 sm:py-10 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* 1. Migas de pan */}
          <Breadcrumbs categoryName={categorySlug ? pageTitle : undefined} />

          {/* 2. Encabezado principal */}
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-8 gap-2">
            <h1 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-slate-900">
              {pageTitle}
            </h1>

            {/* Contador de resultados accesible */}
            <div
              aria-live="polite"
              className="text-xs text-slate-500 font-light"
            >
              <span className="font-medium text-slate-700">{total}</span>{" "}
              {total === 1 ? "resultado" : "resultados"}
              {filters.q && (
                <span>
                  {" "}para <strong className="font-medium text-slate-800">«{filters.q}»</strong>
                </span>
              )}
            </div>
          </div>

          {/* 3. Distribución: Columna izquierda (Filtros) + Columna derecha (Catálogo) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Columna Izquierda: Panel de Filtros */}
            <div className="lg:col-span-3">
              <FiltersPanel
                selectedCategorias={filters.categoria}
                selectedTiposPiel={filters.tipo_piel}
                selectedPrecios={filters.precio}
                selectedDisponibilidad={filters.disponibilidad}
                counts={counts}
                sucursalNombre={sucursal.nombre}
                onToggleFilter={(grp, val, lbl) => toggleFilter(grp, val, lbl)}
                onClearAll={clearAllFilters}
                hasActiveFilters={hasActiveFilters}
              />
            </div>

            {/* Columna Derecha: Búsqueda, Orden, Chips y Grid */}
            <div className="lg:col-span-9 flex flex-col">
              
              {/* Barra Superior: Input de Búsqueda a todo lo ancho + Menú Ordenar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
                {/* Campo de búsqueda */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={localSearch}
                    onChange={handleSearchChange}
                    placeholder="Buscar productos..."
                    aria-label="Buscar productos dentro del catálogo"
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-light text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#6B1F4A] focus:border-[#6B1F4A] shadow-2xs transition"
                  />
                </div>

                {/* Menú de orden */}
                <SortMenu
                  currentSort={filters.orden}
                  onSelectSort={(newOrden) => setOrden(newOrden)}
                />
              </div>

              {/* Recomendación personalizada discreta por perfil de piel */}
              {userSkinType && !filters.tipo_piel.includes(userSkinType) && (
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => toggleFilter("tipo_piel", userSkinType, `Piel ${userSkinType}`)}
                    className="inline-flex items-center gap-1.5 text-xs text-[#6B1F4A] hover:text-[#531839] transition-colors font-medium cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Ver solo productos para piel {userSkinType}</span>
                  </button>
                </div>
              )}

              {/* Chips de filtros activos */}
              <ActiveFilterChips
                chips={activeChips}
                onRemoveChip={(grp, val) => removeFilter(grp, val)}
                onClearAll={clearAllFilters}
              />

              {/* Manejo de Error de Red */}
              {fetchError ? (
                <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center my-6">
                  <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-3" />
                  <p className="text-xs text-rose-800 font-medium mb-4">{fetchError}</p>
                  <button
                    type="button"
                    onClick={() => loadProducts(false)}
                    className="px-6 py-2 rounded-full text-xs font-medium bg-[#6B1F4A] text-white hover:bg-[#531839] transition"
                  >
                    Reintentar
                  </button>
                </div>
              ) : !isLoading && products.length === 0 ? (
                /* Estado Sin Resultados */
                <EmptyState
                  lastFilter={lastFilterApplied}
                  onRemoveLastFilter={
                    lastFilterApplied
                      ? () => removeFilter(lastFilterApplied.group, lastFilterApplied.value)
                      : undefined
                  }
                  onClearAll={clearAllFilters}
                />
              ) : (
                /* Cuadrícula de 3 columnas de productos */
                <>
                  <ProductGrid
                    products={products}
                    isLoading={isLoading}
                    firstNewItemIndex={firstNewItemIndex}
                  />

                  {/* Botón Píldora: Ver más productos */}
                  {hayMas && (
                    <LoadMoreButton
                      isLoading={isLoadingMore}
                      onClick={handleLoadMore}
                    />
                  )}
                </>
              )}

            </div>

          </div>

        </div>
      </div>
    </StoreLayout>
  );
}

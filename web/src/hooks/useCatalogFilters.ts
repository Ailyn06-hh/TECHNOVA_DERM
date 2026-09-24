"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

export interface FilterState {
  q: string;
  categoria: string[];
  tipo_piel: string[];
  precio: string[];
  disponibilidad: string[];
  orden: string;
  pagina: number;
}

export interface LastFilterAction {
  group: "categoria" | "tipo_piel" | "precio" | "disponibilidad" | "q";
  value: string;
  label?: string;
}

export function useCatalogFilters(initialCategory?: string) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [lastFilterApplied, setLastFilterApplied] = useState<LastFilterAction | null>(null);

  // Parsear estado desde searchParams actuales
  const filters: FilterState = useMemo(() => {
    const q = searchParams.get("q") || "";

    const categoriaParam = searchParams.get("categoria");
    let categoria: string[] = [];
    if (categoriaParam) {
      categoria = categoriaParam.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    } else if (initialCategory) {
      // Si la URL es /categoria/[slug] y no hay override en query
      categoria = [initialCategory.toLowerCase()];
    }

    const tipoPielParam = searchParams.get("tipo_piel");
    const tipo_piel = tipoPielParam
      ? tipoPielParam.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
      : [];

    const precioParam = searchParams.get("precio");
    const precio = precioParam
      ? precioParam.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
      : [];

    // Disponibilidad por defecto: ["recoger", "envio"] seleccionados por defecto
    const dispParam = searchParams.get("disponibilidad");
    let disponibilidad: string[];
    if (dispParam === null) {
      disponibilidad = ["recoger", "envio"];
    } else if (dispParam === "" || dispParam === "ninguno") {
      disponibilidad = [];
    } else {
      disponibilidad = dispParam.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    }

    const orden = searchParams.get("orden") || "mas_vendidos";
    const pagina = Math.max(1, parseInt(searchParams.get("pagina") || "1", 10));

    return {
      q,
      categoria,
      tipo_piel,
      precio,
      disponibilidad,
      orden,
      pagina,
    };
  }, [searchParams, initialCategory]);

  // Serializar filtros a Query String y aplicar router.replace sin scroll
  const applyFilters = useCallback(
    (newFilters: FilterState, targetPathname?: string) => {
      const params = new URLSearchParams();

      if (newFilters.q.trim()) {
        params.set("q", newFilters.q.trim());
      }

      if (newFilters.categoria.length > 0) {
        params.set("categoria", newFilters.categoria.join(","));
      }

      if (newFilters.tipo_piel.length > 0) {
        params.set("tipo_piel", newFilters.tipo_piel.join(","));
      }

      if (newFilters.precio.length > 0) {
        params.set("precio", newFilters.precio.join(","));
      }

      // Disponibilidad: Si ambas están seleccionadas (estado default), no inflar el querystring
      if (newFilters.disponibilidad.length > 0) {
        const isDefault =
          newFilters.disponibilidad.length === 2 &&
          newFilters.disponibilidad.includes("recoger") &&
          newFilters.disponibilidad.includes("envio");

        if (!isDefault) {
          params.set("disponibilidad", newFilters.disponibilidad.join(","));
        }
      } else {
        params.set("disponibilidad", "ninguno");
      }

      if (newFilters.orden && newFilters.orden !== "mas_vendidos") {
        params.set("orden", newFilters.orden);
      }

      if (newFilters.pagina > 1) {
        params.set("pagina", newFilters.pagina.toString());
      }

      const queryString = params.toString();
      const basePath = targetPathname || (pathname.startsWith("/categoria") ? "/catalogo" : pathname);
      const newUrl = queryString ? `${basePath}?${queryString}` : basePath;

      router.replace(newUrl, { scroll: false });
    },
    [router, pathname]
  );

  // Toggle de una opción dentro de un grupo (categoría, tipo_piel, precio, disponibilidad)
  const toggleFilter = useCallback(
    (group: "categoria" | "tipo_piel" | "precio" | "disponibilidad", value: string, label?: string) => {
      const currentList = filters[group];
      const isSelected = currentList.includes(value);

      let nextList: string[];
      if (isSelected) {
        nextList = currentList.filter((item) => item !== value);
      } else {
        nextList = [...currentList, value];
        setLastFilterApplied({ group, value, label });
      }

      const nextFilters: FilterState = {
        ...filters,
        [group]: nextList,
        pagina: 1, // Reiniciar paginación al cambiar filtros
      };

      applyFilters(nextFilters);
    },
    [filters, applyFilters]
  );

  // Cambiar búsqueda
  const setSearch = useCallback(
    (newQ: string) => {
      const nextFilters: FilterState = {
        ...filters,
        q: newQ,
        pagina: 1,
      };
      if (newQ) {
        setLastFilterApplied({ group: "q", value: newQ, label: `«${newQ}»` });
      }
      applyFilters(nextFilters);
    },
    [filters, applyFilters]
  );

  // Cambiar orden
  const setOrden = useCallback(
    (newOrden: string) => {
      const nextFilters: FilterState = {
        ...filters,
        orden: newOrden,
        pagina: 1,
      };
      applyFilters(nextFilters);
    },
    [filters, applyFilters]
  );

  // Cargar más productos (incrementar página)
  const setPagina = useCallback(
    (newPage: number) => {
      const nextFilters: FilterState = {
        ...filters,
        pagina: newPage,
      };
      applyFilters(nextFilters);
    },
    [filters, applyFilters]
  );

  // Eliminar un filtro específico (desde los chips activos o EmptyState)
  const removeFilter = useCallback(
    (group: "categoria" | "tipo_piel" | "precio" | "disponibilidad" | "q", value: string) => {
      if (group === "q") {
        setSearch("");
        return;
      }

      const nextList = filters[group].filter((item) => item !== value);
      const nextFilters: FilterState = {
        ...filters,
        [group]: nextList,
        pagina: 1,
      };
      applyFilters(nextFilters);
    },
    [filters, setSearch, applyFilters]
  );

  // Limpiar todos los filtros
  const clearAllFilters = useCallback(() => {
    setLastFilterApplied(null);
    router.replace("/catalogo", { scroll: false });
  }, [router]);

  return {
    filters,
    lastFilterApplied,
    toggleFilter,
    setSearch,
    setOrden,
    setPagina,
    removeFilter,
    clearAllFilters,
  };
}

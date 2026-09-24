"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { formatearPrecio } from "@/lib/formato";

interface SearchProduct {
  id: number;
  nombre: string;
  slug: string;
  precio: number;
  precio_especial: number | null;
  color_fondo: string;
  color_frasco: string;
  categoria_nombre: string;
}

export default function SearchBox() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounce 300ms para consultar GET /api/productos/buscar?q=
  const fetchSuggestions = useCallback(async (searchTerm: string) => {
    if (searchTerm.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      setIsOpen(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`/api/productos/buscar?q=${encodeURIComponent(searchTerm.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.productos || []);
        setIsOpen((data.productos || []).length > 0);
      }
    } catch (err) {
      console.error("Error en búsqueda:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSelectedIndex(-1);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (val.trim().length >= 2) {
      setIsLoading(true);
      debounceTimerRef.current = setTimeout(() => {
        fetchSuggestions(val);
      }, 300);
    } else {
      setResults([]);
      setIsOpen(false);
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen && results.length > 0) {
        setIsOpen(true);
        setSelectedIndex(0);
        return;
      }
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        const selected = results[selectedIndex];
        setIsOpen(false);
        router.push(`/producto/${selected.slug}`);
      } else if (query.trim().length > 0) {
        setIsOpen(false);
        router.push(`/buscar?q=${encodeURIComponent(query.trim())}`);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const handleSelectProduct = (slug: string) => {
    setIsOpen(false);
    router.push(`/producto/${slug}`);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-[280px] lg:max-w-[320px]">
      <div className="relative flex items-center">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder="Buscar productos"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="search-suggestions-list"
          className="w-full h-9 pl-9 pr-8 text-xs rounded-full bg-[#F5F2EC] border border-transparent focus:border-[#6B1F4A] focus:bg-white text-[#1A1715] placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#6B1F4A] transition"
        />
        <Search className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
        {isLoading && (
          <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin absolute right-3" />
        )}
      </div>

      {/* Menú de sugerencias desplegable */}
      {isOpen && results.length > 0 && (
        <ul
          id="search-suggestions-list"
          role="listbox"
          className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 divide-y divide-gray-50 animate-fade-in"
        >
          {results.map((prod, index) => {
            const isSelected = selectedIndex === index;
            const precioEfectivo = prod.precio_especial ?? prod.precio;

            return (
              <li
                key={prod.id}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelectProduct(prod.slug)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`flex items-center gap-3 p-3 cursor-pointer transition ${
                  isSelected ? "bg-[#FAF7F5]" : "hover:bg-[#FAF7F5]"
                }`}
              >
                {/* Miniatura con color de fondo y silueta */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: prod.color_fondo }}
                >
                  <div
                    className="w-3 h-5 rounded-xs"
                    style={{ backgroundColor: prod.color_frasco }}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#1A1715] truncate">
                    {prod.nombre}
                  </p>
                  <p className="text-[10px] text-gray-400 font-light truncate">
                    {prod.categoria_nombre}
                  </p>
                </div>

                {/* Precio */}
                <div className="text-right shrink-0">
                  <span className="text-xs font-semibold text-[#1A1715]">
                    {formatearPrecio(Number(precioEfectivo))}
                  </span>
                  {prod.precio_especial && (
                    <span className="block text-[10px] text-gray-400 line-through">
                      {formatearPrecio(Number(prod.precio))}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

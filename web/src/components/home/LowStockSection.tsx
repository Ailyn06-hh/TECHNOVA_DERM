"use client";

import React, { useState, useEffect } from "react";
import { Flame, Clock, Sparkles } from "lucide-react";
import ProductCard from "./ProductCard";

interface LowStockProduct {
  id: number;
  sku: string;
  nombre: string;
  slug: string;
  categoria_nombre: string;
  precio: number;
  precio_especial: number | null;
  color_fondo: string;
  color_frasco: string;
  imagen_url?: string | null;
  total_stock: number;
  etiqueta_stock: string;
}

export default function LowStockSection() {
  const [productos, setProductos] = useState<LowStockProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function fetchLowStock() {
    try {
      const res = await fetch("/api/productos/ultimas-piezas");
      if (res.ok) {
        const data = await res.json();
        setProductos(data.productos || []);
      }
    } catch (err) {
      console.error("Error al cargar productos con poco stock:", err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // Carga inicial
    fetchLowStock();

    // Auto-refresco cada 30 segundos según requerimientos
    const interval = setInterval(() => {
      fetchLowStock();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Si no hay productos con stock bajo y ya terminó la carga, ocultamos la sección
  if (!isLoading && productos.length === 0) {
    return null;
  }

  return (
    <section className="py-12 sm:py-16 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Encabezado de la sección */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-medium border border-amber-200/60 mb-2.5">
              <Flame className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
              <span>Alta demanda</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-medium text-slate-900 tracking-tight">
              Últimas piezas
            </h2>
            <p className="text-sm text-slate-500 font-light mt-1">
              Fórmulas con pocas unidades en inventario general. ¡Asegura las tuyas antes de que se agoten!
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-light shrink-0">
            <Clock className="w-3.5 h-3.5" />
            <span>Actualizado en tiempo real</span>
          </div>
        </div>

        {/* Grid de productos */}
        {isLoading && productos.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse bg-slate-50 rounded-2xl p-4 border border-slate-100 h-80 flex flex-col justify-between">
                <div className="h-44 bg-slate-200/70 rounded-xl" />
                <div className="space-y-2 mt-4">
                  <div className="h-4 bg-slate-200/70 rounded w-3/4" />
                  <div className="h-3 bg-slate-200/70 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {productos.map((prod) => (
              <ProductCard
                key={prod.id}
                id={prod.id}
                nombre={prod.nombre}
                slug={prod.slug}
                categoria_nombre={prod.categoria_nombre}
                precio={prod.precio}
                precio_especial={prod.precio_especial}
                color_fondo={prod.color_fondo}
                color_frasco={prod.color_frasco}
                imagen_url={prod.imagen_url}
                badge={prod.etiqueta_stock}
                total_stock={prod.total_stock}
              />
            ))}
          </div>
        )}

      </div>
    </section>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, HeartHandshake, TrendingUp } from "lucide-react";
import ProductCard from "./ProductCard";

interface RelatedProduct {
  id: number;
  sku: string;
  nombre: string;
  slug: string;
  categoria_nombre: string;
  descripcion: string;
  precio: number;
  precio_especial: number | null;
  color_fondo: string;
  color_frasco: string;
  imagen_url?: string | null;
  total_stock: number;
}

interface ApiResponse {
  tipo: "comprado" | "mas_vendidos";
  titulo: string;
  productoComprado?: string;
  productos: RelatedProduct[];
}

export default function RelatedProductsSection() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRelated() {
      try {
        const res = await fetch("/api/productos/relacionados-o-mas-vendidos");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Error al cargar productos relacionados:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadRelated();
  }, []);

  if (!isLoading && (!data || !data.productos || data.productos.length === 0)) {
    return null;
  }

  const isComprado = data?.tipo === "comprado";

  return (
    <section className="py-12 sm:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Encabezado dinámico */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-[#6B1F4A] text-xs font-medium border border-rose-100 mb-2.5">
            {isComprado ? (
              <>
                <HeartHandshake className="w-3.5 h-3.5 text-[#6B1F4A]" />
                <span>Recomendación complementaria</span>
              </>
            ) : (
              <>
                <TrendingUp className="w-3.5 h-3.5 text-[#6B1F4A]" />
                <span>Favoritos de la comunidad</span>
              </>
            )}
          </div>

          <h2 className="font-serif text-2xl sm:text-3xl font-medium text-slate-900 tracking-tight">
            {data?.titulo || "Más vendidos"}
          </h2>
          
          <p className="text-sm text-slate-500 font-light mt-1">
            {isComprado
              ? `Fórmulas que combinan perfectamente con ${data?.productoComprado} para una rutina completa y sinérgica.`
              : "Las fórmulas dermatológicas más elegidas para el cuidado, hidratación y reparación de la barrera cutánea."}
          </p>
        </div>

        {/* Grid de productos */}
        {isLoading ? (
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
            {data?.productos.map((prod) => (
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
                total_stock={prod.total_stock}
              />
            ))}
          </div>
        )}

      </div>
    </section>
  );
}

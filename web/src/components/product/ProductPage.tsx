"use client";

import React from "react";
import StoreLayout from "@/components/layout/StoreLayout";
import Breadcrumbs from "@/components/catalog/Breadcrumbs";
import ProductGallery, { GalleryImage } from "./ProductGallery";
import ProductInfo, { ProductInfoData } from "./ProductInfo";
import CompleteRoutine from "./CompleteRoutine";
import ReviewsSection from "./ReviewsSection";
import { ReviewItem } from "./ReviewCard";
import { DisponibilidadProducto } from "@/lib/disponibilidad";
import { ProductoRutinaResponse } from "@/lib/recomendaciones";
import { NOMBRE_MARCA } from "@/lib/marca";

interface ProductPageProps {
  producto: ProductInfoData;
  categoriaSlug: string;
  imagenes: GalleryImage[];
  disponibilidad: DisponibilidadProducto;
  rutinaData: ProductoRutinaResponse;
  initialReviews: ReviewItem[];
  totalResenas: number;
  promedioResenas: number;
  puedeEscribirInicial: boolean;
}

export default function ProductPage({
  producto,
  categoriaSlug,
  imagenes,
  disponibilidad,
  rutinaData,
  initialReviews,
  totalResenas,
  promedioResenas,
  puedeEscribirInicial,
}: ProductPageProps) {
  const precioFinal = producto.precio_especial ?? producto.precio;

  // JSON-LD para SEO Schema.org
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: producto.nombre,
    description: producto.descripcion,
    image: imagenes[0]?.url || undefined,
    brand: {
      "@type": "Brand",
      name: NOMBRE_MARCA,
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "MXN",
      price: precioFinal,
      availability:
        producto.total_stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    aggregateRating:
      totalResenas > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: promedioResenas,
            reviewCount: totalResenas,
          }
        : undefined,
  };

  return (
    <StoreLayout>
      {/* Script JSON-LD para motores de búsqueda */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-[#FBF8F5] py-8 sm:py-10 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* 1. Migas de pan */}
          <nav aria-label="Migas de pan" className="mb-6">
            <ol className="flex items-center gap-1.5 text-xs text-slate-400 font-light flex-wrap">
              <li>
                <a href="/" className="hover:text-slate-700 transition-colors">
                  Inicio
                </a>
              </li>
              <li className="text-slate-300">/</li>
              <li>
                <a
                  href={`/categoria/${categoriaSlug}`}
                  className="hover:text-slate-700 transition-colors capitalize"
                >
                  {producto.categoria_nombre}
                </a>
              </li>
              <li className="text-slate-300">/</li>
              <li className="text-slate-700 font-normal truncate max-w-[280px]" aria-current="page">
                {producto.nombre}
              </li>
            </ol>
          </nav>

          {/* 2. Zona Superior en Dos Columnas: Galería (izq) e Información (der) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start mb-12">
            
            {/* Columna Izquierda: Galería */}
            <div className="lg:col-span-6">
              <ProductGallery nombre={producto.nombre} images={imagenes} />
            </div>

            {/* Columna Derecha: Información y Compra */}
            <div className="lg:col-span-6">
              <ProductInfo producto={producto} disponibilidad={disponibilidad} />
            </div>

          </div>

          {/* 3. Sección "Completa tu rutina" */}
          <CompleteRoutine rutinaData={rutinaData} />

          {/* 4. Sección "Reseñas" */}
          <ReviewsSection
            productoId={producto.id}
            initialReviews={initialReviews}
            totalResenas={totalResenas}
            promedioResenas={promedioResenas}
            puedeEscribirInicial={puedeEscribirInicial}
          />

        </div>
      </div>
    </StoreLayout>
  );
}

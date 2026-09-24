import React, { Suspense } from "react";
import type { Metadata } from "next";
import CatalogPage from "@/components/catalog/CatalogPage";
import { NOMBRE_MARCA } from "@/lib/marca";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { slug: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

export function generateMetadata({ params }: PageProps): Metadata {
  const nombreCategoria = params.slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());

  return {
    title: `${nombreCategoria} — ${NOMBRE_MARCA}`,
    description: `Descubre nuestros productos dermatológicos en la categoría ${nombreCategoria}.`,
  };
}

export default function CategoriaRoute({ params, searchParams }: PageProps) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FBF8F5] p-8 text-center text-xs text-slate-400">Cargando categoría...</div>}>
      <CatalogPage categorySlug={params.slug} initialSearchParams={searchParams} />
    </Suspense>
  );
}

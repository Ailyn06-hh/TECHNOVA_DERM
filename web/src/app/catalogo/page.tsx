import React, { Suspense } from "react";
import type { Metadata } from "next";
import CatalogPage from "@/components/catalog/CatalogPage";
import { NOMBRE_MARCA } from "@/lib/marca";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Catálogo de Productos — ${NOMBRE_MARCA}`,
  description: "Explora nuestras fórmulas dermatológicas diseñadas para el cuidado y protección de tu piel.",
};

interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function CatalogoRoute({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FBF8F5] p-8 text-center text-xs text-slate-400">Cargando catálogo...</div>}>
      <CatalogPage initialSearchParams={searchParams} />
    </Suspense>
  );
}

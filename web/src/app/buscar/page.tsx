import React, { Suspense } from "react";
import StoreLayout from "@/components/layout/StoreLayout";

interface BuscarPageProps {
  searchParams: { q?: string };
}

function BuscarContent({ searchParams }: BuscarPageProps) {
  // TODO: Implementar resultados de búsqueda completos
  const query = searchParams.q || "";
  return (
    <div className="max-w-7xl mx-auto px-4 py-16 text-center">
      <h1 className="font-serif text-3xl font-medium text-[#1A1715] mb-3">
        Resultados para &ldquo;{query}&rdquo;
      </h1>
      <p className="text-gray-500 text-sm font-light">Próximamente: Vista completa de resultados de búsqueda.</p>
    </div>
  );
}

export default function BuscarPage(props: BuscarPageProps) {
  return (
    <StoreLayout>
      <Suspense fallback={<div className="p-8 text-center text-xs text-gray-400">Buscando...</div>}>
        <BuscarContent {...props} />
      </Suspense>
    </StoreLayout>
  );
}

import React from "react";
import StoreLayout from "@/components/layout/StoreLayout";

interface CategoriaPageProps {
  params: { slug: string };
}

export default function CategoriaPage({ params }: CategoriaPageProps) {
  // TODO: Implementar catálogo filtrado por categoría
  return (
    <StoreLayout>
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="font-serif text-3xl font-medium text-[#1A1715] mb-3 capitalize">
          Categoría: {params.slug.replace(/-/g, " ")}
        </h1>
        <p className="text-gray-500 text-sm font-light">Próximamente: Listado de productos para esta categoría.</p>
      </div>
    </StoreLayout>
  );
}

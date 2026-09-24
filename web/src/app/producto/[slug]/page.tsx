import React from "react";
import StoreLayout from "@/components/layout/StoreLayout";

interface ProductoPageProps {
  params: { slug: string };
}

export default function ProductoPage({ params }: ProductoPageProps) {
  // TODO: Implementar ficha de detalle del producto
  return (
    <StoreLayout>
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="font-serif text-3xl font-medium text-[#1A1715] mb-3 capitalize">
          {params.slug.replace(/-/g, " ")}
        </h1>
        <p className="text-gray-500 text-sm font-light">Próximamente: Detalle, ingredientes y modo de uso del producto.</p>
      </div>
    </StoreLayout>
  );
}

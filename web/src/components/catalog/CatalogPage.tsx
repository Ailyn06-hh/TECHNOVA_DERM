import React from "react";
import StoreLayout from "@/components/layout/StoreLayout";

export interface CatalogPageProps {
  categorySlug?: string;
  initialSearchParams?: { [key: string]: string | string[] | undefined };
}

export default function CatalogPage({
  categorySlug,
  initialSearchParams,
}: CatalogPageProps) {
  return (
    <StoreLayout>
      <div className="min-h-screen bg-[#FBF8F5] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xs text-gray-400">Cargando catálogo...</p>
        </div>
      </div>
    </StoreLayout>
  );
}

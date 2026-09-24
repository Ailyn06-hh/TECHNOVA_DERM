import React from "react";
import StoreLayout from "@/components/layout/StoreLayout";

export default function CombosPage() {
  // TODO: Implementar catálogo completo de combos
  return (
    <StoreLayout>
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="font-serif text-3xl font-medium text-[#1A1715] mb-3">Combos de la Semana</h1>
        <p className="text-gray-500 text-sm font-light">Próximamente: Todos los combos con descuento especial.</p>
      </div>
    </StoreLayout>
  );
}

import React from "react";
import StoreLayout from "@/components/layout/StoreLayout";

export default function MiRutinaPage() {
  // TODO: Implementar vista detallada y agregar la rutina completa al carrito
  return (
    <StoreLayout>
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="font-serif text-3xl font-medium text-[#1A1715] mb-3">Mi Rutina Personalizada</h1>
        <p className="text-gray-500 text-sm font-light">
          Próximamente: Añade los 3 pasos de tu rutina recomendada con 10% de descuento en un solo clic.
        </p>
      </div>
    </StoreLayout>
  );
}

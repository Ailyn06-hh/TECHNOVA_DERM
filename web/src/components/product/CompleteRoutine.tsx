"use client";

import React, { useState } from "react";
import { Sparkles, ShoppingBag, Loader2 } from "lucide-react";
import RoutineItemCard from "./RoutineItemCard";
import ComboCard from "@/components/home/ComboCard";
import { formatearPrecio } from "@/lib/formato";
import { useCarrito } from "@/contexts/CarritoContext";
import { ProductoRutinaResponse } from "@/lib/recomendaciones";

interface CompleteRoutineProps {
  rutinaData: ProductoRutinaResponse;
}

export default function CompleteRoutine({ rutinaData }: CompleteRoutineProps) {
  const { refreshCart, showToast } = useCarrito();
  const [isAdding, setIsAdding] = useState(false);

  // Si no es rutina de 3 pasos pero hay un combo disponible que lo incluye
  if (!rutinaData.esRutina3Pasos) {
    if (!rutinaData.combo) return null;
    const c = rutinaData.combo;
    return (
      <section className="my-10 bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-2xs">
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-[#6B1F4A] text-xs font-medium border border-rose-100 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Combo sugerido</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-medium text-slate-900 tracking-tight">
            Combo que incluye este producto
          </h2>
          <p className="text-xs text-slate-500 font-light mt-1">
            Aprovecha un precio especial combinándolo con otras fórmulas de la misma línea.
          </p>
        </div>
        <div className="max-w-md">
          <ComboCard
            id={c.id}
            nombre={c.nombre}
            slug={c.slug}
            descripcion_corta={c.descripcion_corta}
            descuento_porcentaje={c.descuento_porcentaje}
            color_fondo={c.color_fondo}
            precio_original={c.precio_original}
            precio_final={c.precio_final}
            agotado={c.agotado}
            productos={c.productos}
          />
        </div>
      </section>
    );
  }

  const { paso1, paso2, paso3 } = rutinaData;
  const allSteps = [
    { step: "LIMPIADOR", item: paso1 },
    { step: "SÉRUM", item: paso2 },
    { step: "PROTECTOR SOLAR", item: paso3 },
  ].filter((s) => Boolean(s.item));

  // Estados de selección (empiezan todos seleccionados)
  const [selectedIds, setSelectedIds] = useState<number[]>(
    allSteps.map((s) => s.item!.id)
  );

  const toggleProduct = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const selectedCount = selectedIds.length;
  const isAllThreeSelected = selectedCount === 3 && allSteps.length === 3;

  // Calcular totales
  const selectedProducts = allSteps
    .filter((s) => selectedIds.includes(s.item!.id))
    .map((s) => s.item!);

  const subtotalOriginal = selectedProducts.reduce(
    (acc, p) => acc + Number(p.precio_especial ?? p.precio),
    0
  );

  const finalTotal = isAllThreeSelected
    ? Math.round(subtotalOriginal * 0.9)
    : subtotalOriginal;

  const handleAddRoutine = async () => {
    if (selectedCount === 0 || isAdding) return;
    setIsAdding(true);

    try {
      const res = await fetch("/api/carrito/rutina", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clave: "manana",
          productoIds: selectedIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast({
          message: data.error || "No se pudo agregar la rutina.",
          type: "error",
        });
        return;
      }

      await refreshCart();
      showToast({
        message: data.message || "Rutina agregada a tu bolsa",
        type: "success",
        linkHref: "/carrito",
        linkLabel: "Ver bolsa",
      });
    } catch {
      showToast({
        message: "Error de conexión al agregar la rutina.",
        type: "error",
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <section className="my-10 bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-2xs">
      
      {/* Encabezado de la rutina */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-medium text-slate-900 tracking-tight">
            Completa tu rutina
          </h2>
          <p className="text-xs text-slate-500 font-light mt-1">
            Llévate los 3 pasos y obtén 10% de descuento en todo el combo
          </p>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold self-start sm:self-auto transition-colors ${
            isAllThreeSelected
              ? "bg-rose-50 text-[#6B1F4A] border border-rose-200/70"
              : "bg-slate-100 text-slate-600 border border-slate-200"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isAllThreeSelected ? "-10% combo" : "Agrega los 3 para 10%"}</span>
        </span>
      </div>

      {/* 3 Tarjetas de paso en fila */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {allSteps.map(({ step, item }) => (
          <RoutineItemCard
            key={item!.id}
            product={item!}
            stepLabel={step}
            isSelected={selectedIds.includes(item!.id)}
            onToggle={() => toggleProduct(item!.id)}
          />
        ))}
      </div>

      {/* Pie con totales y botón */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100">
        <div className="flex items-baseline gap-3 text-center sm:text-left">
          <span className="text-xs text-slate-400 font-light">
            {selectedCount} {selectedCount === 1 ? "producto" : "productos"}
          </span>

          {isAllThreeSelected && subtotalOriginal > finalTotal && (
            <span className="text-sm text-slate-400 line-through">
              {formatearPrecio(subtotalOriginal)}
            </span>
          )}

          <span className="font-serif text-2xl sm:text-3xl font-semibold text-slate-900">
            {formatearPrecio(finalTotal)}
          </span>
        </div>

        <button
          type="button"
          onClick={handleAddRoutine}
          disabled={selectedCount === 0 || isAdding}
          className={`py-3 px-8 rounded-full text-xs sm:text-sm font-medium flex items-center justify-center gap-2 transition-all shadow-sm ${
            selectedCount === 0
              ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
              : "bg-[#6B1F4A] hover:bg-[#531839] text-white hover:shadow active:scale-[0.99] cursor-pointer"
          }`}
        >
          {isAdding ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Agregando rutina...</span>
            </>
          ) : (
            <>
              <ShoppingBag className="w-4 h-4" />
              <span>
                {isAllThreeSelected
                  ? "Agregar rutina al carrito"
                  : `Agregar ${selectedCount} ${
                      selectedCount === 1 ? "producto" : "productos"
                    } al carrito`}
              </span>
            </>
          )}
        </button>
      </div>

    </section>
  );
}

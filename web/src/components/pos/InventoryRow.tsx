"use client";

import React from "react";
import { Plus, ShoppingBag, Barcode, ChevronRight, PackageCheck, Loader2 } from "lucide-react";
import StockStatusBadge from "./StockStatusBadge";
import type { ItemInventarioPos } from "@/app/api/pos/inventario/route";

interface InventoryRowProps {
  item: ItemInventarioPos;
  isSelected: boolean;
  onSelect: (item: ItemInventarioPos) => void;
  onQuickAdd: (item: ItemInventarioPos) => void;
  isAdding?: boolean;
}

export default function InventoryRow({
  item,
  isSelected,
  onSelect,
  onQuickAdd,
  isAdding = false,
}: InventoryRowProps) {
  const sinStock = item.disponiblesTienda <= 0;

  return (
    <tr
      onClick={() => onSelect(item)}
      className={`group border-b border-stone-200/60 hover:bg-stone-50/80 cursor-pointer transition-colors ${
        isSelected ? "bg-amber-50/50" : ""
      }`}
    >
      {/* 1. Producto */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          {/* Miniatura de frasco cosmético */}
          <div
            className="w-10 h-12 rounded-xl flex items-center justify-center shrink-0 border border-black/5"
            style={{ backgroundColor: item.colorFondo || "#F3E1E4" }}
          >
            <div className="flex flex-col items-center">
              <div
                className="w-2 h-1 rounded-t-2xs"
                style={{ backgroundColor: "#2A2320" }}
              />
              <div
                className="w-4 h-6 rounded-b-xs shadow-2xs border border-black/10 flex items-center justify-center"
                style={{ backgroundColor: item.colorFrasco || "#D08C98" }}
              >
                <div className="w-2.5 h-3 bg-white/70 rounded-3xs flex items-center justify-center">
                  <span className="text-[4px] font-serif text-stone-800 font-bold">N</span>
                </div>
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-semibold text-stone-900 group-hover:text-[#5B122C] transition-colors leading-snug">
              {item.nombre}
            </h4>

            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-stone-400 font-light flex-wrap">
              <span className="font-mono text-stone-600 bg-stone-100 px-1 rounded text-[10px]">
                {item.sku}
              </span>

              {item.codigoBarras && (
                <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[10px] text-stone-400">
                  <Barcode className="w-3 h-3 text-stone-400" />
                  <span>{item.codigoBarras}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* 2. Lote / Caducidad */}
      <td className="py-3 px-4 whitespace-nowrap">
        {item.proximoLote ? (
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-semibold text-stone-800">
                {item.proximoLote.codigo}
              </span>
              <span className="text-xs text-stone-500 font-light">
                · {item.proximoLote.caducaTexto}
              </span>
            </div>

            {item.lotes.length > 1 && (
              <span className="text-[10px] text-stone-400 font-light block mt-0.5">
                +{item.lotes.length - 1} {item.lotes.length === 2 ? "lote más" : "lotes más"}
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs text-stone-400 font-light italic">
            Sin lote
          </span>
        )}
      </td>

      {/* 3. En tienda (Centro) */}
      <td className="py-3 px-4 whitespace-nowrap">
        <div>
          <span
            className={`text-base font-bold ${
              item.disponiblesTienda === 0
                ? "text-rose-600"
                : item.disponiblesTienda <= 5
                ? "text-amber-700"
                : "text-stone-900"
            }`}
          >
            {item.disponiblesTienda}
          </span>
          <span className="text-xs text-stone-500 font-light ml-1">
            disponibles
          </span>

          {item.apartadasTienda > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-amber-800 font-medium mt-0.5">
              <PackageCheck className="w-3 h-3 text-amber-600" />
              <span>
                {item.apartadasTienda} {item.apartadasTienda === 1 ? "apartada" : "apartadas"}
              </span>
            </div>
          )}
        </div>
      </td>

      {/* 4. Otras tiendas */}
      <td className="py-3 px-4 whitespace-nowrap">
        <span
          className={`text-xs ${
            item.stockOtrasTiendas > 0
              ? "text-stone-700 font-medium"
              : "text-stone-400 font-light"
          }`}
        >
          {item.stockOtrasTiendas} en otras tiendas
        </span>
      </td>

      {/* 5. Estado / Alerta */}
      <td className="py-3 px-4 whitespace-nowrap">
        <StockStatusBadge tipo={item.tipoAlerta} etiqueta={item.etiquetaAlerta} size="sm" />
      </td>

      {/* 6. Acciones */}
      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => onQuickAdd(item)}
            disabled={sinStock || isAdding}
            title={sinStock ? "Sin stock disponible en esta tienda" : "Agregar 1 unidad a la venta"}
            aria-label={`Agregar ${item.nombre} a la venta`}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
              sinStock
                ? "bg-stone-100 text-stone-300 cursor-not-allowed"
                : "bg-white hover:bg-[#181412] text-stone-700 hover:text-white border border-stone-200/90 shadow-2xs hover:border-[#181412] active:scale-95"
            }`}
          >
            {isAdding ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            <span className="hidden xl:inline text-[11px]">Vender</span>
          </button>

          <button
            type="button"
            onClick={() => onSelect(item)}
            title="Ver disponibilidad omnicanal"
            aria-label={`Ver disponibilidad de ${item.nombre}`}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

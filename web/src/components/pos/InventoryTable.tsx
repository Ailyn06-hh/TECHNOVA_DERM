"use client";

import React from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, PackageSearch, Loader2 } from "lucide-react";
import InventoryRow from "./InventoryRow";
import type { ItemInventarioPos } from "@/app/api/pos/inventario/route";

interface InventoryTableProps {
  items: ItemInventarioPos[];
  loading: boolean;
  selectedId: number | null;
  onSelectItem: (item: ItemInventarioPos) => void;
  onQuickAdd: (item: ItemInventarioPos) => void;
  addingId: number | null;
  orden: string;
  direccion: "asc" | "desc";
  onSort: (columna: string) => void;
  sucursalNombre: string;
}

export default function InventoryTable({
  items,
  loading,
  selectedId,
  onSelectItem,
  onQuickAdd,
  addingId,
  orden,
  direccion,
  onSort,
  sucursalNombre,
}: InventoryTableProps) {
  const renderSortIcon = (columna: string) => {
    if (orden !== columna) {
      return <ArrowUpDown className="w-3 h-3 text-stone-300 group-hover:text-stone-500" />;
    }
    return direccion === "asc" ? (
      <ArrowUp className="w-3 h-3 text-[#5B122C]" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[#5B122C]" />
    );
  };

  return (
    <div className="flex-1 bg-white rounded-3xl border border-stone-200/90 shadow-2xs overflow-hidden flex flex-col">
      <div className="flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full text-left border-collapse" role="table" aria-label="Tabla de inventario">
          <thead>
            <tr className="border-b border-stone-200/90 bg-stone-50/80 text-[11px] font-semibold text-stone-500 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-xs select-none">
              {/* Producto */}
              <th
                scope="col"
                className="py-3 px-4 cursor-pointer hover:text-stone-900 group"
                onClick={() => onSort("nombre")}
              >
                <div className="flex items-center gap-1.5">
                  <span>Producto</span>
                  {renderSortIcon("nombre")}
                </div>
              </th>

              {/* Lote / Caducidad */}
              <th
                scope="col"
                className="py-3 px-4 cursor-pointer hover:text-stone-900 group"
                onClick={() => onSort("lote")}
              >
                <div className="flex items-center gap-1.5">
                  <span>Lote / Caducidad</span>
                  {renderSortIcon("lote")}
                </div>
              </th>

              {/* En tienda */}
              <th
                scope="col"
                className="py-3 px-4 cursor-pointer hover:text-stone-900 group"
                onClick={() => onSort("stock_tienda")}
              >
                <div className="flex items-center gap-1.5">
                  <span>En tienda ({sucursalNombre})</span>
                  {renderSortIcon("stock_tienda")}
                </div>
              </th>

              {/* Otras tiendas */}
              <th
                scope="col"
                className="py-3 px-4 cursor-pointer hover:text-stone-900 group"
                onClick={() => onSort("stock_otras")}
              >
                <div className="flex items-center gap-1.5">
                  <span>Otras tiendas</span>
                  {renderSortIcon("stock_otras")}
                </div>
              </th>

              {/* Estado */}
              <th
                scope="col"
                className="py-3 px-4 cursor-pointer hover:text-stone-900 group"
                onClick={() => onSort("alerta")}
              >
                <div className="flex items-center gap-1.5">
                  <span>Estado</span>
                  {renderSortIcon("alerta")}
                </div>
              </th>

              {/* Acciones */}
              <th scope="col" className="py-3 px-4 text-right">
                <span>Acciones</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-stone-100">
            {loading && items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-stone-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-8 h-8 text-[#5B122C] animate-spin" />
                    <span className="text-xs font-light">Cargando inventario...</span>
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-stone-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <PackageSearch className="w-10 h-10 text-stone-300" />
                    <p className="text-sm font-medium text-stone-600">
                      No se encontraron productos
                    </p>
                    <p className="text-xs text-stone-400 max-w-xs font-light">
                      Intenta cambiar los filtros o el término de búsqueda por código de barras o SKU.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <InventoryRow
                  key={item.id}
                  item={item}
                  isSelected={item.id === selectedId}
                  onSelect={onSelectItem}
                  onQuickAdd={onQuickAdd}
                  isAdding={item.id === addingId}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

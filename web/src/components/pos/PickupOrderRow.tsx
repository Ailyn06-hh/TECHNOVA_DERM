"use client";

import React from "react";
import ChannelBadge from "@/components/orders/ChannelBadge";

export interface PickupOrder {
  id: number;
  folio: string;
  canal: string;
  estado: "pagado" | "preparando" | "listo_para_recoger" | "por_pagar_en_tienda" | string;
  subtotal: number;
  descuento: number;
  total: number;
  metodoPago?: string | null;
  porPagar: boolean;
  bloqueado: boolean;
  intentosFallidos: number;
  creadoEn: string;
  codigoVerificado?: boolean;
  cliente: {
    id?: number;
    nombreCompleto: string;
    nombre: string;
    apellido: string;
    correo: string;
    celular: string;
  };
  piezas: number;
  items: Array<{
    id: number;
    productoId: number;
    nombre: string;
    sku: string;
    cantidad: number;
    precioUnitario: number;
    descuento: number;
    total: number;
    estadoItem?: string;
  }>;
}

interface PickupOrderRowProps {
  order: PickupOrder;
  isSelected: boolean;
  isNew?: boolean;
  onSelect: (order: PickupOrder) => void;
}

export default function PickupOrderRow({
  order,
  isSelected,
  isNew = false,
  onSelect,
}: PickupOrderRowProps) {
  const folioConHash = order.folio.startsWith("#") ? order.folio : `#${order.folio}`;

  // Formateo del estado legible y clases estilizadas
  const renderEstado = () => {
    switch (order.estado) {
      case "listo_para_recoger":
        return (
          <span className="inline-flex items-center text-xs font-semibold text-stone-900 tracking-tight">
            Listo para recoger
          </span>
        );
      case "preparando":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200/80">
            Preparando
          </span>
        );
      case "pagado":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200/80">
            Pendiente de preparar
          </span>
        );
      case "por_pagar_en_tienda":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold text-[#8B2844] bg-[#FDF2F4] border border-[#F8D2DD]">
            Por pagar en tienda
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs text-stone-600 bg-stone-100">
            {order.estado}
          </span>
        );
    }
  };

  return (
    <tr
      role="row"
      aria-selected={isSelected}
      tabIndex={0}
      onClick={() => onSelect(order)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(order);
        }
      }}
      className={`cursor-pointer transition-colors duration-150 border-b border-stone-100 outline-hidden select-none ${
        isSelected
          ? "bg-[#FDF2F4] border-l-4 border-l-[#8B2844] font-medium"
          : "hover:bg-stone-50/80 bg-white"
      } ${isNew ? "animate-pulse ring-2 ring-[#8B2844]/40" : ""}`}
    >
      {/* PEDIDO */}
      <td className="py-3.5 px-4 text-sm font-bold text-stone-900 font-mono">
        {folioConHash}
      </td>

      {/* CLIENTA */}
      <td className="py-3.5 px-4 text-sm text-stone-800 max-w-[180px] truncate">
        {order.cliente.nombreCompleto}
      </td>

      {/* CANAL */}
      <td className="py-3.5 px-4">
        <ChannelBadge canal={order.canal} />
      </td>

      {/* PZAS */}
      <td className="py-3.5 px-4 text-sm text-stone-600 font-medium">
        {order.piezas} {order.piezas === 1 ? "pza" : "pzas"}
      </td>

      {/* ESTADO */}
      <td className="py-3.5 px-4 text-right sm:text-left">
        {renderEstado()}
      </td>
    </tr>
  );
}

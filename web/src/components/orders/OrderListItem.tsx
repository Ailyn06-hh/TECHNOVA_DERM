"use client";

import React, { forwardRef } from "react";
import Link from "next/link";
import OrderStatusBadge from "@/components/account/OrderStatusBadge";
import ChannelBadge from "./ChannelBadge";
import ReorderButton from "./ReorderButton";
import { GRUPOS_ESTADO } from "@/lib/pedidos-utils";

export interface OrderItemData {
  id: number;
  folio: string;
  canal: string;
  canalEtiqueta: { texto: string; label: string; className: string };
  tipoEntrega: string;
  entregaTexto: string;
  estado: string;
  total: number;
  totalFormateado: string;
  fechaFormateada: string;
  creadoEn: string;
  productosTexto: string;
  totalPiezas: number;
  sucursalNombre?: string;
}

interface OrderListItemProps {
  order: OrderItemData;
}

const OrderListItem = forwardRef<HTMLElement, OrderListItemProps>(
  ({ order }, ref) => {
    const isEnCurso = GRUPOS_ESTADO.en_curso.includes(order.estado);
    const isEntregado = order.estado === "entregado";
    const isCancelado = GRUPOS_ESTADO.cancelados.includes(order.estado);

    return (
      <article
        ref={ref}
        tabIndex={-1}
        className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-shadow duration-200"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 md:gap-4 items-start md:items-center">
          {/* Col 1: Folio y fecha */}
          <div className="md:col-span-2 flex items-center justify-between md:block">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              <Link
                href={`/cuenta/pedidos/${order.folio}`}
                className="hover:text-[#6B1F4A] hover:underline focus:outline-hidden focus:ring-2 focus:ring-[#6B1F4A] rounded-xs"
              >
                #{order.folio}
              </Link>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{order.fechaFormateada}</p>
          </div>

          {/* Col 2: Etiqueta de canal */}
          <div className="md:col-span-1 flex items-center">
            <ChannelBadge
              canal={order.canal}
              sucursalNombre={order.sucursalNombre}
            />
          </div>

          {/* Col 3: Productos y entrega */}
          <div className="md:col-span-4 min-w-0">
            <p
              className="text-xs text-slate-800 font-medium line-clamp-2 leading-relaxed"
              title={order.productosTexto}
            >
              {order.productosTexto}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
              <span>{order.entregaTexto}</span>
            </p>
          </div>

          {/* Col 4: Estado */}
          <div className="md:col-span-2 flex items-center md:justify-center">
            <OrderStatusBadge
              estado={order.estado}
              tipoEntrega={order.tipoEntrega}
            />
          </div>

          {/* Col 5: Total */}
          <div className="md:col-span-1 flex items-baseline justify-between md:block md:text-right">
            <span className="md:hidden text-xs text-slate-500">Total:</span>
            <span className="text-sm font-bold text-slate-900">
              {order.totalFormateado}
            </span>
          </div>

          {/* Col 6: Botón de acción */}
          <div className="md:col-span-2 w-full md:w-auto flex md:justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
            {isEnCurso && (
              <Link
                href={`/cuenta/pedidos/${order.folio}`}
                className="w-full md:w-auto px-4 py-2 rounded-full text-xs font-semibold bg-[#1A1A1A] text-white hover:bg-black active:scale-[0.98] transition-all shadow-2xs flex items-center justify-center text-center cursor-pointer"
              >
                Ver detalle
              </Link>
            )}

            {isEntregado && (
              <ReorderButton folio={order.folio} className="w-full md:w-auto" />
            )}

            {isCancelado && (
              <Link
                href={`/cuenta/pedidos/${order.folio}`}
                className="w-full md:w-auto px-4 py-2 rounded-full text-xs font-semibold border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all shadow-2xs flex items-center justify-center text-center cursor-pointer"
              >
                Ver detalle
              </Link>
            )}

            {!isEnCurso && !isEntregado && !isCancelado && (
              <Link
                href={`/cuenta/pedidos/${order.folio}`}
                className="w-full md:w-auto px-4 py-2 rounded-full text-xs font-semibold border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 active:scale-[0.98] transition-all shadow-2xs flex items-center justify-center text-center cursor-pointer"
              >
                Ver detalle
              </Link>
            )}
          </div>
        </div>
      </article>
    );
  }
);

OrderListItem.displayName = "OrderListItem";

export default OrderListItem;

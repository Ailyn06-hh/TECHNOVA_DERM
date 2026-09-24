import React from "react";
import Link from "next/link";
import { ArrowRight, Package } from "lucide-react";
import OrderStatusBadge from "./OrderStatusBadge";
import { formatearPrecio } from "@/lib/formato";

export interface RecentOrderItem {
  id: number;
  folio: string;
  fechaCorta: string;
  canalLabel: string;
  estado: string;
  total: number;
}

interface RecentOrdersCardProps {
  pedidos: RecentOrderItem[];
}

export default function RecentOrdersCard({ pedidos }: RecentOrdersCardProps) {
  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xs">
      {/* Encabezado: Título y Ver todos */}
      <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
        <h2 className="font-serif text-xl sm:text-2xl font-medium text-slate-900">
          Últimos pedidos
        </h2>
        {pedidos && pedidos.length > 0 && (
          <Link
            href="/cuenta/pedidos"
            className="text-xs font-semibold text-[#6B1F4A] hover:underline flex items-center gap-1"
          >
            <span>Ver todos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Lista de filas de pedidos */}
      {!pedidos || pedidos.length === 0 ? (
        <div className="py-8 text-center">
          <div className="w-10 h-10 rounded-2xl bg-[#FAF8F5] text-slate-400 flex items-center justify-center mx-auto mb-2.5">
            <Package className="w-5 h-5" />
          </div>
          <p className="text-xs sm:text-sm text-slate-600 font-normal">
            Todavía no tienes pedidos
          </p>
          <div className="mt-3">
            <Link
              href="/catalogo"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B1F4A] hover:underline"
            >
              <span>Explorar fórmulas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {pedidos.map((ped) => (
            <Link
              key={ped.id}
              href={`/cuenta/pedidos/${ped.folio}`}
              className="flex items-center justify-between py-4 hover:bg-[#FAF8F5]/80 -mx-3 px-3 rounded-2xl transition group"
            >
              <div className="min-w-0 pr-4">
                <p className="font-medium text-slate-900 text-sm sm:text-base group-hover:text-[#6B1F4A] transition-colors">
                  Pedido #{ped.folio}
                </p>
                <p className="text-xs text-slate-500 font-light mt-0.5">
                  {ped.fechaCorta} · {ped.canalLabel}
                </p>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <OrderStatusBadge estado={ped.estado} />
                <span className="font-semibold text-slate-900 text-sm sm:text-base">
                  {formatearPrecio(ped.total)}
                </span>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#6B1F4A] transition-colors hidden sm:block" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

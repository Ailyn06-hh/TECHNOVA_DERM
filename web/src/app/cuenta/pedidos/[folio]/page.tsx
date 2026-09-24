import React from "react";
import Link from "next/link";
import { ArrowLeft, Clock, PackageCheck, Eye } from "lucide-react";
import StoreLayout from "@/components/layout/StoreLayout";
import { NOMBRE_MARCA } from "@/lib/marca";

export const dynamic = "force-dynamic";

export default function SeguimientoPedidoProvisional({
  params,
}: {
  params: { folio: string };
}) {
  const { folio } = params;
  const folioFormat = folio.startsWith("#") ? folio : `#${folio}`;

  return (
    <StoreLayout>
      <div className="min-h-screen bg-[#FAF8F5] py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto bg-white rounded-3xl p-8 border border-slate-100 shadow-xs text-center">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <PackageCheck className="w-7 h-7" />
          </div>

          <span className="text-xs font-semibold text-[#6B1F4A] uppercase tracking-wider block mb-1">
            Seguimiento de Pedido
          </span>

          <h1 className="font-serif text-2xl sm:text-3xl font-medium text-slate-900 mb-2">
            Pedido {folioFormat}
          </h1>

          <p className="text-slate-500 text-xs sm:text-sm font-light mb-6">
            Detalle logístico y monitoreo omnicanal para tu compra en {NOMBRE_MARCA}.
          </p>

          <div className="bg-[#FAF9F6] border border-slate-200/80 rounded-2xl p-5 mb-6 text-left space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 pb-2 border-b border-slate-200/60">
              <Clock className="w-4 h-4 text-[#6B1F4A]" />
              <span>Estado en Vivo</span>
            </div>

            {/* TODO: Implementar pantalla completa de seguimiento omnicanal con eventos, chat con la sucursal y geolocalización del repartidor */}
            <p className="text-xs text-slate-600 leading-relaxed font-light">
              Esta pantalla de seguimiento avanzado está en fase de desarrollo. Puedes consultar los detalles inmediatos de entrega, código de recogida y desglose en la pantalla de confirmación:
            </p>

            <div className="pt-2">
              <Link
                href={`/checkout/confirmacion/${folio}`}
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#6B1F4A] hover:underline"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Ver resumen y código en confirmación</span>
              </Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/catalogo"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-[#1A1715] hover:bg-[#2C2724] text-white text-xs sm:text-sm font-medium transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a la tienda</span>
            </Link>
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}

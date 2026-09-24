import React from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, PackageX } from "lucide-react";
import { getAuthUserServer } from "@/lib/session";
import { NOMBRE_MARCA } from "@/lib/marca";
import { obtenerDetallePedido } from "@/lib/pedidos";
import AccountLayout from "@/components/account/AccountLayout";
import OrderDetailPage from "@/components/orders/detail/OrderDetailPage";

export const dynamic = "force-dynamic";

interface SeguimientoPedidoPageProps {
  params: {
    folio: string;
  };
}

export async function generateMetadata({
  params,
}: SeguimientoPedidoPageProps): Promise<Metadata> {
  const folio = params.folio;
  const folioDisplay = folio.startsWith("#") ? folio : `#${folio}`;
  return {
    title: `Pedido ${folioDisplay} | ${NOMBRE_MARCA}`,
    description: `Seguimiento en vivo, código de recogida y detalle de tu compra en ${NOMBRE_MARCA}.`,
  };
}

export default async function SeguimientoPedidoPage({
  params,
}: SeguimientoPedidoPageProps) {
  const user = getAuthUserServer();
  const { folio } = params;

  if (!user?.userId) {
    redirect(`/login?volver=/cuenta/pedidos/${encodeURIComponent(folio)}`);
  }

  const detalle = await obtenerDetallePedido(folio, user.userId);

  if (!detalle) {
    return (
      <AccountLayout usuario={{ nombre: user.nombre, correo: user.correo }}>
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-stone-200 text-center max-w-lg mx-auto my-8 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-4">
            <PackageX className="w-7 h-7" />
          </div>
          <h1 className="font-serif text-2xl font-medium text-stone-900 mb-2">
            Pedido no encontrado
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mb-6 font-light leading-relaxed">
            No encontramos ningún pedido con el folio <strong>#{folio}</strong> asociado a tu cuenta. Verifica el número o consulta tu historial.
          </p>
          <Link
            href="/cuenta/pedidos"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-[#5B122C] text-white hover:bg-[#4A0E17] transition-all shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a mis pedidos</span>
          </Link>
        </div>
      </AccountLayout>
    );
  }

  return (
    <AccountLayout usuario={{ nombre: user.nombre, correo: user.correo }}>
      <OrderDetailPage initialData={detalle} folio={folio} />
    </AccountLayout>
  );
}

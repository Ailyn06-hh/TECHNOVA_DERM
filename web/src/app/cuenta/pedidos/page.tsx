import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthUserServer } from "@/lib/session";
import { NOMBRE_MARCA } from "@/lib/marca";
import { obtenerMisPedidos } from "@/lib/pedidos";
import OrdersPage from "@/components/orders/OrdersPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Mis pedidos | ${NOMBRE_MARCA}`,
  description: `Todos tus pedidos en ${NOMBRE_MARCA}: web, app, WhatsApp o tienda.`,
};

interface MisPedidosPageProps {
  searchParams: {
    estado?: string;
    canal?: string;
    pagina?: string;
  };
}

export default async function MisPedidosPage({
  searchParams,
}: MisPedidosPageProps) {
  const user = getAuthUserServer();
  if (!user?.userId) {
    redirect("/login?volver=/cuenta/pedidos");
  }

  const estado = searchParams?.estado || "todos";
  const canal = searchParams?.canal || "todos";
  const pagina = parseInt(searchParams?.pagina || "1", 10) || 1;

  // Carga inicial en el servidor (SSR)
  const initialData = await obtenerMisPedidos({
    userId: user.userId,
    estado,
    canal,
    pagina,
    limite: 10,
  });

  return (
    <OrdersPage
      initialPedidos={initialData.pedidos}
      initialHayMas={initialData.hayMas}
      initialCounts={initialData.conteosPorCanal}
      initialEstado={initialData.estado as any}
      initialCanal={initialData.canal as any}
      user={{
        nombre: user.nombre,
        correo: user.correo,
      }}
    />
  );
}

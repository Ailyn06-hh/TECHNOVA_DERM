import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDispositivoServer, getPosSessionServer } from "@/lib/pos-session";
import { NOMBRE_MARCA } from "@/lib/marca";
import PickupOrdersPage from "@/components/pos/PickupOrdersPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Pedidos por Recoger · POS | ${NOMBRE_MARCA}`,
};

export default async function PosPorRecogerPage() {
  const dispositivo = await getDispositivoServer();
  const session = await getPosSessionServer();

  if (!dispositivo || !session) {
    redirect("/pos");
  }

  return <PickupOrdersPage session={session} />;
}

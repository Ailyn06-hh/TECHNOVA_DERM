import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDispositivoServer, getPosSessionServer } from "@/lib/pos-session";
import { NOMBRE_MARCA } from "@/lib/marca";
import PosShell from "@/components/pos/PosShell";
import CashClosePage from "@/components/pos/CashClosePage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Corte de Caja · POS | ${NOMBRE_MARCA}`,
  description: "Arqueo de valores, balance de turno y cierre de caja en Punto de Venta.",
};

export default async function PosCortePage() {
  const dispositivo = await getDispositivoServer();
  const session = await getPosSessionServer();

  if (!dispositivo || !session) {
    redirect("/pos");
  }

  return (
    <PosShell session={session}>
      <CashClosePage session={session} />
    </PosShell>
  );
}

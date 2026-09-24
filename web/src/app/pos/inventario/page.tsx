import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDispositivoServer, getPosSessionServer } from "@/lib/pos-session";
import { getDbPool } from "@/lib/db";
import { NOMBRE_MARCA } from "@/lib/marca";
import PosShell from "@/components/pos/PosShell";
import InventoryPage from "@/components/pos/InventoryPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Inventario Omnicanal · POS | ${NOMBRE_MARCA}`,
  description: `Consulta de existencias omnicanal, lotes FEFO y órdenes de reabastecimiento en ${NOMBRE_MARCA}.`,
};

export default async function PosInventarioPage() {
  const dispositivo = await getDispositivoServer();
  const session = await getPosSessionServer();

  if (!dispositivo || !session) {
    redirect("/pos");
  }

  let tieneItemsBorrador = false;
  try {
    const pool = getDbPool();
    const [draftRows]: any = await pool.execute(
      `SELECT COUNT(*) as total 
       FROM pedido_items pi
       JOIN pedidos p ON p.id = pi.pedido_id 
       WHERE p.turno_id = ? AND p.estado = 'borrador'`,
      [session.turnoId]
    );
    tieneItemsBorrador = Number(draftRows?.[0]?.total || 0) > 0;
  } catch {}

  return (
    <PosShell session={session} tieneItemsBorrador={tieneItemsBorrador}>
      <InventoryPage session={session} />
    </PosShell>
  );
}

import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDispositivoServer, getPosSessionServer } from "@/lib/pos-session";
import { getDbPool } from "@/lib/db";
import { NOMBRE_MARCA } from "@/lib/marca";
import PosShell from "@/components/pos/PosShell";
import NewSalePage from "@/components/pos/NewSalePage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Nueva Venta · POS | ${NOMBRE_MARCA}`,
  description: `Terminal de punto de venta activo en ${NOMBRE_MARCA}.`,
};

export default async function PosVentaPage() {
  // 1. Exige dispositivo registrado
  const dispositivo = await getDispositivoServer();
  if (!dispositivo) {
    redirect("/pos");
  }

  // 2. Exige sesión de turno abierto
  const session = await getPosSessionServer();
  if (!session) {
    redirect("/pos");
  }

  // 3. Verificar si hay un borrador con artículos para avisos de cierre de sesión
  let tieneItems = false;
  try {
    const pool = getDbPool();
    const [draftRows]: any = await pool.execute(
      `SELECT COUNT(*) as total 
       FROM pedido_items pi
       JOIN pedidos p ON p.id = pi.pedido_id 
       WHERE p.turno_id = ? AND p.estado = 'borrador'`,
      [session.turnoId]
    );
    tieneItems = Number(draftRows?.[0]?.total || 0) > 0;
  } catch {}

  return (
    <PosShell session={session} tieneItemsBorrador={tieneItems}>
      <NewSalePage session={session} />
    </PosShell>
  );
}

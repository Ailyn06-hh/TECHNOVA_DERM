import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthUserServer } from "@/lib/session";
import { NOMBRE_MARCA } from "@/lib/marca";
import { getResumenCuenta } from "@/lib/cuenta";
import AccountLayout from "@/components/account/AccountLayout";
import AccountDashboardClient from "@/components/account/AccountDashboardClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Mi Cuenta | ${NOMBRE_MARCA}`,
  description: `Panel de control personal, pedidos en curso y rutinas de cuidado en ${NOMBRE_MARCA}.`,
};

export default async function CuentaPage() {
  const user = getAuthUserServer();
  if (!user?.userId) {
    redirect("/login?volver=/cuenta");
  }

  const data = await getResumenCuenta(user.userId, {
    nombre: user.nombre,
    correo: user.correo,
  });

  return (
    <AccountLayout usuario={data.usuario} unreadCount={data.unreadCount}>
      <AccountDashboardClient initialData={data} />
    </AccountLayout>
  );
}

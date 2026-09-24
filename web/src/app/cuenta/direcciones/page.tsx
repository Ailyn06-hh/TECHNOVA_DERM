import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthUserServer } from "@/lib/session";
import { NOMBRE_MARCA, MAX_DIRECCIONES, MAX_TARJETAS } from "@/lib/marca";
import { obtenerDireccionesYPagos } from "@/lib/cuenta";
import AccountLayout from "@/components/account/AccountLayout";
import AddressesPaymentsPage from "@/components/account/addresses/AddressesPaymentsPage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Direcciones y métodos de pago | ${NOMBRE_MARCA}`,
  description: `Guárdalas una vez y paga más rápido en la web y en la app de ${NOMBRE_MARCA}.`,
};

export default async function DireccionesPagosPage() {
  const user = getAuthUserServer();
  if (!user?.userId) {
    redirect("/login?volver=/cuenta/direcciones");
  }

  // Carga inicial en el servidor (SSR)
  const data = await obtenerDireccionesYPagos(user.userId);

  const initialData = {
    ...data,
    limites: {
      maxDirecciones: MAX_DIRECCIONES,
      maxTarjetas: MAX_TARJETAS,
    },
  };

  return (
    <AccountLayout usuario={{ nombre: user.nombre, correo: user.correo }}>
      <AddressesPaymentsPage initialData={initialData} />
    </AccountLayout>
  );
}

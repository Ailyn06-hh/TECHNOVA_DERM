import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthUserServer } from "@/lib/session";
import { NOMBRE_MARCA } from "@/lib/marca";
import AccountLayout from "@/components/account/AccountLayout";
import HelpView from "@/components/help/HelpView";
import { getAyudaDataServer, getPedidosElegiblesDevolucionServer } from "@/lib/ayuda";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Ayuda y Devoluciones | ${NOMBRE_MARCA}`,
  description: `Centro de soporte, devoluciones y preguntas frecuentes de ${NOMBRE_MARCA}.`,
};

export default async function AyudaCuentaPage() {
  const user = getAuthUserServer();
  if (!user?.userId) {
    redirect("/login?volver=/cuenta/ayuda");
  }

  // Cargar datos en el servidor
  const [ayudaData, pedidosElegibles] = await Promise.all([
    getAyudaDataServer(),
    getPedidosElegiblesDevolucionServer(user.userId),
  ]);

  return (
    <AccountLayout usuario={{ nombre: user.nombre, correo: user.correo }}>
      <HelpView
        initialTemas={ayudaData.temas}
        initialArticulos={ayudaData.articulos}
        pedidosElegibles={pedidosElegibles}
        isPublic={false}
        usuario={{ nombre: user.nombre, correo: user.correo }}
      />
    </AccountLayout>
  );
}

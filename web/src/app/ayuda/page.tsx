import React from "react";
import type { Metadata } from "next";
import { getAuthUserServer } from "@/lib/session";
import { NOMBRE_MARCA } from "@/lib/marca";
import StoreLayout from "@/components/layout/StoreLayout";
import HelpView from "@/components/help/HelpView";
import { getAyudaDataServer } from "@/lib/ayuda";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Centro de Ayuda y Preguntas Frecuentes | ${NOMBRE_MARCA}`,
  description: `Encuentra respuestas a dudas frecuentes sobre envíos a todo México, garantía dermatológica, devoluciones y facturación en ${NOMBRE_MARCA}.`,
};

export default async function PublicAyudaPage() {
  const user = getAuthUserServer();
  const ayudaData = await getAyudaDataServer();

  return (
    <StoreLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <HelpView
          initialTemas={ayudaData.temas}
          initialArticulos={ayudaData.articulos}
          isPublic={true}
          usuario={user ? { nombre: user.nombre, correo: user.correo } : null}
        />
      </div>
    </StoreLayout>
  );
}

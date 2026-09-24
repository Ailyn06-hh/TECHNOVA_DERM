import React from "react";
import type { Metadata } from "next";
import { NOMBRE_MARCA } from "@/lib/marca";
import RegisterDeviceForm from "@/components/pos/RegisterDeviceForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Registrar Terminal POS | ${NOMBRE_MARCA}`,
  description: `Vinculación segura de terminal o caja registradora en sucursales de ${NOMBRE_MARCA}.`,
};

export default function RegistrarDispositivoPage() {
  return <RegisterDeviceForm />;
}

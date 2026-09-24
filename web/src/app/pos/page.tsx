import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getDispositivoServer, getPosSessionServer } from "@/lib/pos-session";
import { getPosInicioData } from "@/lib/pos-data";
import { NOMBRE_MARCA } from "@/lib/marca";
import PosLoginCard from "@/components/pos/PosLoginCard";
import DeviceNotRegistered from "@/components/pos/DeviceNotRegistered";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Iniciar Turno · POS | ${NOMBRE_MARCA}`,
  description: `Inicio de turno y control de caja en terminales de ${NOMBRE_MARCA}.`,
};

export default async function PosInicioPage() {
  // 1. Validar si el dispositivo está registrado
  const dispositivo = await getDispositivoServer();

  if (!dispositivo) {
    return <DeviceNotRegistered />;
  }

  // 2. Si ya hay una sesión de turno abierta en este equipo, redirigir a la pantalla de venta
  const activeSession = await getPosSessionServer();
  if (activeSession) {
    redirect("/pos/venta");
  }

  // 3. Cargar cajas y empleadas de la sucursal del dispositivo
  const { cajas, empleadas } = await getPosInicioData(dispositivo.sucursalId);

  return (
    <PosLoginCard
      dispositivo={dispositivo}
      cajas={cajas}
      empleadas={empleadas}
    />
  );
}

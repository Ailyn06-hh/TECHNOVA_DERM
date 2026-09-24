import React from "react";
import type { Metadata } from "next";
import { NOMBRE_MARCA } from "@/lib/marca";
import PosLayout from "@/components/pos/PosLayout";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Punto de Venta (POS) | ${NOMBRE_MARCA}`,
  description: `Terminal de punto de venta omnicanal para sucursales de ${NOMBRE_MARCA}.`,
};

export default function PosRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PosLayout>{children}</PosLayout>;
}

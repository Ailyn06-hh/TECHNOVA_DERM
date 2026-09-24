import React from "react";
import InventarioPage from "@/components/admin/InventarioPage";

export const metadata = {
  title: "Inventario y Lotes FEFO | CRM Technova-Derm",
  description: "Existencias por sucursal, entradas de proveedor y transferencias entre tiendas",
};

export default function AdminInventarioPage() {
  return <InventarioPage />;
}

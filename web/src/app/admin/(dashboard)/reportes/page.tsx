import React from "react";
import ReportesPage from "@/components/admin/ReportesPage";

export const metadata = {
  title: "Reportes y Analítica | CRM Technova-Derm",
  description: "Mide el negocio por periodo, canal, producto y tienda. Exportación a Excel.",
};

export default function AdminReportesPage() {
  return <ReportesPage />;
}

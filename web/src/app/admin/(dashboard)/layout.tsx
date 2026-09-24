import React from "react";
import { redirect } from "next/navigation";
import { getAdminSessionServer } from "@/lib/admin-session";
import AdminShell from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Panel de Administración | Technova-Derm",
  description: "CRM Omnicanal para Technova-Derm",
};

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSessionServer();

  if (!session) {
    redirect("/admin/login");
  }

  return <AdminShell admin={session}>{children}</AdminShell>;
}

import React from "react";

export const metadata = {
  title: "Iniciar Sesión | Panel de Administración | Technova-Derm",
  description: "Acceso seguro al sistema de administración CRM Technova-Derm",
};

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-[#FAF7F5] flex items-center justify-center font-sans antialiased text-stone-800">
      {children}
    </div>
  );
}

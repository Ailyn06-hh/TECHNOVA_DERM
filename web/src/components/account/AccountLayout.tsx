import React from "react";
import StoreLayout from "@/components/layout/StoreLayout";
import AccountSidebar from "./AccountSidebar";

interface AccountLayoutProps {
  usuario: {
    nombre: string;
    correo: string;
  };
  unreadCount?: number;
  children: React.ReactNode;
}

export default function AccountLayout({
  usuario,
  unreadCount = 0,
  children,
}: AccountLayoutProps) {
  return (
    <StoreLayout>
      <div className="min-h-screen bg-[#FAF8F5] py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-start gap-8 lg:gap-12">
            {/* Columna lateral izquierda */}
            <AccountSidebar usuario={usuario} unreadCountInicial={unreadCount} />

            {/* Columna principal derecha */}
            <main className="flex-1 w-full min-w-0">
              {children}
            </main>
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}

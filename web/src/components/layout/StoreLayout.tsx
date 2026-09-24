"use client";

import React from "react";
import AnnouncementBar from "./AnnouncementBar";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import ToastContainer from "@/components/common/ToastContainer";
import { CarritoProvider } from "@/contexts/CarritoContext";

interface StoreLayoutProps {
  children: React.ReactNode;
}

export default function StoreLayout({ children }: StoreLayoutProps) {
  return (
    <CarritoProvider>
      <div className="min-h-screen flex flex-col bg-[#F8F5F0] text-[#1A1715]">
        {/* Barra superior de aviso */}
        <AnnouncementBar />

        {/* Cabecera principal */}
        <SiteHeader />

        {/* Contenido principal */}
        <main className="flex-1">{children}</main>

        {/* Pie de página */}
        <SiteFooter />

        {/* Contenedor de notificaciones toast */}
        <ToastContainer />
      </div>
    </CarritoProvider>
  );
}

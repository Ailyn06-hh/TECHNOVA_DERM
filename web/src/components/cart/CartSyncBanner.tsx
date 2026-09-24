"use client";

import React from "react";
import Link from "next/link";
import { Smartphone, Store, Laptop } from "lucide-react";

export interface CartSyncBannerProps {
  aviso: {
    tipo: "app" | "tienda" | "web" | "invitado";
    mensaje: string;
    linkHref?: string;
    linkLabel?: string;
  };
}

export default function CartSyncBanner({ aviso }: CartSyncBannerProps) {
  const getIcon = () => {
    switch (aviso.tipo) {
      case "app":
        return <Smartphone className="w-5 h-5 text-emerald-800 shrink-0" />;
      case "tienda":
        return <Store className="w-5 h-5 text-emerald-800 shrink-0" />;
      default:
        return <Smartphone className="w-5 h-5 text-emerald-800 shrink-0" />;
    }
  };

  return (
    <div className="bg-[#EAF5EF] border border-[#CDE8D8] text-slate-800 rounded-2xl p-4 sm:p-4.5 mb-6 flex items-start sm:items-center justify-between gap-3 shadow-2xs">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full bg-white/80 flex items-center justify-center shrink-0 shadow-2xs">
          {getIcon()}
        </div>
        <p className="text-xs sm:text-sm font-normal text-slate-700 leading-snug">
          {aviso.mensaje}
        </p>
      </div>

      {aviso.linkHref && aviso.linkLabel && (
        <Link
          href={aviso.linkHref}
          className="shrink-0 text-xs sm:text-sm font-semibold text-[#6B1F4A] hover:text-[#531839] hover:underline underline-offset-4 transition-colors ml-2"
        >
          {aviso.linkLabel}
        </Link>
      )}
    </div>
  );
}

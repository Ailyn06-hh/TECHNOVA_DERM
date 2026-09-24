"use client";

import React from "react";
import { etiquetaCanal } from "@/lib/pedidos-utils";

interface ChannelBadgeProps {
  canal: string;
  sucursalNombre?: string | null;
  className?: string;
}

export default function ChannelBadge({
  canal,
  sucursalNombre,
  className = "",
}: ChannelBadgeProps) {
  const badge = etiquetaCanal(canal, sucursalNombre);

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border ${badge.className} ${className}`}
    >
      {badge.texto}
    </span>
  );
}

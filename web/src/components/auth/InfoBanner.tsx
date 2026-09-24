import React from "react";
import { Package } from "lucide-react";

export default function InfoBanner() {
  return (
    <div
      className="w-full p-3.5 sm:p-4 rounded-xl sm:rounded-2xl flex items-center gap-3 border border-[#D3E2D8] transition-all"
      style={{ backgroundColor: "#E3EDE6" }}
      role="note"
      aria-label="Información de vinculación de pedidos"
    >
      <span className="p-2 rounded-lg bg-[#D3E2D8]/60 text-[#2C523B] shrink-0">
        <Package className="w-4 h-4 sm:w-5 sm:h-5 stroke-[1.8]" />
      </span>
      <p className="text-xs sm:text-[13px] text-[#2C523B] font-normal leading-snug">
        ¿Compraste antes como invitada? Tus pedidos se vinculan a tu nueva cuenta.
      </p>
    </div>
  );
}

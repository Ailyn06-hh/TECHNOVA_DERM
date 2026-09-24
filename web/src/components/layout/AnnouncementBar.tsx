import React from "react";
import { ENVIO_GRATIS_DESDE } from "@/lib/marca";
import { formatearPrecio } from "@/lib/formato";

export default function AnnouncementBar() {
  return (
    <aside
      aria-label="Aviso de envíos y sucursales"
      className="w-full bg-[#1A1715] text-[#FAF7F5] py-2 px-4 text-center text-[11px] sm:text-xs font-light tracking-wide transition-colors"
    >
      <p>
        Envío gratis desde {formatearPrecio(ENVIO_GRATIS_DESDE)} · Compra en línea y recoge en tienda el mismo día
      </p>
    </aside>
  );
}

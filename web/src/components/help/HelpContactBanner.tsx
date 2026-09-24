"use client";

import React from "react";
import { MessageCircle, MessageSquareText } from "lucide-react";
import { WHATSAPP_SOPORTE, HORARIO_SOPORTE } from "@/lib/marca";

interface HelpContactBannerProps {
  onOpenChat: () => void;
}

export default function HelpContactBanner({ onOpenChat }: HelpContactBannerProps) {
  const whatsappUrl = `https://wa.me/${WHATSAPP_SOPORTE}?text=${encodeURIComponent(
    "Hola, me gustaría recibir asistencia con mi cuenta o un pedido en Technova-Derm."
  )}`;

  return (
    <div className="w-full bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
      <div>
        <h3 className="font-semibold text-stone-900 text-base sm:text-lg mb-1">
          ¿Prefieres hablar con alguien?
        </h3>
        <p className="text-xs sm:text-sm text-stone-500 font-light">
          {HORARIO_SOPORTE.dias} de {HORARIO_SOPORTE.inicio} a {HORARIO_SOPORTE.fin} hrs.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-xs font-semibold text-white bg-[#1B4332] hover:bg-[#143326] active:scale-[0.98] transition-all shadow-xs cursor-pointer"
        >
          <MessageCircle className="w-4 h-4 fill-white/20 stroke-white stroke-2" />
          <span>Escríbenos por WhatsApp</span>
        </a>

        <button
          type="button"
          onClick={onOpenChat}
          className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full text-xs font-semibold text-stone-800 bg-white border border-stone-300 hover:border-stone-400 hover:bg-stone-50 active:scale-[0.98] transition-all shadow-2xs cursor-pointer"
        >
          <MessageSquareText className="w-4 h-4 text-stone-600" />
          <span>Chat en línea</span>
        </button>
      </div>
    </div>
  );
}

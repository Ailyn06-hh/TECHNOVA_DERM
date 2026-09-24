"use client";

import React from "react";
import { Check, Clock, AlertTriangle } from "lucide-react";

export interface ConfirmationHeaderProps {
  nombre: string;
  estado: string;
  tipoEntrega: "recoger" | "envio";
  tiempoRestantePendiente?: number;
  infoApartado?: { fecha: string; hora: string; total: string };
  motivoFallo?: string;
  h1Ref?: React.RefObject<HTMLHeadingElement>;
}

export default function ConfirmationHeader({
  nombre,
  estado,
  tipoEntrega,
  tiempoRestantePendiente = 60,
  infoApartado,
  motivoFallo,
  h1Ref,
}: ConfirmationHeaderProps) {
  const esApartado = estado === "por_pagar_en_tienda";
  const esPendiente = estado === "pendiente_pago";
  const esFallo = ["pago_fallido", "expirado", "cancelado"].includes(estado);

  // Variante 5: Fallo o expirado
  if (esFallo) {
    return (
      <div className="text-center mb-8">
        <div
          className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100 shadow-xs"
          aria-hidden="true"
        >
          <AlertTriangle className="w-8 h-8 stroke-[2.2]" />
        </div>
        <h1
          ref={h1Ref}
          tabIndex={-1}
          className="font-serif text-2xl sm:text-3xl font-medium text-slate-900 tracking-tight mb-2 outline-hidden"
        >
          No se pudo completar tu pedido
        </h1>
        <p className="text-sm sm:text-base text-slate-600 font-light max-w-md mx-auto">
          {motivoFallo ||
            "Hubo un inconveniente al procesar el pago. Tus fórmulas continúan intactas en tu carrito para que puedas intentar nuevamente."}
        </p>
      </div>
    );
  }

  // Variante 4: Pendiente de confirmación (Mercado Pago en revisión)
  if (esPendiente) {
    return (
      <div className="text-center mb-8">
        <div
          className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-100 shadow-xs"
          aria-hidden="true"
        >
          <Clock className="w-8 h-8 stroke-[2.2] animate-pulse" />
        </div>
        <h1
          ref={h1Ref}
          tabIndex={-1}
          className="font-serif text-2xl sm:text-3xl font-medium text-slate-900 tracking-tight mb-2 outline-hidden"
        >
          Estamos confirmando tu pago
        </h1>
        <p className="text-sm sm:text-base text-slate-600 font-light max-w-lg mx-auto">
          {tiempoRestantePendiente > 0
            ? "Estamos sincronizando la transacción con la pasarela. Esta pantalla se actualizará automáticamente en unos instantes..."
            : "Tu pago está en revisión. Te avisaremos por correo y WhatsApp en cuanto se confirme."}
        </p>
      </div>
    );
  }

  // Variante 3: Por pagar en tienda (Apartado)
  if (esApartado) {
    return (
      <div className="text-center mb-8">
        <div
          className="w-16 h-16 rounded-full bg-[#1b4332] text-white flex items-center justify-center mx-auto mb-4 shadow-sm"
          aria-hidden="true"
        >
          <Check className="w-8 h-8 stroke-[2.5]" />
        </div>
        <h1
          ref={h1Ref}
          tabIndex={-1}
          className="font-serif text-2xl sm:text-3xl font-medium text-slate-900 tracking-tight mb-2 outline-hidden"
        >
          ¡Listo{nombre ? `, ${nombre}` : ""}! Tu pedido está apartado
        </h1>
        <p className="text-sm sm:text-base text-slate-600 font-light max-w-lg mx-auto">
          {infoApartado
            ? `Pagas ${infoApartado.total} al recoger. Lo apartamos hasta el ${infoApartado.fecha} a las ${infoApartado.hora}.`
            : "Pagas al recoger en tienda física. Te lo guardamos hasta mañana a la hora de cierre."}
        </p>
      </div>
    );
  }

  // Variante 1 y 2: Confirmado / Pagado (Recoger o Envío)
  return (
    <div className="text-center mb-8">
      {/* Círculo verde oscuro con check blanco */}
      <div
        className="w-16 h-16 rounded-full bg-[#1b4332] text-white flex items-center justify-center mx-auto mb-4 shadow-sm"
        aria-hidden="true"
      >
        <Check className="w-8 h-8 stroke-[2.5]" />
      </div>

      {/* Título serif grande */}
      <h1
        ref={h1Ref}
        tabIndex={-1}
        className="font-serif text-2xl sm:text-3xl font-medium text-slate-900 tracking-tight mb-2 outline-hidden"
      >
        ¡Listo{nombre ? `, ${nombre}` : ""}! Tu pedido está confirmado
      </h1>

      {/* Subtítulo según tipo de entrega */}
      <p className="text-sm sm:text-base text-slate-600 font-light max-w-lg mx-auto">
        {tipoEntrega === "recoger"
          ? "Te avisaremos por WhatsApp y correo cuando esté listo para recoger."
          : "Te avisaremos por WhatsApp y correo cuando tu pedido salga."}
      </p>
    </div>
  );
}

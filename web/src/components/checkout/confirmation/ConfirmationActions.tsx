"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";

export interface ConfirmationActionsProps {
  folio: string;
  estado: string;
}

export default function ConfirmationActions({
  folio,
  estado,
}: ConfirmationActionsProps) {
  const esFallo = ["pago_fallido", "expirado", "cancelado"].includes(estado);

  if (esFallo) {
    return (
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          href="/carrito"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-[#6B1F4A] hover:bg-[#521738] text-white text-xs sm:text-sm font-medium transition active:scale-95 shadow-xs"
        >
          <ShoppingBag className="w-4 h-4" aria-hidden="true" />
          <span>Volver al carrito</span>
        </Link>
        <Link
          href="/"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full border border-slate-300 hover:border-slate-400 bg-white text-slate-800 text-xs sm:text-sm font-medium transition active:scale-95"
        >
          <span>Ir a la tienda</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 flex flex-col items-center gap-4">
      {/* Botones principales */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
        {/* Ver seguimiento (vino) */}
        <Link
          href={`/cuenta/pedidos/${folio}`}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[#6B1F4A] hover:bg-[#521738] text-white text-xs sm:text-sm font-medium transition active:scale-95 shadow-xs"
        >
          <span>Ver seguimiento</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>

        {/* Ir a mi cuenta (contorno) */}
        <Link
          href="/cuenta"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-medium transition active:scale-95"
        >
          <span>Ir a mi cuenta</span>
        </Link>
      </div>

      {/* Seguir comprando (enlace vino) */}
      <Link
        href="/"
        className="text-xs sm:text-sm font-medium text-[#6B1F4A] hover:text-[#521738] hover:underline transition-colors mt-1"
      >
        Seguir comprando
      </Link>
    </div>
  );
}

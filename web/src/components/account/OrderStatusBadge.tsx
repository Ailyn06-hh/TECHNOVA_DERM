import React from "react";

export type OrderStatus =
  | "por_pagar_en_tienda"
  | "pagado"
  | "preparando"
  | "listo_para_recoger"
  | "enviado"
  | "entregado"
  | "cancelado"
  | "expirado"
  | "pago_fallido"
  | string;

interface OrderStatusBadgeProps {
  estado: OrderStatus;
  tipoEntrega?: "recoger" | "envio" | string;
  className?: string;
}

export default function OrderStatusBadge({
  estado,
  tipoEntrega,
  className = "",
}: OrderStatusBadgeProps) {
  let label = "En proceso";
  let colorClasses = "bg-slate-100 text-slate-700 border-slate-200";

  switch (estado) {
    case "listo_para_recoger":
      label = "Listo para recoger";
      colorClasses = "bg-emerald-50 text-emerald-800 border-emerald-200";
      break;
    case "preparando":
      label = "Preparando";
      colorClasses = "bg-amber-50 text-amber-800 border-amber-200";
      break;
    case "enviado":
      label = "En camino";
      colorClasses = "bg-sky-50 text-sky-800 border-sky-200";
      break;
    case "por_pagar_en_tienda":
      label = "Por pagar en tienda";
      colorClasses = "bg-purple-50 text-[#6B1F4A] border-purple-200";
      break;
    case "pagado":
      label = tipoEntrega === "recoger" ? "Confirmado" : "Pago confirmado";
      colorClasses = "bg-emerald-50 text-emerald-800 border-emerald-200";
      break;
    case "entregado":
      label = "Entregado";
      colorClasses = "bg-slate-100 text-slate-700 border-slate-200";
      break;
    case "cancelado":
      label = "Cancelado";
      colorClasses = "bg-rose-50 text-rose-800 border-rose-200";
      break;
    case "expirado":
      label = "Apartado vencido";
      colorClasses = "bg-slate-100 text-slate-600 border-slate-200";
      break;
    case "pago_fallido":
      label = "Pago no completado";
      colorClasses = "bg-rose-50 text-rose-800 border-rose-200";
      break;
    default:
      label = estado;
      colorClasses = "bg-slate-100 text-slate-700 border-slate-200";
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${colorClasses} ${className}`}
    >
      {label}
    </span>
  );
}

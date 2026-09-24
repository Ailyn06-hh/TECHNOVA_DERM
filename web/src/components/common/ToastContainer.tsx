"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { useCarrito } from "@/contexts/CarritoContext";

export default function ToastContainer() {
  const { toasts, removeToast } = useCarrito();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center justify-between p-4 rounded-2xl shadow-lg border text-xs sm:text-sm font-medium transition-all transform animate-fade-in ${
            toast.type === "success"
              ? "bg-[#1A1715] text-white border-white/10"
              : "bg-rose-900 text-white border-rose-800"
          }`}
        >
          <div className="flex items-center gap-2.5 mr-3">
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {toast.linkHref && (
              <Link
                href={toast.linkHref}
                className="underline text-white font-semibold hover:text-white/80 transition"
              >
                {toast.linkLabel || "Ver"}
              </Link>
            )}
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              aria-label="Cerrar notificación"
              className="text-white/60 hover:text-white p-1 rounded-lg transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

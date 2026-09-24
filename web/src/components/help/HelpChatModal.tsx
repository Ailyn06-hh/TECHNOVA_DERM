"use client";

import React, { useState, useEffect } from "react";
import { X, MessageSquareText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { NOMBRE_MARCA } from "@/lib/marca";

interface HelpChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  usuarioDefault?: {
    nombre?: string;
    correo?: string;
  } | null;
}

export default function HelpChatModal({
  isOpen,
  onClose,
  usuarioDefault,
}: HelpChatModalProps) {
  const [correo, setCorreo] = useState(usuarioDefault?.correo || "");
  const [asunto, setAsunto] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCorreo(usuarioDefault?.correo || "");
      setAsunto("");
      setMensaje("");
      setErrorMsg(null);
      setIsSent(false);
    }
  }, [isOpen, usuarioDefault]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!correo.trim()) {
      setErrorMsg("Por favor ingresa tu correo de contacto.");
      return;
    }
    if (!mensaje.trim()) {
      setErrorMsg("Por favor describe tu consulta.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/ayuda/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correo: correo.trim(),
          asunto: asunto.trim() || "Consulta desde Chat en línea",
          mensaje: mensaje.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setErrorMsg(data?.error || "Error al enviar el mensaje.");
        return;
      }

      setIsSent(true);
    } catch {
      setErrorMsg("Error de conexión al enviar mensaje.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-modal-title"
    >
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-stone-200 shadow-2xl relative">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FAF3F6] text-[#5B122C] flex items-center justify-center">
              <MessageSquareText className="w-5 h-5" />
            </div>
            <div>
              <h3 id="chat-modal-title" className="font-semibold text-stone-900 text-base">
                Chat y Asistencia
              </h3>
              <p className="text-[11px] text-stone-400">Equipo de soporte {NOMBRE_MARCA}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isSent ? (
          <div className="py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-serif text-lg font-medium text-stone-900 mb-1">
              ¡Mensaje enviado con éxito!
            </h4>
            <p className="text-xs text-stone-500 max-w-xs mx-auto mb-6">
              Hemos registrado tu solicitud. Uno de nuestros dermoconsultores te responderá a tu correo ({correo}) a la brevedad.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-full text-xs font-semibold text-white bg-[#5B122C] hover:bg-[#4A0E17] transition-all cursor-pointer"
            >
              Entendido
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Tu correo electrónico *
              </label>
              <input
                type="email"
                required
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="ejemplo@correo.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:border-[#5B122C] focus:ring-1 focus:ring-[#5B122C] outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                Asunto (opcional)
              </label>
              <input
                type="text"
                value={asunto}
                onChange={(e) => setAsunto(e.target.value)}
                placeholder="Duda sobre un pedido, producto o factura"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:border-[#5B122C] focus:ring-1 focus:ring-[#5B122C] outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">
                ¿En qué podemos ayudarte hoy? *
              </label>
              <textarea
                required
                rows={4}
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Escribe tu mensaje con el mayor detalle posible..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:border-[#5B122C] focus:ring-1 focus:ring-[#5B122C] outline-none resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2.5 rounded-full text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2.5 rounded-full text-xs font-semibold text-white bg-[#5B122C] hover:bg-[#4A0E17] transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <span>Enviar mensaje</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

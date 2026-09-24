"use client";

import React, { useState } from "react";
import { CreditCard, Plus, Lock, ShieldCheck, AlertCircle } from "lucide-react";
import PaymentMethodCard, { type CardItem } from "./PaymentMethodCard";
import MercadoPagoLink from "./MercadoPagoLink";
import AddCardModal from "./AddCardModal";
import ConfirmDialog from "./ConfirmDialog";
import { useCarrito } from "@/contexts/CarritoContext";
import { NOMBRE_MARCA } from "@/lib/marca";

interface PaymentMethodListProps {
  tarjetas: CardItem[];
  cuentasVinculadas: Record<string, { conectado: boolean; cuentaMascara?: string }>;
  maxTarjetas?: number;
  onRefresh: () => Promise<void>;
}

export default function PaymentMethodList({
  tarjetas,
  cuentasVinculadas,
  maxTarjetas = 5,
  onRefresh,
}: PaymentMethodListProps) {
  const { showToast } = useCarrito();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<CardItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAtLimit = tarjetas.length >= maxTarjetas;
  const mercadoPagoInfo = cuentasVinculadas?.mercadopago || { conectado: false };

  const handleSetDefault = async (card: CardItem) => {
    try {
      const res = await fetch(`/api/cuenta/tarjetas/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ predeterminado: true }),
      });

      const data = await res.json();
      if (!res.ok || !data.exito) {
        showToast({
          message: data.error || "No se pudo actualizar la tarjeta predeterminada.",
          type: "error",
        });
        return;
      }

      showToast({
        message: `Tarjeta ${card.marcaLabel} terminación ${card.ultimos4} ahora es la predeterminada.`,
        type: "success",
      });
      await onRefresh();
    } catch {
      showToast({ message: "Error al actualizar tarjeta.", type: "error" });
    }
  };

  const handleConfirmDelete = async () => {
    if (!cardToDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/cuenta/tarjetas/${cardToDelete.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.exito) {
        showToast({
          message: data.error || "No se pudo eliminar la tarjeta.",
          type: "error",
        });
        return;
      }

      showToast({
        message: `Tarjeta terminación ${cardToDelete.ultimos4} eliminada.`,
        type: "info",
      });

      setCardToDelete(null);
      await onRefresh();
    } catch {
      showToast({ message: "Error de conexión al eliminar la tarjeta.", type: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-xs flex flex-col justify-between">
      <div>
        {/* Cabecera de la sección */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FAF3F6] text-[#5B122C] flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-medium text-stone-900">
                Métodos de pago
              </h2>
              <span className="text-xs text-stone-400 font-light block">
                {tarjetas.length} de {maxTarjetas} tarjetas guardadas
              </span>
            </div>
          </div>
        </div>

        {/* Lista de tarjetas guardadas */}
        {tarjetas.length === 0 ? (
          <div className="p-6 rounded-2xl bg-stone-50 border border-stone-200/70 text-center text-xs text-stone-500 mb-4">
            <p className="font-medium text-stone-700 mb-1">Aún no tienes tarjetas guardadas</p>
            <p>Agrega tu tarjeta bancaria para pagar de forma inmediata.</p>
          </div>
        ) : (
          <div className="space-y-3 mb-4">
            {tarjetas.map((card) => (
              <PaymentMethodCard
                key={card.id}
                tarjeta={card}
                onDelete={(c) => setCardToDelete(c)}
                onSetDefault={handleSetDefault}
              />
            ))}
          </div>
        )}

        {/* Fila + Agregar tarjeta */}
        <div className="mb-4">
          {isAtLimit ? (
            <p className="text-xs text-stone-400 p-3 rounded-xl bg-stone-50 border border-stone-200/70 text-center">
              Llegaste al límite de {maxTarjetas} tarjetas. Elimina una para registrar otra.
            </p>
          ) : (
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="w-full py-3 px-4 rounded-2xl border border-dashed border-stone-300 hover:border-[#5B122C] hover:bg-[#FAF3F6]/30 text-[#5B122C] text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Agregar tarjeta</span>
            </button>
          )}
        </div>

        {/* Fila de Mercado Pago */}
        <div className="mb-6">
          <MercadoPagoLink
            conectado={mercadoPagoInfo.conectado}
            cuentaMascara={mercadoPagoInfo.cuentaMascara}
            onRefresh={onRefresh}
          />
        </div>
      </div>

      {/* Aviso de seguridad con candado al pie */}
      <div className="pt-4 border-t border-stone-100">
        <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/60 text-xs text-stone-500 flex items-start gap-2.5">
          <Lock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <p className="text-[11px] font-light leading-relaxed">
            La pasarela de pago guarda tus tarjetas cifradas. <strong>{NOMBRE_MARCA}</strong> nunca ve el número completo.
          </p>
        </div>
      </div>

      {/* Modal para Agregar Tarjeta */}
      <AddCardModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={onRefresh}
        showToast={showToast}
      />

      {/* Diálogo de Confirmación para Eliminar Tarjeta */}
      <ConfirmDialog
        isOpen={Boolean(cardToDelete)}
        title={`¿Eliminar tarjeta terminación ${cardToDelete?.ultimos4}?`}
        description={
          cardToDelete?.predeterminado
            ? "Esta tarjeta es tu método de pago predeterminado. Si la eliminas, la siguiente tarjeta vigente pasará a ser la predeterminada."
            : "Esta acción retirará la tarjeta tokenizada de tu cuenta de forma permanente."
        }
        confirmText="Eliminar tarjeta"
        cancelText="Conservar"
        isDestructive
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setCardToDelete(null)}
      />
    </div>
  );
}

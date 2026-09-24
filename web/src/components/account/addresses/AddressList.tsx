"use client";

import React, { useState, useRef } from "react";
import { MapPin, Plus, AlertCircle } from "lucide-react";
import AddressCard, { type AddressItem } from "./AddressCard";
import AddressForm from "@/components/checkout/AddressForm";
import ConfirmDialog from "./ConfirmDialog";
import { useCarrito } from "@/contexts/CarritoContext";

interface AddressListProps {
  direcciones: AddressItem[];
  maxDirecciones?: number;
  onRefresh: () => Promise<void>;
}

export default function AddressList({
  direcciones,
  maxDirecciones = 10,
  onRefresh,
}: AddressListProps) {
  const { showToast } = useCarrito();
  const formSectionRef = useRef<HTMLDivElement>(null);

  const [editingAddress, setEditingAddress] = useState<AddressItem | null>(null);
  const [addressToDelete, setAddressToDelete] = useState<AddressItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAtLimit = direcciones.length >= maxDirecciones;

  const handleEditClick = (dir: AddressItem) => {
    setEditingAddress(dir);
    // Scroll suave hacia el formulario
    setTimeout(() => {
      formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleCancelEdit = () => {
    setEditingAddress(null);
  };

  const handleSetDefault = async (dir: AddressItem) => {
    try {
      const res = await fetch(`/api/direcciones/${dir.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ predeterminada: true }),
      });

      const data = await res.json();
      if (!res.ok || !data.exito) {
        showToast({
          message: data.error || "No se pudo actualizar la dirección predeterminada.",
          type: "error",
        });
        return;
      }

      showToast({
        message: `La dirección "${dir.alias}" ahora es la predeterminada.`,
        type: "success",
      });
      await onRefresh();
    } catch {
      showToast({ message: "Error al actualizar dirección.", type: "error" });
    }
  };

  const handleConfirmDelete = async () => {
    if (!addressToDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/direcciones/${addressToDelete.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.exito) {
        showToast({
          message: data.error || "No se pudo eliminar la dirección.",
          type: "error",
        });
        return;
      }

      showToast({
        message: `Dirección "${addressToDelete.alias}" eliminada.`,
        type: "info",
      });

      if (editingAddress?.id === addressToDelete.id) {
        setEditingAddress(null);
      }

      setAddressToDelete(null);
      await onRefresh();
    } catch {
      showToast({ message: "Error de conexión al eliminar dirección.", type: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFormSuccess = async () => {
    const eraEdicion = Boolean(editingAddress);
    setEditingAddress(null);
    await onRefresh();

    showToast({
      message: eraEdicion
        ? "Dirección actualizada correctamente."
        : "Nueva dirección guardada.",
      type: "success",
    });
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200 shadow-xs flex flex-col justify-between">
      <div>
        {/* Cabecera de la sección */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FAF3F6] text-[#5B122C] flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-medium text-stone-900">
                Direcciones de envío
              </h2>
              <span className="text-xs text-stone-400 font-light block">
                {direcciones.length} de {maxDirecciones} guardadas
              </span>
            </div>
          </div>
        </div>

        {/* Lista de direcciones */}
        {direcciones.length === 0 ? (
          <div className="p-6 rounded-2xl bg-stone-50 border border-stone-200/70 text-center text-xs text-stone-500 mb-6">
            <p className="font-medium text-stone-700 mb-1">Aún no tienes direcciones guardadas</p>
            <p>Agrega tu domicilio habitual para agilizar tus envíos.</p>
          </div>
        ) : (
          <div className="space-y-3.5 mb-7">
            {direcciones.map((dir) => (
              <AddressCard
                key={dir.id}
                direccion={dir}
                isEditing={editingAddress?.id === dir.id}
                onEdit={handleEditClick}
                onDelete={(d) => setAddressToDelete(d)}
                onSetDefault={handleSetDefault}
              />
            ))}
          </div>
        )}

        {/* Separador y Formulario */}
        <div ref={formSectionRef} className="pt-6 border-t border-stone-200">
          <div className="mb-4">
            <h3 className="font-serif text-base font-medium text-stone-900">
              {editingAddress ? `Editar dirección: ${editingAddress.alias}` : "Agregar dirección"}
            </h3>
            <p className="text-xs text-stone-500 font-light">
              {editingAddress
                ? "Modifica los campos necesarios y guarda los cambios."
                : "Se guardará en tu cuenta para tus compras web y en la app."}
            </p>
          </div>

          {isAtLimit && !editingAddress ? (
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs text-stone-600 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-stone-800">Llegaste al máximo de direcciones</p>
                <p className="text-stone-500 font-light mt-0.5">
                  Tienes {maxDirecciones} de {maxDirecciones} direcciones permitidas. Elimina una para poder agregar otra nueva.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-[#FDFBF9] p-4 sm:p-5 rounded-2xl border border-stone-200/70">
              <AddressForm
                key={editingAddress ? `edit-${editingAddress.id}` : "new"}
                isEditing={Boolean(editingAddress)}
                direccionId={editingAddress?.id}
                initialValues={
                  editingAddress
                    ? {
                        alias: editingAddress.alias,
                        calle_y_numero: editingAddress.calle_y_numero,
                        numero_interior: editingAddress.numero_interior,
                        colonia: editingAddress.colonia,
                        codigo_postal: editingAddress.codigo_postal,
                        ciudad: editingAddress.ciudad,
                        estado: editingAddress.estado,
                        referencias: editingAddress.referencias,
                        predeterminada: editingAddress.predeterminada,
                      }
                    : {
                        alias: "Casa",
                        ciudad: "Aguascalientes",
                        estado: "Ags.",
                        predeterminada: direcciones.length === 0,
                      }
                }
                onCancel={editingAddress ? handleCancelEdit : undefined}
                onSuccess={handleFormSuccess}
              />
            </div>
          )}
        </div>
      </div>

      {/* Diálogo de Confirmación para Eliminar Dirección */}
      <ConfirmDialog
        isOpen={Boolean(addressToDelete)}
        title={`¿Eliminar dirección "${addressToDelete?.alias}"?`}
        description={
          addressToDelete?.predeterminada
            ? "Esta dirección es tu predeterminada. Si la eliminas, la dirección más reciente pasará a ser la nueva predeterminada."
            : "Esta acción no se puede deshacer. Tus pedidos anteriores conservarán su propia copia de la dirección."
        }
        confirmText="Eliminar dirección"
        cancelText="Conservar"
        isDestructive
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setAddressToDelete(null)}
      />
    </div>
  );
}

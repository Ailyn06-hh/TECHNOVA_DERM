"use client";

import React, { useState } from "react";
import { Store, Truck, Check } from "lucide-react";
import StorePickupSelector from "./StorePickupSelector";
import AddressModal from "./AddressModal";
import AddressForm, { type DireccionGuardada } from "./AddressForm";
import type { SucursalCalculada } from "./StoreSelectModal";
import { formatearPrecio } from "@/lib/formato";

export interface DeliveryOptionsProps {
  tipoEntrega: "recoger" | "envio";
  onChangeTipoEntrega: (tipo: "recoger" | "envio") => void;
  sucursales: SucursalCalculada[];
  selectedStore: SucursalCalculada | null;
  onSelectStore: (sucursal: SucursalCalculada) => void;
  direcciones: DireccionGuardada[];
  selectedAddress: DireccionGuardada | null;
  onSelectAddress: (dir: DireccionGuardada) => void;
  onAddressCreated: (dir: DireccionGuardada) => void;
  costoEnvio: number;
  tieneEnvioGratis: boolean;
  totalProductos: number;
}

export default function DeliveryOptions({
  tipoEntrega,
  onChangeTipoEntrega,
  sucursales,
  selectedStore,
  onSelectStore,
  direcciones,
  selectedAddress,
  onSelectAddress,
  onAddressCreated,
  costoEnvio,
  tieneEnvioGratis,
  totalProductos,
}: DeliveryOptionsProps) {
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  // Verificar si al menos una sucursal tiene todos los productos
  const haySucursalConTodo = sucursales.some((s) => s.tieneTodo);

  // Calcular fecha estimada de entrega (2 a 3 días hábiles, excluyendo sábados y domingos)
  const getFechaEstimadaEnvio = () => {
    const d = new Date();
    let businessDaysAdded = 0;
    while (businessDaysAdded < 3) {
      d.setDate(d.getDate() + 1);
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        businessDaysAdded++;
      }
    }
    const meses = [
      "ene", "feb", "mar", "abr", "may", "jun",
      "jul", "ago", "sep", "oct", "nov", "dic"
    ];
    return `${d.getDate()} de ${meses[d.getMonth()]}`;
  };

  const fechaEntrega = getFechaEstimadaEnvio();

  return (
    <section aria-labelledby="delivery-heading" className="space-y-4">
      <h2
        id="delivery-heading"
        className="font-serif text-2xl font-medium text-slate-900 tracking-tight"
      >
        ¿Cómo quieres recibirlo?
      </h2>

      <div role="radiogroup" aria-label="Opciones de entrega" className="space-y-4">
        {/* ========================================================================= */}
        {/* OPCIÓN 1: RECOGER EN TIENDA */}
        {/* ========================================================================= */}
        <div
          onClick={() => {
            if (haySucursalConTodo) {
              onChangeTipoEntrega("recoger");
            }
          }}
          className={`p-5 rounded-3xl border-2 transition-all ${
            !haySucursalConTodo
              ? "bg-slate-50 border-slate-200/60 opacity-60 cursor-not-allowed"
              : tipoEntrega === "recoger"
              ? "bg-white border-[#6B1F4A] shadow-xs cursor-pointer"
              : "bg-white border-slate-200/80 hover:border-slate-300 cursor-pointer"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              {/* Radio Custom */}
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                  tipoEntrega === "recoger"
                    ? "border-[#6B1F4A] bg-[#6B1F4A]"
                    : "border-slate-300 bg-white"
                }`}
              >
                {tipoEntrega === "recoger" && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-slate-700" />
                  <span className="font-serif text-base font-medium text-slate-900">
                    Recoger en tienda
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-light mt-0.5">
                  Listo {selectedStore?.puedeRecogerHoy ? "hoy" : "mañana"}. Te avisamos por WhatsApp cuando puedas pasar.
                </p>
                {!haySucursalConTodo && (
                  <p className="text-[11px] text-rose-600 font-normal mt-1">
                    Ninguna sucursal cuenta con todas tus fórmulas en existencias físicas simultáneas.
                  </p>
                )}
              </div>
            </div>

            <span className="font-semibold text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full shrink-0">
              Gratis
            </span>
          </div>

          {/* Desplegable de tienda cuando está seleccionado */}
          {tipoEntrega === "recoger" && haySucursalConTodo && (
            <StorePickupSelector
              sucursales={sucursales}
              selectedStore={selectedStore}
              onSelectStore={onSelectStore}
              totalProductos={totalProductos}
            />
          )}
        </div>

        {/* ========================================================================= */}
        {/* OPCIÓN 2: ENVÍO A DOMICILIO */}
        {/* ========================================================================= */}
        <div
          onClick={() => onChangeTipoEntrega("envio")}
          className={`p-5 rounded-3xl border-2 transition-all ${
            tipoEntrega === "envio"
              ? "bg-white border-[#6B1F4A] shadow-xs cursor-pointer"
              : "bg-white border-slate-200/80 hover:border-slate-300 cursor-pointer"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              {/* Radio Custom */}
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                  tipoEntrega === "envio"
                    ? "border-[#6B1F4A] bg-[#6B1F4A]"
                    : "border-slate-300 bg-white"
                }`}
              >
                {tipoEntrega === "envio" && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-slate-700" />
                  <span className="font-serif text-base font-medium text-slate-900">
                    Envío a domicilio
                  </span>
                </div>

                {selectedAddress ? (
                  <p className="text-xs text-slate-600 font-light mt-0.5 leading-snug">
                    Llega en 2 a 3 días hábiles (aprox. {fechaEntrega}) a{" "}
                    <strong className="font-medium text-slate-800">
                      {selectedAddress.calle} #{selectedAddress.numero_exterior}, {selectedAddress.ciudad}
                    </strong>.
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsAddressModalOpen(true);
                      }}
                      className="ml-2 font-semibold text-[#6B1F4A] hover:underline underline-offset-2"
                    >
                      Cambiar
                    </button>
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 font-light mt-0.5">
                    Llega en 2 a 3 días hábiles a tu domicilio.
                  </p>
                )}
              </div>
            </div>

            <span className={`font-semibold text-xs px-2.5 py-1 rounded-full shrink-0 ${
              tieneEnvioGratis || costoEnvio === 0
                ? "text-emerald-700 bg-emerald-50"
                : "text-slate-800 bg-slate-100"
            }`}>
              {tieneEnvioGratis || costoEnvio === 0 ? "Gratis" : formatearPrecio(costoEnvio)}
            </span>
          </div>

          {/* Formulario embebido si el usuario no tiene ninguna dirección guardada */}
          {tipoEntrega === "envio" && direcciones.length === 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 bg-[#FAF9F6] p-4 sm:p-5 rounded-2xl">
              <h3 className="font-serif text-sm font-semibold text-slate-900 mb-3">
                Ingresa tu dirección de entrega
              </h3>
              <AddressForm
                onSuccess={(nueva) => {
                  onAddressCreated(nueva);
                  onSelectAddress(nueva);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal de gestión y selección de direcciones */}
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        direcciones={direcciones}
        selectedId={selectedAddress ? selectedAddress.id : null}
        onSelectAddress={onSelectAddress}
        onAddressCreated={onAddressCreated}
      />
    </section>
  );
}

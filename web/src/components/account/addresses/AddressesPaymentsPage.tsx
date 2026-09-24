"use client";

import React, { useState, useCallback } from "react";
import AddressList from "./AddressList";
import PaymentMethodList from "./PaymentMethodList";
import { AddressItem } from "./AddressCard";
import { CardItem } from "./PaymentMethodCard";

export interface AddressesPaymentsData {
  direcciones: AddressItem[];
  tarjetas: CardItem[];
  cuentasVinculadas: Record<string, { conectado: boolean; cuentaMascara?: string }>;
  limites?: {
    maxDirecciones: number;
    maxTarjetas: number;
  };
}

interface AddressesPaymentsPageProps {
  initialData: AddressesPaymentsData;
}

export default function AddressesPaymentsPage({
  initialData,
}: AddressesPaymentsPageProps) {
  const [data, setData] = useState<AddressesPaymentsData>(initialData);

  const refreshData = useCallback(async () => {
    try {
      const res = await fetch("/api/cuenta/direcciones-pagos");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("[REFRESH ERROR]:", err);
    }
  }, []);

  return (
    <div className="w-full">
      {/* Cabecera principal */}
      <div className="mb-8 pb-4 border-b border-stone-200">
        <h1 className="font-serif text-2xl sm:text-3xl font-medium text-stone-900 tracking-tight">
          Direcciones y métodos de pago
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 font-light mt-1">
          Guárdalas una vez y paga más rápido en la web y en la app.
        </p>
      </div>

      {/* Dos tarjetas blancas lado a lado */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Izquierda: Direcciones de envío */}
        <AddressList
          direcciones={data.direcciones || []}
          maxDirecciones={data.limites?.maxDirecciones || 10}
          onRefresh={refreshData}
        />

        {/* Derecha: Métodos de pago */}
        <PaymentMethodList
          tarjetas={data.tarjetas || []}
          cuentasVinculadas={data.cuentasVinculadas || {}}
          maxTarjetas={data.limites?.maxTarjetas || 5}
          onRefresh={refreshData}
        />
      </div>
    </div>
  );
}

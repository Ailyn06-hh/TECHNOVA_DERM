"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import DeliveryOptions from "./DeliveryOptions";
import PaymentMethods, { type MetodoPagoTipo } from "./PaymentMethods";
import CheckoutSummary from "./CheckoutSummary";
import type { SucursalCalculada } from "./StoreSelectModal";
import type { DireccionGuardada } from "./AddressForm";
import type { MetodoPagoGuardado } from "./SavedCardList";
import type { NewCardData } from "./NewCardForm";
import type { CarritoCalculado } from "@/lib/carrito";
import { useCarrito } from "@/contexts/CarritoContext";

export interface CheckoutPageClientProps {
  initialCarrito: CarritoCalculado;
  initialSucursales: SucursalCalculada[];
  initialDirecciones: DireccionGuardada[];
  initialMetodosPago: MetodoPagoGuardado[];
  sucursalPreferidaId?: number | null;
  cuentaMascaraMP?: string;
}

export default function CheckoutPageClient({
  initialCarrito,
  initialSucursales,
  initialDirecciones,
  initialMetodosPago,
  sucursalPreferidaId,
  cuentaMascaraMP,
}: CheckoutPageClientProps) {
  const router = useRouter();
  const { refreshCart } = useCarrito();

  // 1. Clave de idempotencia única por carga de página
  const [claveIdempotencia, setClaveIdempotencia] = useState("");
  useEffect(() => {
    setClaveIdempotencia(crypto.randomUUID());
  }, []);

  // 2. Selección inicial de sucursal
  const sucursalDefault =
    initialSucursales.find((s) => s.id === sucursalPreferidaId && s.tieneTodo) ||
    initialSucursales.find((s) => s.tieneTodo) ||
    initialSucursales[0] ||
    null;

  // 3. Selección inicial de tipo de entrega
  // Si la sucursal preferida tiene todo -> Recoger; si no -> Envío a domicilio
  const tipoEntregaInicial =
    sucursalDefault && sucursalDefault.tieneTodo ? "recoger" : "envio";

  const [tipoEntrega, setTipoEntrega] = useState<"recoger" | "envio">(tipoEntregaInicial);
  const [sucursales, setSucursales] = useState<SucursalCalculada[]>(initialSucursales);
  const [selectedStore, setSelectedStore] = useState<SucursalCalculada | null>(sucursalDefault);

  // 4. Direcciones
  const [direcciones, setDirecciones] = useState<DireccionGuardada[]>(initialDirecciones);
  const direccionDefault =
    initialDirecciones.find((d) => Boolean(d.predeterminada)) ||
    initialDirecciones[0] ||
    null;
  const [selectedAddress, setSelectedAddress] = useState<DireccionGuardada | null>(direccionDefault);

  // 5. Métodos de pago
  const [metodosGuardados, setMetodosGuardados] = useState<MetodoPagoGuardado[]>(initialMetodosPago);
  const [metodoPago, setMetodoPago] = useState<MetodoPagoTipo>("tarjeta");

  const tarjetaDefault = initialMetodosPago.find((m) => Boolean(m.predeterminado))?.id;
  const [selectedCardId, setSelectedCardId] = useState<number | "nueva">(
    tarjetaDefault || (initialMetodosPago.length > 0 ? initialMetodosPago[0].id : "nueva")
  );
  const [newCardData, setNewCardData] = useState<NewCardData | null>(null);

  // 6. Resumen de compra recalculado
  const [resumen, setResumen] = useState({
    items: initialCarrito.items,
    grupos: initialCarrito.grupos,
    subtotal: initialCarrito.subtotal,
    totalDescuentos: initialCarrito.totalDescuentos,
    lineasDescuento: initialCarrito.lineasDescuento,
    costoEnvio: tipoEntregaInicial === "recoger" ? 0 : 99,
    lineaEntrega:
      tipoEntregaInicial === "recoger"
        ? "Recoger en tienda · Gratis"
        : initialCarrito.tieneEnvioGratis
        ? "Envío a domicilio · Gratis"
        : "Envío a domicilio · $99",
    total: initialCarrito.total,
    hayAgotados: initialCarrito.hayAgotados,
    hayInsuficientes: initialCarrito.hayInsuficientes,
    tieneArticulos: initialCarrito.tieneArticulos,
    sucursalTieneTodo: sucursalDefault?.tieneTodo ?? false,
  });

  // 7. Estados de procesamiento y error
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Advertencia de navegador si el usuario intenta cerrar mientras procesa pago
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isProcessing) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isProcessing]);

  // Recalcular resumen en el servidor cuando cambia entrega o sucursal
  const recalcularResumen = useCallback(
    async (nuevaEntrega: "recoger" | "envio", storeId?: number, addrId?: number) => {
      try {
        const res = await fetch("/api/checkout/resumen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tipo_entrega: nuevaEntrega,
            sucursal_id: storeId,
            direccion_id: addrId,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setResumen((prev) => ({
            ...prev,
            items: data.items,
            grupos: data.grupos,
            subtotal: data.subtotal,
            totalDescuentos: data.totalDescuentos,
            lineasDescuento: data.lineasDescuento,
            costoEnvio: data.costoEnvio,
            lineaEntrega: data.lineaEntrega,
            total: data.total,
            sucursalTieneTodo: data.sucursalTieneTodo,
          }));
        }
      } catch (err) {
        console.error("Error al recalcular resumen:", err);
      }
    },
    []
  );

  const handleTipoEntregaChange = (tipo: "recoger" | "envio") => {
    setTipoEntrega(tipo);
    setErrorMessage(null);
    if (tipo === "envio" && metodoPago === "pagar_en_tienda") {
      setMetodoPago("tarjeta");
    }
    recalcularResumen(tipo, selectedStore?.id, selectedAddress?.id);
  };

  const handleSelectStore = async (suc: SucursalCalculada) => {
    setSelectedStore(suc);
    setErrorMessage(null);
    try {
      await fetch("/api/sucursales/preferida", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sucursal_id: suc.id }),
      });
    } catch {}
    recalcularResumen(tipoEntrega, suc.id, selectedAddress?.id);
  };

  const handleSelectAddress = (dir: DireccionGuardada) => {
    setSelectedAddress(dir);
    setErrorMessage(null);
    recalcularResumen(tipoEntrega, selectedStore?.id, dir.id);
  };

  const handleAddressCreated = (nueva: DireccionGuardada) => {
    setDirecciones((prev) => [nueva, ...prev]);
    setSelectedAddress(nueva);
    recalcularResumen(tipoEntrega, selectedStore?.id, nueva.id);
  };

  // Validar si el usuario puede proceder al cobro
  const canPay = (() => {
    if (isProcessing) return false;
    if (resumen.hayAgotados || resumen.hayInsuficientes || !resumen.tieneArticulos) return false;

    if (tipoEntrega === "recoger") {
      if (!selectedStore || !selectedStore.tieneTodo) return false;
    } else {
      if (!selectedAddress) return false;
    }

    if (metodoPago === "tarjeta") {
      if (selectedCardId === "nueva") {
        return Boolean(newCardData?.valida);
      }
      return Boolean(selectedCardId);
    }

    return true;
  })();

  // Ejecución de pago
  const handlePay = async () => {
    if (!canPay || isProcessing) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const payload = {
        tipo_entrega: tipoEntrega,
        sucursal_id: tipoEntrega === "recoger" ? selectedStore?.id : undefined,
        direccion_id: tipoEntrega === "envio" ? selectedAddress?.id : undefined,
        metodo: metodoPago,
        id_tarjeta_guardada: selectedCardId !== "nueva" ? selectedCardId : undefined,
        token_tarjeta: selectedCardId === "nueva" ? newCardData?.token : undefined,
        datos_tarjeta_nueva:
          selectedCardId === "nueva" && newCardData
            ? {
                marca: newCardData.marca,
                ultimos4: newCardData.ultimos4,
                titular: newCardData.titular,
                mesVencimiento: newCardData.mesVencimiento,
                anioVencimiento: newCardData.anioVencimiento,
              }
            : undefined,
        guardar_tarjeta: selectedCardId === "nueva" ? Boolean(newCardData?.guardar) : false,
        total_visto: resumen.total,
        clave_idempotencia: claveIdempotencia,
      };

      const res = await fetch("/api/checkout/pagar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      // Detección de cambio de precio
      if (res.status === 409 || data.motivo === "total_cambiado") {
        setErrorMessage(data.mensaje || "Tu total cambió. Revisa los nuevos montos antes de pagar.");
        if (data.nuevoTotal) {
          setResumen((prev) => ({ ...prev, total: data.nuevoTotal }));
        }
        // Regenerar clave de idempotencia para permitir nuevo cobro con el total actualizado
        setClaveIdempotencia(crypto.randomUUID());
        return;
      }

      if (!res.ok || !data.exito) {
        setErrorMessage(data.mensaje || data.error || "Ocurrió un error al procesar el pago.");
        return;
      }

      // Éxito: Si es Mercado Pago con Checkout Pro (redirección)
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }

      // Éxito: Pedido completado o apartado
      await refreshCart();
      router.push(`/checkout/confirmacion/${data.folio}`);
    } catch {
      setErrorMessage("Error de conexión al procesar el pago. Por favor intenta de nuevo.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNewCardChange = useCallback((c: NewCardData | null) => {
    setNewCardData(c);
    setErrorMessage(null);
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Columna Izquierda: Opciones de Entrega y Pago (7 columnas) */}
        <div className="lg:col-span-7 space-y-8">
          {/* Bloque 1: ¿Cómo quieres recibirlo? */}
          <DeliveryOptions
            tipoEntrega={tipoEntrega}
            onChangeTipoEntrega={handleTipoEntregaChange}
            sucursales={sucursales}
            selectedStore={selectedStore}
            onSelectStore={handleSelectStore}
            direcciones={direcciones}
            selectedAddress={selectedAddress}
            onSelectAddress={handleSelectAddress}
            onAddressCreated={handleAddressCreated}
            costoEnvio={resumen.costoEnvio}
            tieneEnvioGratis={resumen.costoEnvio === 0}
            totalProductos={resumen.items.length}
          />

          {/* Bloque 2: Pago */}
          <PaymentMethods
            metodoSeleccionado={metodoPago}
            onSelectMetodo={(m) => {
              setMetodoPago(m);
              setErrorMessage(null);
            }}
            tipoEntrega={tipoEntrega}
            metodosGuardados={metodosGuardados}
            selectedCardId={selectedCardId}
            onSelectCardId={(id) => {
              setSelectedCardId(id);
              setErrorMessage(null);
            }}
            onNewCardChange={handleNewCardChange}
            cuentaMascaraMP={cuentaMascaraMP}
          />
        </div>

        {/* Columna Derecha: Resumen Sticky (5 columnas) */}
        <div className="lg:col-span-5">
          <CheckoutSummary
            items={resumen.items}
            subtotal={resumen.subtotal}
            lineasDescuento={resumen.lineasDescuento}
            costoEnvio={resumen.costoEnvio}
            lineaEntrega={resumen.lineaEntrega}
            total={resumen.total}
            isPagarEnTienda={metodoPago === "pagar_en_tienda"}
            isProcessing={isProcessing}
            errorMessage={errorMessage}
            onPay={handlePay}
            canPay={canPay}
          />
        </div>
      </div>
    </div>
  );
}

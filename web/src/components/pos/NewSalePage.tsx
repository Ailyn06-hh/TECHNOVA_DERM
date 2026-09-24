"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import ScanSearchInput from "./ScanSearchInput";
import CategoryPills, { CategoryPillItem } from "./CategoryPills";
import PosProductGrid from "./PosProductGrid";
import SaleTicket from "./SaleTicket";
import CustomerSearchModal from "./CustomerSearchModal";
import CashPaymentModal from "./CashPaymentModal";
import CardTerminalModal from "./CardTerminalModal";
import MixedPaymentModal from "./MixedPaymentModal";
import TransferPaymentModal from "./TransferPaymentModal";
import type { PosSessionData } from "@/lib/pos-session";
import type { PosTicket, PosClientaInfo } from "@/lib/pos/ventas";
import type { PosProductData } from "./PosProductCard";
import type { MetodoPagoPos } from "./PaymentMethodSelector";
import type { ReciboVentaData } from "./PrintableReceipt";
import { HelpCircle, AlertTriangle, X } from "lucide-react";

interface NewSalePageProps {
  session: PosSessionData;
}

export default function NewSalePage({ session }: NewSalePageProps) {
  // Estado del ticket
  const [ticket, setTicket] = useState<PosTicket | null>(null);
  const [completedReceipt, setCompletedReceipt] = useState<ReciboVentaData | null>(null);
  const [highlightedItemId, setHighlightedItemId] = useState<number | null>(null);

  // Estado del catálogo y filtros
  const [products, setProducts] = useState<PosProductData[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(true);
  const [isLoadingAction, setIsLoadingAction] = useState<boolean>(false);

  // Modales
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isMixedModalOpen, setIsMixedModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isHelpShortcutsOpen, setIsHelpShortcutsOpen] = useState(false);

  // Notificación flotante de advertencia (ej. "Solo hay N en tienda")
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Método de pago y opciones
  const [selectedMetodo, setSelectedMetodo] = useState<MetodoPagoPos>("efectivo");
  const [sendWhatsApp, setSendWhatsApp] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Pestañas oficiales según mockup
  const categoriesList: CategoryPillItem[] = [
    { id: "todos", label: "Todos" },
    { id: "limpieza", label: "Limpieza" },
    { id: "serum", label: "Sérums" },
    { id: "hidratacion", label: "Hidratación" },
    { id: "proteccion-solar", label: "Protección solar" },
    { id: "combos", label: "Combos" },
  ];

  // Helper para mantener el foco en el escáner
  const focusScanner = useCallback(() => {
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 60);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // 1. Cargar ticket actual del turno al iniciar
  const fetchCurrentTicket = useCallback(async () => {
    try {
      const res = await fetch("/api/pos/ventas/actual");
      if (res.ok) {
        const data = await res.json();
        if (data.ticket) {
          setTicket(data.ticket);
        }
      }
    } catch (err) {
      console.error("Error al cargar ticket:", err);
    }
  }, []);

  // 2. Cargar catálogo de productos según filtros
  const fetchProducts = useCallback(async (cat: string, q: string) => {
    try {
      setIsLoadingCatalog(true);
      const params = new URLSearchParams();
      if (cat) params.set("categoria", cat);
      if (q) params.set("q", q);

      const res = await fetch(`/api/pos/productos?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (cat === "combos") {
          setProducts(data.combos || []);
        } else {
          setProducts(data.productos || []);
        }
      }
    } catch (err) {
      console.error("Error al cargar productos:", err);
    } finally {
      setIsLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentTicket();
  }, [fetchCurrentTicket]);

  // Cargar productos al cambiar categoría o búsqueda
  useEffect(() => {
    fetchProducts(selectedCategory, searchQuery);
  }, [selectedCategory, searchQuery, fetchProducts]);

  // Refrescar inventario de la cuadrícula cada 20 segundos (porque también se vende en línea)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchProducts(selectedCategory, searchQuery);
    }, 20000);
    return () => clearInterval(interval);
  }, [selectedCategory, searchQuery, fetchProducts]);

  // 3. Agregar producto individual o combo
  const handleAddProduct = async (prod: PosProductData) => {
    if (!ticket) return;
    setIsLoadingAction(true);

    try {
      const isCombo = prod.tipoItem === "combo";
      const res = await fetch(`/api/pos/ventas/${ticket.id}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isCombo
            ? { accion: "agregar_combo", combo_id: prod.id }
            : { accion: "agregar", producto_id: prod.id, cantidad: 1 }
        ),
      });

      const data = await res.json();
      if (!res.ok || !data.exito) {
        showToast(data.error || "No se pudo agregar el producto.");
        return;
      }

      setTicket(data.ticket);
      // Destello en el último item modificado
      const ultimo = data.ticket.items[data.ticket.items.length - 1];
      if (ultimo) {
        setHighlightedItemId(ultimo.id);
        setTimeout(() => setHighlightedItemId(null), 800);
      }
    } catch {
      showToast("Error de conexión al agregar producto.");
    } finally {
      setIsLoadingAction(false);
      focusScanner();
    }
  };

  // 4. Escaneo por código de barras o SKU exacto
  const handleBarcodeScan = async (code: string): Promise<boolean> => {
    if (!ticket) return false;

    // Buscar en catálogo si el código coincide exactamente con código_barras o SKU
    try {
      const res = await fetch(`/api/pos/productos?q=${encodeURIComponent(code)}`);
      if (!res.ok) return false;
      const data = await res.json();
      const matched = (data.productos || []).find(
        (p: any) =>
          String(p.codigo_barras || "").trim() === code.trim() ||
          String(p.sku || "").toUpperCase().trim() === code.toUpperCase().trim()
      );

      if (!matched) {
        return false;
      }

      await handleAddProduct(matched);
      return true;
    } catch {
      return false;
    }
  };

  // 5. Actualizar cantidad de un artículo (+ / -)
  const handleUpdateQty = async (itemId: number, delta: number) => {
    if (!ticket) return;
    setIsLoadingAction(true);

    try {
      const res = await fetch(`/api/pos/ventas/${ticket.id}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: itemId, delta }),
      });

      const data = await res.json();
      if (!res.ok || !data.exito) {
        showToast(data.error || "No se pudo actualizar la cantidad.");
        return;
      }

      setTicket(data.ticket);
    } catch {
      showToast("Error de conexión al actualizar cantidad.");
    } finally {
      setIsLoadingAction(false);
      focusScanner();
    }
  };

  // 6. Quitar artículo del ticket
  const handleRemoveItem = async (itemId: number) => {
    if (!ticket) return;
    setIsLoadingAction(true);

    try {
      const res = await fetch(`/api/pos/ventas/${ticket.id}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "quitar", item_id: itemId }),
      });

      const data = await res.json();
      if (!res.ok || !data.exito) {
        showToast(data.error || "No se pudo quitar el artículo.");
        return;
      }

      setTicket(data.ticket);
    } catch {
      showToast("Error de conexión al quitar artículo.");
    } finally {
      setIsLoadingAction(false);
      focusScanner();
    }
  };

  // 7. Asignar o quitar clienta
  const handleSelectCustomer = async (clienta: PosClientaInfo | null) => {
    if (!ticket) return;
    setIsLoadingAction(true);

    try {
      const res = await fetch(`/api/pos/ventas/${ticket.id}/cliente`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario_id: clienta?.id || null }),
      });

      const data = await res.json();
      if (!res.ok || !data.exito) {
        showToast(data.error || "No se pudo asignar la clienta.");
        return;
      }

      setTicket(data.ticket);
    } catch {
      showToast("Error de conexión al asignar clienta.");
    } finally {
      setIsLoadingAction(false);
      focusScanner();
    }
  };

  // 8. Descartar venta actual (Cancelar venta)
  const handleDiscardDraft = async () => {
    if (!ticket) return;
    setIsLoadingAction(true);

    try {
      const res = await fetch(`/api/pos/ventas/${ticket.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.exito) {
        showToast(data.error || "No se pudo cancelar la venta.");
        return;
      }

      setTicket(data.ticket);
      showToast("Venta cancelada. Nueva venta lista.");
    } catch {
      showToast("Error al cancelar la venta.");
    } finally {
      setIsLoadingAction(false);
      focusScanner();
    }
  };

  // 9. Abrir modal correspondiente al método de pago
  const handleOpenCheckoutModal = () => {
    if (!ticket || ticket.items.length === 0) return;

    if (selectedMetodo === "efectivo") {
      setIsCashModalOpen(true);
    } else if (selectedMetodo === "tarjeta_terminal") {
      setIsCardModalOpen(true);
    } else if (selectedMetodo === "transferencia") {
      setIsTransferModalOpen(true);
    } else if (selectedMetodo === "mixto") {
      setIsMixedModalOpen(true);
    }
  };

  // 10. Confirmar cobro (transacción con clave de idempotencia)
  const executeCobro = async (payload: {
    metodo_pago: MetodoPagoPos;
    efectivo_recibido?: number;
    autorizacion_terminal?: string;
    referencia_transferencia?: string;
    monto_efectivo?: number;
    monto_tarjeta?: number;
  }) => {
    if (!ticket) return;
    setIsLoadingAction(true);

    const claveIdempotencia = `pos_cobro_${ticket.id}_${Date.now()}`;

    try {
      const res = await fetch(`/api/pos/ventas/${ticket.id}/cobrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          clave_idempotencia: claveIdempotencia,
          enviar_whatsapp: sendWhatsApp,
          whatsapp_celular: ticket.clienta?.celular || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.exito) {
        showToast(data.error || "Error al procesar el cobro.");
        return;
      }

      // Cerrar modales de pago
      setIsCashModalOpen(false);
      setIsCardModalOpen(false);
      setIsMixedModalOpen(false);
      setIsTransferModalOpen(false);

      // Desplegar pantalla de venta cobrada
      setCompletedReceipt(data.recibo);
    } catch {
      showToast("Error de conexión al cobrar la venta.");
    } finally {
      setIsLoadingAction(false);
    }
  };

  // 11. Iniciar siguiente venta tras cobro
  const handleStartNewSale = async () => {
    setCompletedReceipt(null);
    setIsLoadingAction(true);

    try {
      const res = await fetch("/api/pos/ventas", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.ticket) {
          setTicket(data.ticket);
        }
      } else {
        await fetchCurrentTicket();
      }
    } catch {
      await fetchCurrentTicket();
    } finally {
      setIsLoadingAction(false);
      focusScanner();
    }
  };

  // Atajos de teclado: F2 (escáner), F4 (cobrar), F8 (clienta), Esc (cerrar)
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // F2: Enfocar escáner
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // F4: Cobrar
      if (e.key === "F4") {
        e.preventDefault();
        if (ticket && ticket.items.length > 0 && !completedReceipt) {
          handleOpenCheckoutModal();
        }
        return;
      }

      // F8: Asignar clienta
      if (e.key === "F8") {
        e.preventDefault();
        if (!completedReceipt) {
          setIsCustomerModalOpen(true);
        }
        return;
      }
    };

    window.addEventListener("keydown", handleGlobalShortcuts);
    return () => window.removeEventListener("keydown", handleGlobalShortcuts);
  });

  const sucursalSimple = session.sucursalNombre || "Centro";

  return (
    <div className="flex-1 flex overflow-hidden w-full h-full relative">
      {/* Toast Flotante de Advertencia */}
      {toastMessage && (
        <div
          role="alert"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-stone-700/60 flex items-center gap-2.5 text-xs font-medium animate-scale-in"
        >
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 text-stone-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Zona Central: Catálogo, Búsqueda y Pestañas (Fondo Crema) */}
      <div className="flex-1 flex flex-col p-6 sm:p-8 overflow-y-auto no-scrollbar">
        {/* Encabezado Principal */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-serif text-3xl font-medium text-stone-900 tracking-tight">
              Nueva venta
            </h1>
            <p className="text-xs text-stone-500 font-light mt-0.5">
              Escanea o busca productos. El stock es el mismo que ve la tienda en línea.
            </p>
          </div>

          {/* Botón de Ayuda de Atajos de Teclado */}
          <button
            type="button"
            onClick={() => setIsHelpShortcutsOpen(true)}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 transition-colors"
            title="Ver atajos de teclado"
            aria-label="Ver atajos de teclado"
          >
            <HelpCircle className="w-5 h-5 stroke-[1.7]" />
          </button>
        </div>

        {/* Campo de Escaneo y Búsqueda */}
        <div className="mb-4">
          <ScanSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            onBarcodeScan={handleBarcodeScan}
            disabled={isLoadingAction}
            inputRef={searchInputRef}
          />
        </div>

        {/* Pestañas Tipo Píldora de Categorías */}
        <div className="mb-5">
          <CategoryPills
            categories={categoriesList}
            selectedCategory={selectedCategory}
            onSelectCategory={(catId) => {
              setSelectedCategory(catId);
              focusScanner();
            }}
          />
        </div>

        {/* Cuadrícula de 4 Columnas de Productos */}
        <div className="flex-1">
          <PosProductGrid
            products={products}
            onAddProduct={handleAddProduct}
            isLoading={isLoadingCatalog}
          />
        </div>
      </div>

      {/* Panel Derecho: Ticket de Venta */}
      <SaleTicket
        ticket={ticket}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onOpenCustomerSearch={() => setIsCustomerModalOpen(true)}
        onRemoveCustomer={() => handleSelectCustomer(null)}
        onDiscardDraft={handleDiscardDraft}
        selectedMetodo={selectedMetodo}
        onSelectMetodo={setSelectedMetodo}
        sendWhatsApp={sendWhatsApp}
        onToggleWhatsApp={setSendWhatsApp}
        onOpenCheckoutModal={handleOpenCheckoutModal}
        completedReceipt={completedReceipt}
        onStartNewSale={handleStartNewSale}
        highlightedItemId={highlightedItemId}
        isLoading={isLoadingAction}
      />

      {/* Modales de Interacción */}
      <CustomerSearchModal
        isOpen={isCustomerModalOpen}
        onClose={() => {
          setIsCustomerModalOpen(false);
          focusScanner();
        }}
        onSelectCustomer={handleSelectCustomer}
        currentCustomer={ticket?.clienta || null}
      />

      {/* Modal Cobro Efectivo */}
      <CashPaymentModal
        isOpen={isCashModalOpen}
        total={ticket?.total || 0}
        onClose={() => {
          setIsCashModalOpen(false);
          focusScanner();
        }}
        onConfirm={async (recibido) => {
          await executeCobro({
            metodo_pago: "efectivo",
            efectivo_recibido: recibido,
          });
        }}
        isLoading={isLoadingAction}
      />

      {/* Modal Cobro Tarjeta */}
      <CardTerminalModal
        isOpen={isCardModalOpen}
        total={ticket?.total || 0}
        onClose={() => {
          setIsCardModalOpen(false);
          focusScanner();
        }}
        onConfirm={async (auth) => {
          await executeCobro({
            metodo_pago: "tarjeta_terminal",
            autorizacion_terminal: auth,
          });
        }}
        isLoading={isLoadingAction}
      />

      {/* Modal Cobro Mixto */}
      <MixedPaymentModal
        isOpen={isMixedModalOpen}
        total={ticket?.total || 0}
        onClose={() => {
          setIsMixedModalOpen(false);
          focusScanner();
        }}
        onConfirm={async (montoEfec, montoTarj, efecRecibido, auth) => {
          await executeCobro({
            metodo_pago: "mixto",
            monto_efectivo: montoEfec,
            monto_tarjeta: montoTarj,
            efectivo_recibido: efecRecibido,
            autorizacion_terminal: auth,
          });
        }}
        isLoading={isLoadingAction}
      />

      {/* Modal Cobro Transferencia */}
      <TransferPaymentModal
        isOpen={isTransferModalOpen}
        total={ticket?.total || 0}
        onClose={() => {
          setIsTransferModalOpen(false);
          focusScanner();
        }}
        onConfirm={async (ref) => {
          await executeCobro({
            metodo_pago: "transferencia",
            referencia_transferencia: ref,
          });
        }}
        isLoading={isLoadingAction}
      />

      {/* Modal Ayuda de Atajos de Teclado */}
      {isHelpShortcutsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl border border-stone-200 animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <h3 className="font-serif text-lg font-medium text-stone-900">
                Atajos de Teclado del POS
              </h3>
              <button
                type="button"
                onClick={() => setIsHelpShortcutsOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-stone-700">
              <div className="flex justify-between items-center py-1 border-b border-stone-50">
                <span>Enfocar escáner / buscador</span>
                <kbd className="px-2 py-1 bg-stone-100 rounded-md font-mono font-bold text-stone-800">
                  F2
                </kbd>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-stone-50">
                <span>Cobrar venta actual</span>
                <kbd className="px-2 py-1 bg-stone-100 rounded-md font-mono font-bold text-stone-800">
                  F4
                </kbd>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-stone-50">
                <span>Buscar / Asignar clienta</span>
                <kbd className="px-2 py-1 bg-stone-100 rounded-md font-mono font-bold text-stone-800">
                  F8
                </kbd>
              </div>

              <div className="flex justify-between items-center py-1">
                <span>Cerrar modal o limpiar búsqueda</span>
                <kbd className="px-2 py-1 bg-stone-100 rounded-md font-mono font-bold text-stone-800">
                  Esc
                </kbd>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsHelpShortcutsOpen(false)}
              className="w-full mt-5 py-2.5 rounded-xl bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

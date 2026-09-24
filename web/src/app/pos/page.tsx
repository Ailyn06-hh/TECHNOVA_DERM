"use client";

import { useEffect, useState } from "react";
import { api, Product, Order } from "@/lib/api";
import { Store, Search, Trash2, Plus, Minus, CreditCard, Banknote, CheckCircle, PackageCheck, AlertCircle } from "lucide-react";

interface POSItem {
  product: Product;
  quantity: number;
}

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [ticketItems, setTicketItems] = useState<POSItem[]>([]);
  const [activeTab, setActiveTab] = useState<"sale" | "pickups">("sale");
  const [pickupOrders, setPickupOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [lastSaleReceipt, setLastSaleReceipt] = useState<Order | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prods, orders] = await Promise.all([
        api.getProducts(),
        api.getOrders({ delivery_type: "CLICK_AND_COLLECT" }),
      ]);
      setProducts(prods);
      setPickupOrders(orders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addToTicket = (product: Product) => {
    if (product.stock_central <= 0) {
      setErrorMessage(`El producto '${product.name}' está agotado en inventario central.`);
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }

    setTicketItems((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id);
      if (idx >= 0) {
        if (prev[idx].quantity >= product.stock_central) {
          setErrorMessage(`No puedes vender más unidades que las disponibles (${product.stock_central} u.)`);
          setTimeout(() => setErrorMessage(null), 3000);
          return prev;
        }
        const updated = [...prev];
        updated[idx].quantity += 1;
        return updated;
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: number, delta: number) => {
    setTicketItems((prev) => {
      return prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty > item.product.stock_central) {
              setErrorMessage(`Stock máximo disponible alcanzado (${item.product.stock_central} u.)`);
              setTimeout(() => setErrorMessage(null), 3000);
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
    });
  };

  const clearTicket = () => {
    setTicketItems([]);
  };

  const totalAmount = ticketItems.reduce(
    (acc, item) => acc + item.product.current_dynamic_price * item.quantity,
    0
  );

  const handleChargeSale = async (method: "EFECTIVO" | "TARJETA") => {
    if (ticketItems.length === 0) return;
    try {
      setProcessing(true);
      setErrorMessage(null);

      const orderPayload = {
        channel: "POS_STORE",
        delivery_type: "SHIPPING", // Venta presencial directa en mostrador
        customer_name: "Cliente Mostrador Sucursal",
        customer_email: "mostrador@nacarderm.mx",
        items: ticketItems.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
        })),
      };

      const result = await api.createOrder(orderPayload);
      setLastSaleReceipt(result);
      setTicketItems([]);
      // Recargar catálogo para ver stock central actualizado inmediatamente
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Error al registrar la venta");
    } finally {
      setProcessing(false);
    }
  };

  const handleDeliverPickup = async (orderCode: string) => {
    try {
      await api.deliverPickupOrder(orderCode);
      loadData();
    } catch (err: any) {
      alert("Error al despachar el pedido: " + err.message);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      {/* Header POS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-nacar-200 mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-nacar-800 text-white">
              <Store className="w-5 h-5" />
            </span>
            <div>
              <h1 className="font-serif text-2xl font-semibold text-nacar-900">
                Punto de Venta (POS) Mostrador
              </h1>
              <p className="text-xs text-nacar-600">
                Sucursal Matriz CDMX · Conectado en tiempo real al Almacén Central
              </p>
            </div>
          </div>
        </div>

        {/* Tabs: Venta Mostrador vs Click & Collect */}
        <div className="flex bg-nacar-100 p-1 rounded-lg border border-nacar-200">
          <button
            onClick={() => setActiveTab("sale")}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === "sale"
                ? "bg-white text-nacar-900 shadow-sm"
                : "text-nacar-600 hover:text-nacar-900"
            }`}
          >
            Cobro en Mostrador
          </button>
          <button
            onClick={() => setActiveTab("pickups")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === "pickups"
                ? "bg-white text-nacar-900 shadow-sm"
                : "text-nacar-600 hover:text-nacar-900"
            }`}
          >
            <span>Click & Collect</span>
            {pickupOrders.filter((o) => o.status === "READY_FOR_PICKUP").length > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px]">
                {pickupOrders.filter((o) => o.status === "READY_FOR_PICKUP").length}
              </span>
            )}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {activeTab === "sale" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Product Selector */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="relative mb-4">
              <Search className="w-4 h-4 text-nacar-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar por nombre, SKU o categoría..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-nacar-200 bg-white text-xs text-nacar-900 focus:outline-none focus:ring-2 focus:ring-nacar-500"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[600px] pr-1">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.stock_central <= 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => addToTicket(p)}
                    disabled={isOutOfStock}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition relative ${
                      isOutOfStock
                        ? "bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed"
                        : "bg-white border-nacar-200 hover:border-nacar-500 hover:shadow-sm"
                    }`}
                  >
                    <div>
                      <span className="text-[10px] text-nacar-500 block mb-0.5">{p.sku}</span>
                      <h4 className="font-medium text-xs text-nacar-900 line-clamp-2 leading-tight mb-2">
                        {p.name}
                      </h4>
                    </div>

                    <div className="pt-2 border-t border-nacar-100 flex items-center justify-between">
                      <span className="font-serif text-sm font-semibold text-nacar-900">
                        ${p.current_dynamic_price.toFixed(2)}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                          isOutOfStock
                            ? "bg-rose-100 text-rose-700"
                            : p.stock_central <= p.min_safety_stock
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {isOutOfStock ? "0 disp." : `${p.stock_central} u.`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Cashier Register & Ticket */}
          <div className="lg:col-span-5 bg-white border border-nacar-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between h-[650px]">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-nacar-100 mb-3">
                <span className="font-serif text-base font-medium text-nacar-900">Ticket de Venta</span>
                {ticketItems.length > 0 && (
                  <button
                    onClick={clearTicket}
                    className="text-[11px] text-rose-600 hover:text-rose-800 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Vaciar</span>
                  </button>
                )}
              </div>

              {/* Items List */}
              <div className="overflow-y-auto max-h-[340px] divide-y divide-nacar-100">
                {ticketItems.length === 0 ? (
                  <div className="py-20 text-center text-nacar-400 text-xs font-light">
                    Selecciona productos del catálogo para agregar al ticket.
                  </div>
                ) : (
                  ticketItems.map((item) => (
                    <div key={item.product.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-nacar-900 line-clamp-1">
                          {item.product.name}
                        </p>
                        <p className="text-[10px] text-nacar-500">
                          ${item.product.current_dynamic_price.toFixed(2)} c/u
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1.5 bg-nacar-100 px-2 py-1 rounded-lg">
                        <button
                          onClick={() => updateQuantity(item.product.id, -1)}
                          className="text-nacar-700 hover:text-nacar-900"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-semibold w-4 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.product.id, 1)}
                          className="text-nacar-700 hover:text-nacar-900"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Subtotal */}
                      <span className="font-serif text-xs font-semibold text-nacar-900 w-16 text-right">
                        ${(item.product.current_dynamic_price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Total and Checkout Actions */}
            <div className="pt-4 border-t border-nacar-200">
              <div className="flex justify-between items-baseline mb-4">
                <span className="text-xs text-nacar-600">Total a Pagar</span>
                <span className="font-serif text-3xl font-bold text-nacar-900">
                  ${totalAmount.toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleChargeSale("EFECTIVO")}
                  disabled={ticketItems.length === 0 || processing}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <Banknote className="w-4 h-4" />
                  <span>Cobrar Efectivo</span>
                </button>
                <button
                  onClick={() => handleChargeSale("TARJETA")}
                  disabled={ticketItems.length === 0 || processing}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-nacar-800 hover:bg-nacar-700 text-white font-medium text-xs transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Cobrar Tarjeta</span>
                </button>
              </div>

              <p className="text-[10px] text-center text-nacar-500 mt-2">
                ⚡ Descuenta atómicamente el stock del Almacén Central
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Tab: Click & Collect Orders */
        <div className="bg-white border border-nacar-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif text-lg font-medium text-nacar-900">
                Pedidos para Recoger en Tienda (Click & Collect)
              </h3>
              <p className="text-xs text-nacar-600">
                Compras realizadas por clientes en la Web o App Móvil con recolección en esta sucursal.
              </p>
            </div>
            <button
              onClick={loadData}
              className="text-xs text-nacar-700 hover:underline px-3 py-1 bg-nacar-100 rounded-lg"
            >
              Actualizar Lista
            </button>
          </div>

          <div className="divide-y divide-nacar-100">
            {pickupOrders.length === 0 ? (
              <div className="py-12 text-center text-nacar-400 text-xs">
                No hay pedidos de Click & Collect pendientes en este momento.
              </div>
            ) : (
              pickupOrders.map((order) => (
                <div key={order.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-nacar-900">{order.order_code}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-nacar-200 text-nacar-800 uppercase font-semibold">
                        Canal: {order.channel}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          order.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800 animate-pulse"
                        }`}
                      >
                        {order.status === "COMPLETED" ? "Entregado" : "Listo para Recolección"}
                      </span>
                    </div>
                    <p className="text-xs text-nacar-700">
                      Cliente: <strong>{order.customer_name}</strong> ({order.customer_email})
                    </p>
                    <div className="mt-1 text-[11px] text-nacar-500">
                      Artículos:{" "}
                      {order.items.map((i) => `${i.quantity}x ${i.product_name || i.product_sku}`).join(", ")}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-serif text-lg font-bold text-nacar-900">
                      ${order.total_amount.toFixed(2)}
                    </span>
                    {order.status !== "COMPLETED" ? (
                      <button
                        onClick={() => handleDeliverPickup(order.order_code)}
                        className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow-sm"
                      >
                        <PackageCheck className="w-4 h-4" />
                        <span>Entregar a Cliente</span>
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> Entregado en mostrador
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal / Receipt Success */}
      {lastSaleReceipt && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-xl border border-nacar-200">
            <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
            <h3 className="font-serif text-xl font-bold text-nacar-900 mb-1">
              ¡Venta Registrada Exitosamente!
            </h3>
            <p className="text-xs text-nacar-600 mb-4">
              Código de transacción: <strong className="font-mono">{lastSaleReceipt.order_code}</strong>
            </p>

            <div className="bg-nacar-50 rounded-xl p-3 text-left mb-5 text-xs text-nacar-800 space-y-1">
              <div className="flex justify-between">
                <span>Canal:</span>
                <span className="font-bold">POS Tienda Física</span>
              </div>
              <div className="flex justify-between">
                <span>Artículos:</span>
                <span>{lastSaleReceipt.items.reduce((a, b) => a + b.quantity, 0)} unidades</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-nacar-200 font-bold text-sm">
                <span>Total Cobrado:</span>
                <span>${lastSaleReceipt.total_amount.toFixed(2)}</span>
              </div>
            </div>

            <p className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded-lg mb-4">
              ✅ El stock ha sido descontado automáticamente del inventario central para la web y la app móvil.
            </p>

            <button
              onClick={() => setLastSaleReceipt(null)}
              className="w-full py-2.5 bg-nacar-800 text-white rounded-xl text-xs font-semibold hover:bg-nacar-700 transition"
            >
              Listo / Siguiente Venta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

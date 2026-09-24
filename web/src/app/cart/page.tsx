"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, Product, Order } from "@/lib/api";
import { ShoppingBag, Trash2, Plus, Minus, ArrowLeft, CheckCircle, ShieldAlert, Store, Truck, Sparkles } from "lucide-react";

export default function CartPage() {
  const [cartItems, setCartItems] = useState<{ product: Product; quantity: number }[]>([]);
  const [deliveryType, setDeliveryType] = useState<"SHIPPING" | "CLICK_AND_COLLECT">("CLICK_AND_COLLECT");
  const [customerName, setCustomerName] = useState("Ailyn Martínez");
  const [customerEmail, setCustomerEmail] = useState("ailyn@ejemplo.com");
  const [customerPhone, setCustomerPhone] = useState("55 1234 5678");
  const [pickupStore, setPickupStore] = useState("Sucursal Matriz - CDMX");
  const [loading, setLoading] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("nacar_cart");
    if (saved) {
      try {
        setCartItems(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const saveCart = (items: { product: Product; quantity: number }[]) => {
    setCartItems(items);
    localStorage.setItem("nacar_cart", JSON.stringify(items));
  };

  const updateQuantity = (productId: number, delta: number) => {
    const updated = cartItems
      .map((item) => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          if (newQty > item.product.stock_central) {
            alert(`Stock máximo disponible alcanzado (${item.product.stock_central} u.)`);
            return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      })
      .filter((item) => item.quantity > 0);
    saveCart(updated);
  };

  const removeItem = (productId: number) => {
    const updated = cartItems.filter((i) => i.product.id !== productId);
    saveCart(updated);
  };

  // Motor de compatibilidad química / Skincare Safety Check
  const checkIngredientConflicts = () => {
    const allIngredients = cartItems
      .map((i) => (i.product.inci_ingredients || "") + " " + (i.product.active_ingredients || ""))
      .join(" ")
      .toLowerCase();

    const hasRetinol = allIngredients.includes("retinol");
    const hasVitC = allIngredients.includes("ascorbic") || allIngredients.includes("vitamina c");
    const hasBHA = allIngredients.includes("salicylic") || allIngredients.includes("salicílico");

    const warnings = [];
    if (hasRetinol && hasVitC) {
      warnings.push({
        title: "Interacción de Activos: Retinol + Vitamina C",
        desc: "Tu rutina contiene Retinol y Ácido Ascórbico. Te sugerimos espaciarlos: Vitamina C por la mañana acompañada de fotoprotector, y Retinol exclusivamente por la noche para evitar irritación.",
      });
    }
    if (hasRetinol && hasBHA) {
      warnings.push({
        title: "Interacción de Activos: Retinol + Ácido Salicílico (BHA)",
        desc: "El uso simultáneo en la misma aplicación puede comprometer la barrera cutánea. Alterna las noches de aplicación.",
      });
    }
    return warnings;
  };

  const warnings = checkIngredientConflicts();

  const subtotal = cartItems.reduce(
    (acc, item) => acc + item.product.current_dynamic_price * item.quantity,
    0
  );
  const shippingCost = deliveryType === "SHIPPING" ? (subtotal > 999 ? 0 : 99) : 0;
  const total = subtotal + shippingCost;

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    try {
      setLoading(true);
      setError(null);

      const payload = {
        channel: "WEB_ECOMMERCE",
        delivery_type: deliveryType,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        pickup_store: deliveryType === "CLICK_AND_COLLECT" ? pickupStore : undefined,
        items: cartItems.map((i) => ({
          product_id: i.product.id,
          quantity: i.quantity,
        })),
      };

      const result = await api.createOrder(payload);
      setOrderCompleted(result);
      saveCart([]);
    } catch (err: any) {
      setError(err.message || "Error al completar el pedido");
    } finally {
      setLoading(false);
    }
  };

  if (orderCompleted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl p-8 border border-nacar-200 shadow-sm">
          <CheckCircle className="w-16 h-16 text-emerald-600 mx-auto mb-4" />
          <h1 className="font-serif text-3xl font-semibold text-nacar-900 mb-2">
            ¡Pedido Confirmado con Éxito!
          </h1>
          <p className="text-sm text-nacar-600 mb-6">
            Código de seguimiento: <strong className="font-mono text-nacar-900">{orderCompleted.order_code}</strong>
          </p>

          <div className="bg-nacar-50 rounded-2xl p-4 text-left text-xs text-nacar-800 space-y-2 mb-6 border border-nacar-200">
            <div className="flex justify-between">
              <span>Tipo de Entrega:</span>
              <strong className="uppercase">{orderCompleted.delivery_type.replace(/_/g, " ")}</strong>
            </div>
            {orderCompleted.delivery_type === "CLICK_AND_COLLECT" && (
              <div className="flex justify-between text-emerald-800">
                <span>Sucursal de Recolección:</span>
                <strong>{orderCompleted.pickup_store} (Listo para mostrador)</strong>
              </div>
            )}
            <div className="flex justify-between">
              <span>Cliente:</span>
              <span>{orderCompleted.customer_name} ({orderCompleted.customer_email})</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-nacar-200 font-bold text-sm">
              <span>Total Pagado:</span>
              <span>${orderCompleted.total_amount.toFixed(2)} MXN</span>
            </div>
          </div>

          <p className="text-xs text-emerald-800 bg-emerald-50 p-3 rounded-xl mb-6">
            ✨ El inventario central ya fue descontado atómicamente. Si abres la terminal POS en la tienda, verás este pedido listo para entrega y el stock actualizado.
          </p>

          <div className="flex justify-center gap-3">
            <Link
              href="/"
              className="px-6 py-2.5 bg-nacar-800 text-white rounded-xl text-xs font-semibold hover:bg-nacar-700 transition"
            >
              Seguir Explorando Tienda
            </Link>
            <Link
              href="/pos"
              className="px-6 py-2.5 bg-nacar-100 text-nacar-900 rounded-xl text-xs font-semibold hover:bg-nacar-200 transition"
            >
              Ver Pedido en POS
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-nacar-600 hover:text-nacar-900 mb-6 font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Regresar a la tienda</span>
      </Link>

      <h1 className="font-serif text-3xl font-semibold text-nacar-900 mb-8">
        Carrito Inteligente Omnicanal
      </h1>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {cartItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-nacar-200 max-w-lg mx-auto">
          <ShoppingBag className="w-12 h-12 text-nacar-400 mx-auto mb-3" />
          <h2 className="font-serif text-xl font-medium text-nacar-900 mb-1">
            Tu carrito está vacío
          </h2>
          <p className="text-xs text-nacar-600 mb-6 font-light">
            Explora nuestro catálogo de dermocosmética con precios dinámicos y stock sincronizado.
          </p>
          <Link
            href="/"
            className="px-6 py-2.5 bg-nacar-800 text-white rounded-xl text-xs font-semibold hover:bg-nacar-700 transition shadow-sm inline-block"
          >
            Explorar Catálogo
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Cart Items List */}
          <div className="lg:col-span-7 space-y-4">
            {/* Skincare Safety Alert Banner */}
            {warnings.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Asesoría Inteligente de Ingredientes (Safety Score)</span>
                </div>
                {warnings.map((w, idx) => (
                  <div key={idx} className="text-xs">
                    <p className="font-semibold text-amber-950">{w.title}</p>
                    <p className="text-amber-800 font-light mt-0.5">{w.desc}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white rounded-2xl border border-nacar-200 divide-y divide-nacar-100 p-4">
              {cartItems.map((item) => (
                <div key={item.product.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-nacar-100 overflow-hidden shrink-0">
                      {item.product.image_url ? (
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-serif text-nacar-400">
                          N
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] text-nacar-500 uppercase tracking-wider font-semibold">
                        {item.product.brand} · {item.product.sku}
                      </span>
                      <h4 className="font-serif text-sm font-medium text-nacar-900 leading-snug">
                        {item.product.name}
                      </h4>
                      <p className="text-xs font-semibold text-emerald-800 mt-1">
                        ${item.product.current_dynamic_price.toFixed(2)} MXN
                      </p>
                    </div>
                  </div>

                  {/* Quantity and Remove */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-nacar-100 px-2 py-1 rounded-lg">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="text-nacar-700 hover:text-nacar-900"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-semibold w-5 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="text-nacar-700 hover:text-nacar-900"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="font-serif text-sm font-bold text-nacar-900 w-20 text-right">
                      ${(item.product.current_dynamic_price * item.quantity).toFixed(2)}
                    </span>

                    <button
                      onClick={() => removeItem(item.product.id)}
                      className="text-nacar-400 hover:text-rose-600 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Checkout & Omnichannel Options */}
          <div className="lg:col-span-5 bg-white border border-nacar-200 rounded-3xl p-6 shadow-sm h-fit">
            <h3 className="font-serif text-lg font-medium text-nacar-900 mb-4 pb-3 border-b border-nacar-100">
              Método de Entrega Omnicanal
            </h3>

            {/* Delivery Switcher */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => setDeliveryType("CLICK_AND_COLLECT")}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition ${
                  deliveryType === "CLICK_AND_COLLECT"
                    ? "border-nacar-900 bg-nacar-50/70 text-nacar-900"
                    : "border-nacar-200 text-nacar-600 hover:border-nacar-400"
                }`}
              >
                <Store className="w-5 h-5 mb-2 text-nacar-800" />
                <div>
                  <span className="font-semibold text-xs block">Click & Collect</span>
                  <span className="text-[11px] text-nacar-500">Recoger en Tienda (Gratis)</span>
                </div>
              </button>

              <button
                onClick={() => setDeliveryType("SHIPPING")}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition ${
                  deliveryType === "SHIPPING"
                    ? "border-nacar-900 bg-nacar-50/70 text-nacar-900"
                    : "border-nacar-200 text-nacar-600 hover:border-nacar-400"
                }`}
              >
                <Truck className="w-5 h-5 mb-2 text-nacar-800" />
                <div>
                  <span className="font-semibold text-xs block">Envío Nacional</span>
                  <span className="text-[11px] text-nacar-500">Entrega en 2-4 días</span>
                </div>
              </button>
            </div>

            {/* Customer Inputs */}
            <div className="space-y-3 mb-6 text-xs">
              <div>
                <label className="text-nacar-600 block mb-1">Nombre Completo:</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-nacar-200 bg-nacar-50 text-nacar-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-nacar-600 block mb-1">Correo Electrónico:</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-nacar-200 bg-nacar-50 text-nacar-900 focus:outline-none"
                />
              </div>

              {deliveryType === "CLICK_AND_COLLECT" ? (
                <div>
                  <label className="text-nacar-600 block mb-1">Sucursal de Recolección:</label>
                  <select
                    value={pickupStore}
                    onChange={(e) => setPickupStore(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-nacar-200 bg-nacar-50 text-nacar-900 focus:outline-none font-medium"
                  >
                    <option value="Sucursal Matriz - CDMX">Sucursal Matriz - Roma Norte, CDMX</option>
                    <option value="Sucursal Guadalajara">Sucursal Providencia - Guadalajara</option>
                    <option value="Sucursal Monterrey">Sucursal San Pedro - Monterrey</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="text-nacar-600 block mb-1">Teléfono Móvil:</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-nacar-200 bg-nacar-50 text-nacar-900 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Summary Lines */}
            <div className="pt-4 border-t border-nacar-100 space-y-2 text-xs mb-6">
              <div className="flex justify-between text-nacar-600">
                <span>Subtotal ({cartItems.reduce((a, b) => a + b.quantity, 0)} artículos):</span>
                <span className="font-serif font-medium text-nacar-900">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-nacar-600">
                <span>Costo de Envío:</span>
                <span className="font-serif font-medium text-nacar-900">
                  {shippingCost === 0 ? "Gratis" : `$${shippingCost.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-nacar-200 font-bold text-base text-nacar-900">
                <span>Total a Pagar:</span>
                <span className="font-serif text-2xl text-nacar-900">${total.toFixed(2)} MXN</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full py-3.5 bg-nacar-900 hover:bg-nacar-800 text-white rounded-2xl text-xs font-semibold transition shadow-md disabled:opacity-50"
            >
              {loading ? "Procesando en Servidor..." : "Confirmar Pedido Omnicanal"}
            </button>
            <p className="text-[10px] text-center text-nacar-500 mt-3 font-light">
              🔒 Transacción asegurada y sincronizada con inventario central
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

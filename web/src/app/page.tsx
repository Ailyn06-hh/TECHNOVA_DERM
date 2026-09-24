"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { api, Product } from "@/lib/api";
import { Sparkles, ShoppingCart, Check, AlertTriangle, ArrowRight, ShieldCheck, Zap } from "lucide-react";

export default function StorePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [addedSku, setAddedSku] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);

  const categories = ["Todos", "Serum", "Protector Solar", "Limpiador", "Hidratante", "Exfoliante"];

  // TODO: Mostrar recomendaciones personalizadas de productos según el perfil de piel del usuario
  const loadCatalog = async () => {
    try {
      setLoading(true);
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
    // Leer carrito local
    const saved = localStorage.getItem("nacar_cart");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCartCount(parsed.reduce((acc: number, item: any) => acc + item.quantity, 0));
      } catch (e) {}
    }
  }, []);

  const handleAddToCart = (product: Product) => {
    if (product.stock_central <= 0) return;

    let cart: any[] = [];
    const saved = localStorage.getItem("nacar_cart");
    if (saved) {
      try {
        cart = JSON.parse(saved);
      } catch (e) {}
    }

    const existingIndex = cart.findIndex((i: any) => i.product_id === product.id);
    if (existingIndex >= 0) {
      cart[existingIndex].quantity += 1;
    } else {
      cart.push({
        product_id: product.id,
        product: product,
        quantity: 1,
      });
    }

    localStorage.setItem("nacar_cart", JSON.stringify(cart));
    setCartCount(cart.reduce((acc, i) => acc + i.quantity, 0));
    setAddedSku(product.sku);
    setTimeout(() => setAddedSku(null), 2000);
  };

  const filteredProducts = selectedCategory === "Todos"
    ? products
    : products.filter((p) => p.category.toLowerCase().includes(selectedCategory.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
      {/* Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-nacar-900 via-nacar-800 to-nacar-700 text-white p-8 md:p-12 mb-10 shadow-lg border border-nacar-600">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-xs font-medium text-nacar-100 mb-4">
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>Precios Optimizados en Tiempo Real por Demanda (Machine Learning)</span>
          </div>
          <h1 className="font-serif text-3xl md:text-5xl font-normal tracking-tight leading-tight mb-4">
            Dermocosmética Inteligente y Alta Pureza.
          </h1>
          <p className="text-nacar-200 text-sm md:text-base leading-relaxed mb-6 font-light">
            Nácar unifica el inventario entre nuestra tienda en línea y sucursal física. Lo que ves disponible aquí está protegido y sincronizado al segundo sin sobreventas.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/cart"
              className="inline-flex items-center gap-2 bg-white text-nacar-900 px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-nacar-100 transition shadow-sm"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Ver Carrito ({cartCount})</span>
            </Link>
            <Link
              href="/pos"
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-5 py-2.5 rounded-lg text-sm font-medium transition"
            >
              <span>Ver Vista Cajero POS</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Ambient Decorative element */}
        <div className="absolute right-0 bottom-0 w-80 h-80 bg-nacar-500/20 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-xs md:text-sm font-medium whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? "bg-nacar-800 text-white shadow-sm"
                : "bg-white text-nacar-700 hover:bg-nacar-100 border border-nacar-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="text-center py-20 text-nacar-600">
          <div className="w-10 h-10 border-2 border-nacar-400 border-t-nacar-800 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm">Cargando catálogo unificado y precios dinámicos...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const isDiscounted = product.current_dynamic_price < product.base_price;
            const isPremium = product.current_dynamic_price > product.base_price;
            const isOutOfStock = product.stock_central <= 0;
            const isCriticalStock = product.stock_central > 0 && product.stock_central <= product.min_safety_stock;

            return (
              <div
                key={product.id}
                className="bg-white rounded-xl border border-nacar-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group"
              >
                {/* Product Image & Badges */}
                <div className="relative h-60 w-full bg-nacar-100 overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-nacar-400 font-serif text-3xl">
                      NÁCAR
                    </div>
                  )}

                  {/* Dynamic Pricing Tag */}
                  {isDiscounted && (
                    <div className="absolute top-3 left-3 bg-emerald-700 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-300" />
                      <span>Oferta Dinámica: -${Math.round(product.base_price - product.current_dynamic_price)}</span>
                    </div>
                  )}
                  {isPremium && (
                    <div className="absolute top-3 left-3 bg-nacar-800 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span>Alta Demanda</span>
                    </div>
                  )}

                  {/* Stock Status Badge */}
                  <div className="absolute top-3 right-3">
                    {isOutOfStock ? (
                      <span className="bg-rose-100 border border-rose-300 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Agotado
                      </span>
                    ) : isCriticalStock ? (
                      <span className="bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                        <span>¡Solo {product.stock_central} disp.!</span>
                      </span>
                    ) : (
                      <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-medium px-2 py-0.5 rounded-full">
                        {product.stock_central} en Almacén Central
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-nacar-500 mb-1">
                      <span className="uppercase tracking-wider font-semibold">{product.brand}</span>
                      <span>SKU: {product.sku}</span>
                    </div>
                    <h3 className="font-serif text-lg text-nacar-900 font-medium leading-snug mb-1.5">
                      {product.name}
                    </h3>
                    <p className="text-xs text-nacar-600 line-clamp-2 mb-3 font-light">
                      {product.description}
                    </p>

                    {/* Active Ingredients */}
                    {product.active_ingredients && (
                      <div className="mb-4">
                        <span className="text-[10px] bg-nacar-100 text-nacar-800 px-2 py-0.5 rounded font-mono font-medium">
                          {product.active_ingredients}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Price & Action */}
                  <div className="pt-3 border-t border-nacar-100 flex items-center justify-between mt-auto">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-serif text-2xl font-semibold text-nacar-900">
                          ${product.current_dynamic_price.toFixed(2)}
                        </span>
                        {product.current_dynamic_price !== product.base_price && (
                          <span className="text-xs text-nacar-400 line-through">
                            ${product.base_price.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-nacar-500 block">IVA incluido · MXN</span>
                    </div>

                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={isOutOfStock}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                        isOutOfStock
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : addedSku === product.sku
                          ? "bg-emerald-600 text-white"
                          : "bg-nacar-800 hover:bg-nacar-700 text-white shadow-sm"
                      }`}
                    >
                      {addedSku === product.sku ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>¡Agregado!</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4" />
                          <span>{isOutOfStock ? "Agotado" : "Agregar"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

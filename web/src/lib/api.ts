const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export interface Product {
  id: number;
  sku: string;
  name: string;
  brand: string;
  category: string;
  description?: string;
  base_price: number;
  current_dynamic_price: number;
  cost_price: number;
  min_price: number;
  max_price: number;
  auto_pricing_enabled: boolean;
  stock_central: number;
  min_safety_stock: number;
  lead_time_days: number;
  inci_ingredients?: string;
  active_ingredients?: string;
  skin_type?: string;
  image_url?: string;
}

export interface OrderItemCreate {
  product_id: number;
  quantity: number;
}

export interface OrderCreate {
  channel: string; // 'WEB_ECOMMERCE' | 'POS_STORE' | 'MOBILE_APP'
  delivery_type: string; // 'SHIPPING' | 'CLICK_AND_COLLECT'
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  pickup_store?: string;
  items: OrderItemCreate[];
}

export interface Order {
  id: number;
  order_code: string;
  channel: string;
  delivery_type: string;
  status: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  pickup_store?: string;
  total_amount: number;
  created_at: string;
  items: {
    id: number;
    product_id: number;
    product_name?: string;
    product_sku?: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }[];
}

export interface PricingRecommendation {
  product_id: number;
  sku: string;
  name: string;
  current_price: number;
  base_price: number;
  recommended_price: number;
  price_change_percent: number;
  stock_current: number;
  predicted_daily_demand: number;
  days_of_stock_left: number;
  strategy_applied: string;
  margin_percentage: number;
  reason: string;
}

export interface DailyForecast {
  date: string;
  day_name: string;
  predicted_demand: number;
  is_quincena: boolean;
  is_weekend: boolean;
}

export interface ProductForecast {
  product_id: number;
  sku: string;
  name: string;
  stock_central: number;
  min_safety_stock: number;
  lead_time_days: number;
  avg_daily_demand_forecast: number;
  runout_date?: string;
  days_until_runout?: number;
  stock_risk_level: "CRITICAL" | "MODERATE" | "HEALTHY" | "OVERSTOCK";
  suggested_reorder_qty: number;
  forecast_curve_14d: DailyForecast[];
  historical_sales_last_14d: { date: string; day_name: string; actual_sales: number }[];
}

export interface InventorySummary {
  total_skus: number;
  total_units_in_stock: number;
  inventory_valuation_cost: number;
  inventory_valuation_retail: number;
  critical_stock_count: number;
  critical_items: {
    id: number;
    sku: string;
    name: string;
    stock_central: number;
    min_safety_stock: number;
    current_price: number;
  }[];
  out_of_stock_count: number;
  out_of_stock_items: string[];
  channel_distribution: Record<string, { units: number; revenue: number }>;
}

export const api = {
  // Productos
  async getProducts(params?: { category?: string; search?: string }): Promise<Product[]> {
    const query = new URLSearchParams();
    if (params?.category) query.append("category", params.category);
    if (params?.search) query.append("search", params.search);
    const res = await fetch(`${API_BASE_URL}/products?${query.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Error al obtener catálogo");
    return res.json();
  },

  async getProduct(id: number): Promise<Product> {
    const res = await fetch(`${API_BASE_URL}/products/${id}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Producto no encontrado");
    return res.json();
  },

  // Pedidos Omnicanal
  async createOrder(payload: OrderCreate): Promise<Order> {
    const res = await fetch(`${API_BASE_URL}/orders/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Error al procesar el pedido omnicanal");
    }
    return res.json();
  },

  async getOrders(params?: { channel?: string; delivery_type?: string; status?: string }): Promise<Order[]> {
    const query = new URLSearchParams();
    if (params?.channel) query.append("channel", params.channel);
    if (params?.delivery_type) query.append("delivery_type", params.delivery_type);
    if (params?.status) query.append("status", params.status);
    const res = await fetch(`${API_BASE_URL}/orders?${query.toString()}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Error al consultar pedidos");
    return res.json();
  },

  async deliverPickupOrder(orderCode: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/orders/pickup/${orderCode}/deliver`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Error al entregar pedido");
    return res.json();
  },

  // Dynamic Pricing
  async getPricingRecommendations(): Promise<PricingRecommendation[]> {
    const res = await fetch(`${API_BASE_URL}/pricing/recommendations`, { cache: "no-store" });
    if (!res.ok) throw new Error("Error al consultar recomendaciones de precios");
    return res.json();
  },

  async applyPricing(productId: number, newPrice: number): Promise<Product> {
    const res = await fetch(`${API_BASE_URL}/pricing/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId, new_price: newPrice }),
    });
    if (!res.ok) throw new Error("Error al aplicar nuevo precio");
    return res.json();
  },

  async applyAllPricing(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/pricing/apply-all`, { method: "POST" });
    if (!res.ok) throw new Error("Error al aplicar precios automáticos");
    return res.json();
  },

  // Forecast Machine Learning
  async getAllForecasts(): Promise<ProductForecast[]> {
    const res = await fetch(`${API_BASE_URL}/forecast/all`, { cache: "no-store" });
    if (!res.ok) throw new Error("Error al obtener predicciones de ML");
    return res.json();
  },

  async getProductForecast(id: number): Promise<ProductForecast> {
    const res = await fetch(`${API_BASE_URL}/forecast/${id}`, { cache: "no-store" });
    if (!res.ok) throw new Error("Error al obtener predicción de producto");
    return res.json();
  },

  async generateSupplierReorder(productId: number): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/forecast/generate-reorder/${productId}`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Error al generar orden de compra");
    return res.json();
  },

  async getSupplierOrders(): Promise<any[]> {
    const res = await fetch(`${API_BASE_URL}/forecast/supplier-orders/list`, { cache: "no-store" });
    if (!res.ok) throw new Error("Error al listar órdenes a proveedores");
    return res.json();
  },

  // Inventario
  async getInventorySummary(): Promise<InventorySummary> {
    const res = await fetch(`${API_BASE_URL}/inventory/summary`, { cache: "no-store" });
    if (!res.ok) throw new Error("Error al obtener resumen de inventario");
    return res.json();
  },

  async adjustStock(productId: number, newStock: number): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/inventory/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId, new_stock: newStock }),
    });
    if (!res.ok) throw new Error("Error al ajustar inventario");
    return res.json();
  },
};

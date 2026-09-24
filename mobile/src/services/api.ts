import { Platform } from 'react-native';

// En emulador Android se usa 10.0.2.2, en iOS/Web localhost
const BASE_URL = Platform.select({
  android: 'http://10.0.2.2:8000/api',
  ios: 'http://localhost:8000/api',
  default: 'http://localhost:8000/api',
});

export const mobileApi = {
  async getProducts() {
    const res = await fetch(`${BASE_URL}/products`);
    if (!res.ok) throw new Error("Error cargando productos");
    return res.json();
  },

  async createOrder(payload: any) {
    const res = await fetch(`${BASE_URL}/orders/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Error al crear pedido");
    }
    return res.json();
  },

  async getOrders() {
    const res = await fetch(`${BASE_URL}/orders?channel=MOBILE_APP`);
    if (!res.ok) throw new Error("Error cargando pedidos");
    return res.json();
  }
};

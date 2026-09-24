"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface ToastData {
  id: string;
  message: string;
  type: "success" | "error";
  linkHref?: string;
  linkLabel?: string;
}

interface CarritoContextType {
  cartCount: number;
  isLoading: boolean;
  refreshCart: () => Promise<void>;
  addItem: (options: {
    producto_id?: number;
    combo_id?: number;
    cantidad?: number;
  }) => Promise<{ success: boolean; error?: string; message?: string }>;
  toasts: ToastData[];
  showToast: (toast: Omit<ToastData, "id">) => void;
  removeToast: (id: string) => void;
}

const CarritoContext = createContext<CarritoContextType | undefined>(undefined);

export function CarritoProvider({ children }: { children: React.ReactNode }) {
  const [cartCount, setCartCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastData, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { ...toast, id }]);

      setTimeout(() => {
        removeToast(id);
      }, 5000);
    },
    [removeToast]
  );

  const refreshCart = useCallback(async () => {
    try {
      const res = await fetch("/api/carrito");
      if (res.ok) {
        const data = await res.json();
        setCartCount(Number(data.totalItems || 0));
      }
    } catch (err) {
      console.error("Error al refrescar carrito:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const addItem = async (options: {
    producto_id?: number;
    combo_id?: number;
    cantidad?: number;
  }): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      const res = await fetch("/api/carrito/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast({
          message: data.message || data.error || "No se pudo agregar al carrito.",
          type: "error",
        });
        return { success: false, error: data.error, message: data.message };
      }

      setCartCount(Number(data.totalItems || 0));

      showToast({
        message: "Agregado a tu bolsa",
        type: "success",
        linkHref: "/cart",
        linkLabel: "Ver bolsa",
      });

      return { success: true, message: data.message };
    } catch {
      showToast({
        message: "Error de conexión al agregar al carrito.",
        type: "error",
      });
      return { success: false, error: "Error de conexión" };
    }
  };

  return (
    <CarritoContext.Provider
      value={{
        cartCount,
        isLoading,
        refreshCart,
        addItem,
        toasts,
        showToast,
        removeToast,
      }}
    >
      {children}
    </CarritoContext.Provider>
  );
}

export function useCarrito() {
  const context = useContext(CarritoContext);
  if (!context) {
    throw new Error("useCarrito debe usarse dentro de un CarritoProvider");
  }
  return context;
}

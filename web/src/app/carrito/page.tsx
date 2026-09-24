import React from "react";
import type { Metadata } from "next";
import StoreLayout from "@/components/layout/StoreLayout";
import CartPage from "@/components/cart/CartPage";
import { getCartForServer } from "@/lib/carrito";
import { getSugerenciasCarrito, type SugerenciaProducto } from "@/lib/recomendaciones";
import { NOMBRE_MARCA } from "@/lib/marca";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Bolsa de Compras | ${NOMBRE_MARCA}`,
  description: `Revisa y gestiona los productos de tu bolsa de compras en ${NOMBRE_MARCA}.`,
};

export default async function CarritoRoute() {
  const { carrito, isLoggedIn, cartId, userId } = await getCartForServer();

  let sugerencias: SugerenciaProducto[] = [];
  try {
    sugerencias = await getSugerenciasCarrito(cartId ?? 0, userId);
  } catch (err) {
    console.error("Error al precargar sugerencias:", err);
  }

  return (
    <StoreLayout>
      <CartPage
        initialCarrito={carrito}
        initialSugerencias={sugerencias}
        isLoggedIn={isLoggedIn}
      />
    </StoreLayout>
  );
}

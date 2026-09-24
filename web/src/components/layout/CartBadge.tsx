"use client";

import React from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCarrito } from "@/contexts/CarritoContext";

export default function CartBadge() {
  const { cartCount } = useCarrito();

  return (
    <Link
      href="/carrito"
      aria-label={`Bolsa de compras con ${cartCount} ${cartCount === 1 ? "artículo" : "artículos"}`}
      className="relative p-2 rounded-full text-gray-700 hover:text-[#1A1715] hover:bg-black/5 transition focus:outline-none focus:ring-2 focus:ring-[#6B1F4A]"
    >
      <ShoppingBag className="w-5 h-5 stroke-[1.8]" />
      {cartCount > 0 && (
        <span className="absolute top-1 right-0.5 w-4 h-4 bg-[#6B1F4A] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-xs">
          {cartCount > 99 ? "99+" : cartCount}
        </span>
      )}
    </Link>
  );
}

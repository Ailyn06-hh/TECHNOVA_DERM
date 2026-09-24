"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { useCarrito } from "@/contexts/CarritoContext";

interface FavoriteButtonProps {
  productoId: number;
  productSlug: string;
}

export default function FavoriteButton({
  productoId,
  productSlug,
}: FavoriteButtonProps) {
  const router = useRouter();
  const { showToast } = useCarrito();
  const [isFavorito, setIsFavorito] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Consultar estado inicial de favorito
  useEffect(() => {
    async function checkFavorito() {
      try {
        const res = await fetch(`/api/favoritos/${productoId}`);
        if (res.ok) {
          const data = await res.json();
          setIsFavorito(Boolean(data.isFavorito));
        }
      } catch {
        // Ignorar si no está autenticado
      }
    }
    checkFavorito();
  }, [productoId]);

  const handleToggle = async () => {
    if (isLoading) return;

    // Actualización optimista
    const prev = isFavorito;
    const next = !prev;
    setIsFavorito(next);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/favoritos/${productoId}`, {
        method: next ? "POST" : "DELETE",
      });

      if (res.status === 401) {
        // Sin sesión: revertir y redirigir a login con volver
        setIsFavorito(prev);
        router.push(`/login?volver=${encodeURIComponent(`/producto/${productSlug}`)}`);
        return;
      }

      if (!res.ok) {
        throw new Error("No se pudo actualizar favoritos.");
      }

      showToast({
        message: next
          ? "Guardado en tus favoritos"
          : "Eliminado de tus favoritos",
        type: "success",
      });
    } catch {
      // Revertir en error
      setIsFavorito(prev);
      showToast({
        message: "No se pudo actualizar favoritos.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={isFavorito}
      aria-label={isFavorito ? "Quitar de favoritos" : "Agregar a favoritos"}
      className={`w-11 h-11 rounded-full border flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 ${
        isFavorito
          ? "bg-rose-50 border-rose-200 text-[#6B1F4A]"
          : "bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50"
      }`}
    >
      <Heart
        className={`w-5 h-5 transition-transform ${
          isFavorito ? "fill-[#6B1F4A] text-[#6B1F4A] scale-110" : ""
        }`}
      />
    </button>
  );
}

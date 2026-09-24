"use client";

import React, { useState, useRef } from "react";
import { ShieldCheck, Plus, Loader2 } from "lucide-react";
import ReviewCard, { ReviewItem } from "./ReviewCard";
import ReviewForm from "./ReviewForm";
import { useCarrito } from "@/contexts/CarritoContext";

interface ReviewsSectionProps {
  productoId: number;
  initialReviews: ReviewItem[];
  totalResenas: number;
  promedioResenas: number;
  puedeEscribirInicial: boolean;
}

export default function ReviewsSection({
  productoId,
  initialReviews,
  totalResenas: initialTotal,
  promedioResenas: initialPromedio,
  puedeEscribirInicial,
}: ReviewsSectionProps) {
  const { showToast } = useCarrito();
  const [reviews, setReviews] = useState<ReviewItem[]>(initialReviews);
  const [total, setTotal] = useState(initialTotal);
  const [promedio, setPromedio] = useState(initialPromedio);
  const [puedeEscribir, setPuedeEscribir] = useState(puedeEscribirInicial);

  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const triggerButtonRef = useRef<HTMLButtonElement>(null);

  const hayMas = reviews.length < total;

  const handleLoadMore = async () => {
    if (isLoadingMore || !hayMas) return;
    setIsLoadingMore(true);

    const nextPage = page + 1;
    try {
      const res = await fetch(
        `/api/productos/${productoId}/resenas?pagina=${nextPage}&limite=6`
      );
      if (res.ok) {
        const data = await res.json();
        setReviews((prev) => [...prev, ...(data.resenas || [])]);
        setPage(nextPage);
      }
    } catch (err) {
      console.error("Error al cargar más reseñas:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleReviewSuccess = (
    newReview: ReviewItem,
    newTotal: number,
    newPromedio: number
  ) => {
    setReviews((prev) => [newReview, ...prev]);
    setTotal(newTotal);
    setPromedio(newPromedio);
    setPuedeEscribir(false);
    showToast({
      message: "¡Tu reseña ha sido publicada con éxito!",
      type: "success",
    });
  };

  return (
    <section id="resenas" className="my-12 sm:my-16 scroll-mt-24">
      
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-medium text-slate-900 tracking-tight">
            Reseñas
          </h2>
          {total > 0 && (
            <p className="text-xs text-slate-500 font-light mt-1">
              {promedio} de 5 estrellas basado en {total} opiniones comprobadas
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-light">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Solo compradoras verificadas</span>
        </div>
      </div>

      {/* Grid de 3 tarjetas de reseñas */}
      {reviews.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 border border-slate-100 text-center shadow-2xs">
          <p className="text-xs text-slate-500 font-light mb-4">
            Aún no hay reseñas para esta fórmula. ¡Sé la primera en compartir tu experiencia!
          </p>
          {puedeEscribir && (
            <button
              ref={triggerButtonRef}
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-medium bg-[#6B1F4A] hover:bg-[#531839] text-white transition shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Escribir reseña</span>
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {reviews.map((rev) => (
              <ReviewCard key={rev.id} review={rev} />
            ))}
          </div>

          {/* Acciones al pie: Ver más reseñas y Escribir reseña */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            {hayMas && (
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="px-6 py-2.5 rounded-full text-xs font-medium border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition shadow-2xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 text-[#6B1F4A] animate-spin" />
                    <span>Cargando reseñas...</span>
                  </>
                ) : (
                  <span>Ver todas las reseñas</span>
                )}
              </button>
            )}

            {puedeEscribir && (
              <button
                ref={triggerButtonRef}
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="px-6 py-2.5 rounded-full text-xs font-medium bg-rose-50 hover:bg-rose-100 text-[#6B1F4A] border border-rose-200 transition shadow-2xs flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Escribir reseña</span>
              </button>
            )}
          </div>
        </>
      )}

      {/* Modal de Escribir Reseña */}
      <ReviewForm
        productoId={productoId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleReviewSuccess}
        triggerButtonRef={triggerButtonRef}
      />

    </section>
  );
}

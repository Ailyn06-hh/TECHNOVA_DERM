"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Star, Loader2, AlertCircle } from "lucide-react";
import { ReviewItem } from "./ReviewCard";

interface ReviewFormProps {
  productoId: number;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newReview: ReviewItem, newTotal: number, newPromedio: number) => void;
  triggerButtonRef?: React.RefObject<HTMLButtonElement>;
}

export default function ReviewForm({
  productoId,
  isOpen,
  onClose,
  onSuccess,
  triggerButtonRef,
}: ReviewFormProps) {
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Atrapar foco y Escape para cerrar
  useEffect(() => {
    if (!isOpen) return;

    // Foco en primer input
    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleClose = () => {
    setErrorMsg(null);
    onClose();
    // Devolver foco al botón que abrió el modal
    setTimeout(() => {
      triggerButtonRef?.current?.focus();
    }, 50);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (rating < 1 || rating > 5) {
      setErrorMsg("Por favor selecciona una calificación de 1 a 5 estrellas.");
      return;
    }

    if (titulo.trim().length < 3 || titulo.trim().length > 80) {
      setErrorMsg("El título debe tener entre 3 y 80 caracteres.");
      return;
    }

    if (texto.trim().length < 20 || texto.trim().length > 1000) {
      setErrorMsg("La reseña debe tener entre 20 y 1,000 caracteres.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/productos/${productoId}/resenas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          calificacion: rating,
          titulo: titulo.trim(),
          texto: texto.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "No se pudo guardar la reseña.");
      }

      onSuccess(data.resena, data.total, data.promedio);
      handleClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Error al enviar la reseña.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-100 shadow-2xl relative animate-in zoom-in-95 duration-150"
      >
        {/* Botón cerrar */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Cerrar modal de reseña"
          className="absolute top-6 right-6 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 id="review-modal-title" className="font-serif text-2xl font-medium text-slate-900 mb-1">
          Escribir reseña
        </h3>
        <p className="text-xs text-slate-500 font-light mb-6">
          Comparte tu experiencia con esta fórmula para ayudar a otras compradoras.
        </p>

        {errorMsg && (
          <div className="flex items-center gap-2 p-3.5 mb-5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Calificación interactiva */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">
              Calificación general <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Calificación de 1 a 5 estrellas">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = star <= (hoverRating || rating);
                return (
                  <button
                    key={star}
                    type="button"
                    role="radio"
                    aria-checked={star === rating}
                    aria-label={`${star} estrella${star > 1 ? "s" : ""}`}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 rounded-md transition-transform hover:scale-110 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#6B1F4A]"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        isFilled
                          ? "fill-amber-400 text-amber-400"
                          : "fill-slate-100 text-slate-300"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Título de la reseña */}
          <div>
            <label htmlFor="review-title" className="block text-xs font-medium text-slate-700 mb-1.5">
              Título de la reseña <span className="text-rose-500">*</span>
            </label>
            <input
              ref={titleInputRef}
              id="review-title"
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Controló el brillo desde la primera semana"
              maxLength={80}
              required
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#6B1F4A] focus:border-[#6B1F4A] transition"
            />
            <span className="block text-[10px] text-slate-400 font-light mt-1 text-right">
              {titulo.length}/80 caracteres
            </span>
          </div>

          {/* Texto de la reseña */}
          <div>
            <label htmlFor="review-text" className="block text-xs font-medium text-slate-700 mb-1.5">
              Tu reseña completa <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="review-text"
              rows={4}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Cuéntanos sobre la textura, cómo se siente en tu piel y qué cambios notaste..."
              maxLength={1000}
              required
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#6B1F4A] focus:border-[#6B1F4A] transition resize-none"
            />
            <span className="block text-[10px] text-slate-400 font-light mt-1 text-right">
              {texto.length}/1,000 caracteres (mínimo 20)
            </span>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 rounded-full text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-full text-xs font-medium bg-[#6B1F4A] hover:bg-[#531839] text-white transition shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Publicando...</span>
                </>
              ) : (
                <span>Publicar reseña</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

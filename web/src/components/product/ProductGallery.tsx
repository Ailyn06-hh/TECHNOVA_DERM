"use client";

import React, { useState } from "react";
import { NOMBRE_MARCA } from "@/lib/marca";

export interface GalleryImage {
  id: number;
  url?: string | null;
  color_fondo: string;
  color_frasco: string;
  alt?: string | null;
}

interface ProductGalleryProps {
  nombre: string;
  images: GalleryImage[];
}

export default function ProductGallery({ nombre, images }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Asegurar al menos 3 imágenes si no vinieran
  const displayImages =
    images && images.length > 0
      ? images
      : [
          { id: 1, color_fondo: "#F3E1E4", color_frasco: "#D08C98" },
          { id: 2, color_fondo: "#F9ECEE", color_frasco: "#D08C98" },
          { id: 3, color_fondo: "#FAF6F0", color_frasco: "#D08C98" },
        ];

  const activeImage = displayImages[selectedIndex] || displayImages[0];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : displayImages.length - 1));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < displayImages.length - 1 ? prev + 1 : 0));
    }
  };

  return (
    <div
      className="flex flex-col gap-4 outline-none"
      tabIndex={0}
      role="region"
      aria-label={`Galería de imágenes de ${nombre}. Usa las flechas izquierda y derecha para cambiar de imagen.`}
      onKeyDown={handleKeyDown}
    >
      {/* 1. Imagen Principal Grande */}
      <div
        className="w-full aspect-square sm:aspect-[4/3] rounded-3xl p-8 flex items-center justify-center transition-colors duration-300 relative shadow-2xs overflow-hidden"
        style={{ backgroundColor: activeImage.color_fondo || "#F3E1E4" }}
      >
        {activeImage.url ? (
          <img
            src={activeImage.url}
            alt={activeImage.alt || nombre}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="relative flex flex-col items-center justify-center animate-fade-in">
            {/* Silueta vectorial grande del frasco con el nombre de marca en la etiqueta */}
            <svg
              width="150"
              height="230"
              viewBox="0 0 150 230"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-sm transition-transform duration-300 hover:scale-[1.02]"
              aria-hidden="true"
            >
              {/* Tapa negra elegante */}
              <rect x="52" y="10" width="46" height="28" rx="7" fill="#1A1715" />
              {/* Cuello del frasco */}
              <rect x="61" y="38" width="28" height="12" fill="#1A1715" />
              {/* Cuerpo del frasco redondeado */}
              <rect
                x="20"
                y="50"
                width="110"
                height="165"
                rx="30"
                fill={activeImage.color_frasco || "#D08C98"}
              />
              {/* Etiqueta blanca de marca centrada */}
              <text
                x="75"
                y="142"
                textAnchor="middle"
                fill="#FFFFFF"
                fontFamily="serif"
                fontSize="15"
                fontWeight="500"
                letterSpacing="0.05em"
              >
                {NOMBRE_MARCA}
              </text>
            </svg>
          </div>
        )}
      </div>

      {/* 2. Fila de Miniaturas */}
      <div className="flex items-center gap-3">
        {displayImages.map((img, idx) => {
          const isSelected = idx === selectedIndex;

          return (
            <button
              key={img.id || idx}
              type="button"
              onClick={() => setSelectedIndex(idx)}
              aria-label={`Ver imagen ${idx + 1} de ${displayImages.length}`}
              aria-current={isSelected ? "true" : undefined}
              className={`w-20 h-20 rounded-2xl p-2 flex items-center justify-center transition-all cursor-pointer shadow-2xs ${
                isSelected
                  ? "ring-2 ring-[#6B1F4A] ring-offset-2 scale-102"
                  : "opacity-70 hover:opacity-100 hover:scale-101 border border-slate-200/60"
              }`}
              style={{ backgroundColor: img.color_fondo || "#F3E1E4" }}
            >
              {/* Mini silueta del frasco */}
              <div
                className="w-7 h-11 rounded-t-sm rounded-b-md shadow-2xs flex items-center justify-center"
                style={{ backgroundColor: img.color_frasco || "#D08C98" }}
              >
                <div className="w-3.5 h-1.5 bg-white/40 rounded-xs" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

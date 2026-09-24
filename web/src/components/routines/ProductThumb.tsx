"use client";

import React from "react";
import Link from "next/link";

export interface ProductThumbProps {
  nombre: string;
  slug?: string;
  color_fondo?: string;
  color_frasco?: string;
  size?: "sm" | "md" | "lg";
  stepNumber?: number;
  link?: boolean;
  className?: string;
}

export default function ProductThumb({
  nombre,
  slug,
  color_fondo = "#F3E1E4",
  color_frasco = "#D08C98",
  size = "md",
  stepNumber,
  link = true,
  className = "",
}: ProductThumbProps) {
  const sizeClasses = {
    sm: "w-11 h-11 rounded-xl p-1.5",
    md: "w-14 h-14 sm:w-16 sm:h-16 rounded-2xl p-2",
    lg: "w-20 h-20 rounded-2xl p-3",
  };

  const svgSizes = {
    sm: { width: 22, height: 34 },
    md: { width: 28, height: 42 },
    lg: { width: 36, height: 54 },
  };

  const { width, height } = svgSizes[size] || svgSizes.md;

  const content = (
    <div
      className={`relative flex items-center justify-center shadow-xs transition-transform hover:scale-105 shrink-0 ${sizeClasses[size]} ${className}`}
      style={{ backgroundColor: color_fondo || "#F3E1E4" }}
      title={nombre}
    >
      {/* Botella estilizada en SVG idéntica a ProductCard */}
      <svg
        width={width}
        height={height}
        viewBox="0 0 42 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Tapa */}
        <rect x="15" y="2" width="12" height="14" rx="2.5" fill="#1A1715" />
        {/* Cuello */}
        <rect x="17" y="16" width="8" height="4" fill="#1A1715" />
        {/* Cuerpo del frasco */}
        <rect
          x="5"
          y="20"
          width="32"
          height="42"
          rx="9"
          fill={color_frasco || "#D08C98"}
        />
      </svg>

      {/* Indicador opcional de número de paso */}
      {typeof stepNumber === "number" && (
        <span
          className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-[#1A1715] text-white text-[10px] font-bold flex items-center justify-center shadow-xs"
          aria-hidden="true"
        >
          {stepNumber}
        </span>
      )}
    </div>
  );

  if (link && slug) {
    return (
      <Link
        href={`/producto/${slug}`}
        aria-label={`Ver producto ${nombre}`}
        className="block shrink-0 focus:outline-none focus:ring-2 focus:ring-[#6B1F4A] rounded-2xl"
      >
        {content}
      </Link>
    );
  }

  return content;
}

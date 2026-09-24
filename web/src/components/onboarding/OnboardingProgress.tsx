"use client";

import React from "react";

interface OnboardingProgressProps {
  title?: string;
  currentStep?: number;
  stepTitle?: string;
}

export default function OnboardingProgress({
  title,
  stepTitle = "Tu perfil de piel",
}: OnboardingProgressProps) {
  const displayTitle = title || stepTitle;

  return (
    <div className="w-full mb-8">
      {/* Texto superior: Solo 'Tu perfil de piel' */}
      <h3 className="text-xs text-gray-500 font-light mb-2.5 tracking-wide">
        {displayTitle}
      </h3>

      {/* Barra continua en color vino (#6B1F4A) a todo lo ancho */}
      <div
        aria-hidden="true"
        className="w-full h-1 sm:h-1.5 rounded-full bg-[#6B1F4A]"
      />
    </div>
  );
}

"use client";

import React from "react";

interface OnboardingProgressProps {
  currentStep: number; // 1, 2 o 3
  stepTitle: string; // ej. "Tu perfil de piel"
}

export default function OnboardingProgress({
  currentStep,
  stepTitle,
}: OnboardingProgressProps) {
  const totalSteps = 3;

  return (
    <div className="w-full mb-8">
      {/* Texto superior: Paso X de 3 · Título */}
      <p className="text-xs text-gray-500 font-light mb-2.5 tracking-wide">
        Paso {currentStep} de {totalSteps} · {stepTitle}
      </p>

      {/* Barra de progreso de 3 segmentos */}
      <div
        role="progressbar"
        aria-valuenow={currentStep}
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-label={`Paso ${currentStep} de ${totalSteps}: ${stepTitle}`}
        className="flex items-center gap-2.5 w-full"
      >
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNumber = index + 1;
          const isCompletedOrActive = stepNumber <= currentStep;

          return (
            <div
              key={index}
              className={`h-1 sm:h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                isCompletedOrActive ? "bg-[#6B1F4A]" : "bg-[#EAE4DD]"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}

"use client";

import React, { useRef, useEffect } from "react";

interface CodeInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  hasError?: boolean;
  disabled?: boolean;
}

export default function CodeInput({
  value,
  onChange,
  hasError = false,
  disabled = false,
}: CodeInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Enfocar la primera casilla al cargar
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    // Solo permitir caracteres numéricos
    const digitsOnly = rawVal.replace(/\D/g, "");

    if (!digitsOnly) {
      const nextValue = [...value];
      nextValue[index] = "";
      onChange(nextValue);
      return;
    }

    // Si pegan o escriben más de un dígito en el input individual
    if (digitsOnly.length > 1) {
      handlePastedDigits(digitsOnly, index);
      return;
    }

    // Un solo dígito
    const digit = digitsOnly.slice(-1);
    const nextValue = [...value];
    nextValue[index] = digit;
    onChange(nextValue);

    // Mover foco automáticamente a la siguiente casilla si no es la última
    if (digit && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!value[index] && index > 0) {
        // Si la casilla actual ya está vacía, borrar la anterior y enfocarla
        e.preventDefault();
        const nextValue = [...value];
        nextValue[index - 1] = "";
        onChange(nextValue);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      if (index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handlePastedDigits = (digits: string, startIndex: number = 0) => {
    const nextValue = [...value];
    let lastFilledIdx = startIndex;

    for (let i = 0; i < digits.length && startIndex + i < 6; i++) {
      nextValue[startIndex + i] = digits[i];
      lastFilledIdx = startIndex + i;
    }

    onChange(nextValue);

    // Enfocar la siguiente casilla vacía o la última completada
    const focusTarget = Math.min(lastFilledIdx + 1, 5);
    inputRefs.current[focusTarget]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text/plain");
    const digitsOnly = pastedText.replace(/\D/g, "").slice(0, 6);

    if (digitsOnly.length > 0) {
      handlePastedDigits(digitsOnly, 0);
    }
  };

  return (
    <div
      role="group"
      aria-label="Código de verificación de 6 dígitos"
      className="flex items-center justify-between gap-2 sm:gap-3 w-full max-w-[380px] mx-auto"
    >
      {Array.from({ length: 6 }).map((_, index) => {
        const digit = value[index] || "";
        const isFilled = digit.length > 0;

        return (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            disabled={disabled}
            value={digit}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={index === 0 ? handlePaste : undefined}
            autoFocus={index === 0}
            autoComplete={index === 0 ? "one-time-code" : "off"}
            aria-label={`Dígito ${index + 1} de 6`}
            className={`w-11 h-14 sm:w-14 sm:h-16 rounded-xl border text-center font-serif text-2xl sm:text-3xl font-bold transition-all shadow-sm focus:outline-none ${
              hasError
                ? "border-rose-500 bg-rose-50/30 text-rose-900 focus:ring-2 focus:ring-rose-300 focus:border-rose-600"
                : isFilled
                ? "border-[#6B1F4A] bg-white text-[#1A1715] ring-1 ring-[#6B1F4A]/40"
                : "border-gray-200 bg-white text-[#1A1715] hover:border-gray-300 focus:border-[#6B1F4A] focus:ring-2 focus:ring-[#6B1F4A]/30"
            } disabled:opacity-50 disabled:bg-gray-100 disabled:cursor-not-allowed`}
          />
        );
      })}
    </div>
  );
}

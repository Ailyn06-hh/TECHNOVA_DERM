"use client";

import React, { useRef, useEffect, useState } from "react";
import { Barcode, Search, X, AlertCircle } from "lucide-react";

interface ScanSearchInputProps {
  value: string;
  onChange: (val: string) => void;
  onBarcodeScan: (barcode: string) => Promise<boolean>;
  disabled?: boolean;
  inputRef?: React.RefObject<HTMLInputElement>;
}

// Emite un beep sonoro agradable usando Web Audio API sin librerías externas
function playScanBeep(success: boolean) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    if (success) {
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else {
      osc.frequency.setValueAtTime(260, ctx.currentTime); // C4 bajo
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch {}
}

export default function ScanSearchInput({
  value,
  onChange,
  onBarcodeScan,
  disabled = false,
  inputRef,
}: ScanSearchInputProps) {
  const localRef = useRef<HTMLInputElement>(null);
  const actualRef = inputRef || localRef;

  const [scanStatus, setScanStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Autoenfocar al montar
  useEffect(() => {
    actualRef.current?.focus();
  }, [actualRef]);

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onChange("");
      setScanStatus("idle");
      setErrorMessage(null);
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const code = value.trim();
      if (!code) return;

      // Si tiene formato de código de barras numérico (e.g. 8 a 14 dígitos) o SKU
      const ok = await onBarcodeScan(code);
      if (ok) {
        setScanStatus("success");
        setErrorMessage(null);
        playScanBeep(true);
        onChange("");
        setTimeout(() => setScanStatus("idle"), 800);
      } else {
        setScanStatus("error");
        setErrorMessage("Código no registrado");
        playScanBeep(false);
        setTimeout(() => {
          setScanStatus("idle");
          setErrorMessage(null);
        }, 2500);
      }
    }
  };

  return (
    <div className="relative w-full">
      <div
        className={`relative flex items-center bg-white rounded-2xl border transition-all shadow-xs ${
          scanStatus === "success"
            ? "border-emerald-500 ring-2 ring-emerald-200"
            : scanStatus === "error"
            ? "border-rose-500 ring-2 ring-rose-200"
            : "border-stone-300/80 focus-within:border-[#5B122C] focus-within:ring-2 focus-within:ring-[#5B122C]/15"
        }`}
      >
        <div className="pl-4 pr-2 text-stone-400 flex items-center justify-center pointer-events-none">
          <Barcode className="w-5 h-5 text-stone-500" />
        </div>

        <input
          ref={actualRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Escanea el código de barras o busca por nombre..."
          className="w-full py-3.5 pr-10 text-xs sm:text-sm text-stone-900 bg-transparent placeholder-stone-400 outline-none font-medium"
        />

        {value ? (
          <button
            type="button"
            onClick={() => {
              onChange("");
              actualRef.current?.focus();
            }}
            className="absolute right-3 p-1 rounded-full text-stone-400 hover:text-stone-600 active:bg-stone-100"
            aria-label="Limpiar búsqueda"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <div className="absolute right-3.5 text-stone-300 pointer-events-none">
            <Search className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Alerta de código no registrado */}
      {errorMessage && (
        <div
          role="alert"
          className="absolute -bottom-7 left-1 text-xs text-rose-600 font-semibold flex items-center gap-1.5 animate-fade-in"
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}

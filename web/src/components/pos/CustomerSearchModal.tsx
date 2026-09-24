"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, User, X, Check, Loader2, UserPlus } from "lucide-react";
import type { PosClientaInfo } from "@/lib/pos/ventas";

interface CustomerSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: PosClientaInfo | null) => void;
  currentCustomer: PosClientaInfo | null;
}

export default function CustomerSearchModal({
  isOpen,
  onClose,
  onSelectCustomer,
  currentCustomer,
}: CustomerSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<PosClientaInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      setResults([]);
      setFeedback("Escribe al menos 3 caracteres (nombre, celular o correo).");
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // Búsqueda con debounce
  useEffect(() => {
    if (!isOpen) return;
    const term = searchTerm.trim();
    if (term.length < 3) {
      setResults([]);
      setFeedback("Escribe al menos 3 caracteres para buscar.");
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      setFeedback(null);
      try {
        const res = await fetch(`/api/pos/clientes?q=${encodeURIComponent(term)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.clientes || []);
          if ((data.clientes || []).length === 0) {
            setFeedback("No se encontraron clientas registradas con ese dato.");
          }
        } else {
          setFeedback("Error al buscar clientas.");
        }
      } catch {
        setFeedback("Error de conexión al buscar.");
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm, isOpen]);

  // Manejar tecla escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-search-title"
        className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl border border-stone-200 animate-scale-in flex flex-col max-h-[85vh]"
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <div>
            <h3
              id="customer-search-title"
              className="font-serif text-xl font-medium text-stone-900"
            >
              Asignar clienta a la venta
            </h3>
            <p className="text-xs text-stone-400 font-light mt-0.5">
              Busca por nombre, teléfono o correo para sumar la compra a su historial.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input de Búsqueda */}
        <div className="py-4">
          <div className="relative flex items-center bg-stone-50 rounded-2xl border border-stone-300 focus-within:border-[#5B122C] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#5B122C]/10 transition-all">
            <Search className="w-5 h-5 text-stone-400 absolute left-3.5 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ej. Martha, 551122... o correo"
              className="w-full pl-11 pr-10 py-3 text-sm text-stone-900 bg-transparent outline-none placeholder-stone-400"
            />
            {isLoading && (
              <Loader2 className="w-4 h-4 text-stone-400 animate-spin absolute right-3.5" />
            )}
          </div>
        </div>

        {/* Lista de Resultados */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-[180px] max-h-[300px] pr-1">
          {feedback && (
            <p className="text-xs text-stone-400 text-center py-8 font-light">
              {feedback}
            </p>
          )}

          {results.map((c) => {
            const isSelected = currentCustomer?.id === c.id;

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onSelectCustomer(c);
                  onClose();
                }}
                className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all min-h-[56px] active:scale-[0.99] cursor-pointer ${
                  isSelected
                    ? "border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-300"
                    : "border-stone-200 hover:border-stone-300 hover:bg-stone-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-stone-200 text-stone-700 font-semibold text-xs flex items-center justify-center shrink-0">
                    {c.nombre.charAt(0)}
                    {c.apellido.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-stone-900">
                      {c.nombreCompleto}
                    </p>
                    <p className="text-[11px] text-stone-500 font-mono">
                      {c.celularEnmascarado || "Sin celular"} · {c.correo}
                    </p>
                  </div>
                </div>

                {isSelected ? (
                  <span className="text-emerald-700 text-xs font-semibold flex items-center gap-1">
                    <Check className="w-4 h-4" /> Asignada
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-[#5B122C]">
                    Seleccionar
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Pie con opciones */}
        <div className="pt-4 border-t border-stone-100 flex items-center justify-between gap-3">
          {/* TODO: Registro rápido desde POS */}
          <button
            type="button"
            onClick={() => {
              alert("TODO: Registro rápido de clienta nueva desde POS (disponible en versión completa).");
            }}
            className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-800 font-medium py-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Registrar clienta nueva (TODO)</span>
          </button>

          {currentCustomer && (
            <button
              type="button"
              onClick={() => {
                onSelectCustomer(null);
                onClose();
              }}
              className="px-3.5 py-2 rounded-xl text-rose-700 hover:bg-rose-50 text-xs font-semibold transition"
            >
              Quitar clienta actual
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

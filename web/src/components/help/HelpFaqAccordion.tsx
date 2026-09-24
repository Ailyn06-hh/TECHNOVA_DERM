"use client";

import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, ThumbsUp, ThumbsDown, Check, HelpCircle } from "lucide-react";

export interface HelpArticle {
  id: number;
  temaId: number;
  temaSlug: string;
  temaNombre: string;
  slug: string;
  pregunta: string;
  respuesta: string;
  destacado: boolean;
  orden: number;
  utilSi: number;
  utilNo: number;
}

interface HelpFaqAccordionProps {
  articulos: HelpArticle[];
  query?: string;
  titulo?: string;
  onOpenChat?: () => void;
  onOpenWhatsApp?: () => void;
}

export default function HelpFaqAccordion({
  articulos,
  query = "",
  titulo = "Preguntas frecuentes",
  onOpenChat,
  onOpenWhatsApp,
}: HelpFaqAccordionProps) {
  // IDs de preguntas abiertas (pueden ser múltiples)
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());

  // Registro local de votos emitidos por pregunta { [id]: 'si' | 'no' }
  const [votosLocales, setVotosLocales] = useState<Record<number, "si" | "no">>({});
  const [votingId, setVotingId] = useState<number | null>(null);

  // Cargar votos previos desde localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("technova_ayuda_votos");
      if (stored) {
        setVotosLocales(JSON.parse(stored));
      }
    } catch {
      // Ignorar restricciones de almacenamiento en navegación privada
    }
  }, []);

  // Manejar estado inicial: abrir la primera pregunta destacada y procesar ancla #slug
  useEffect(() => {
    if (articulos.length === 0) return;

    const hash = window.location.hash.replace("#", "").trim();
    if (hash) {
      const matched = articulos.find((a) => a.slug === hash);
      if (matched) {
        setOpenIds(new Set([matched.id]));
        setTimeout(() => {
          const el = document.getElementById(matched.slug);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }, 150);
        return;
      }
    }

    // Si no hay ancla, abrir la primera destacada o el primer artículo
    if (openIds.size === 0) {
      const firstDestacada = articulos.find((a) => a.destacado) || articulos[0];
      if (firstDestacada) {
        setOpenIds(new Set([firstDestacada.id]));
      }
    }
  }, [articulos]);

  const toggleQuestion = (id: number, slug: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Actualizar hash en la URL sin causar salto brusco
        try {
          window.history.replaceState(null, "", `#${slug}`);
        } catch {
          // ignore
        }
      }
      return next;
    });
  };

  const handleVoto = async (id: number, util: boolean) => {
    if (votosLocales[id] || votingId === id) return;

    setVotingId(id);
    const tipoVoto: "si" | "no" = util ? "si" : "no";

    try {
      const res = await fetch(`/api/ayuda/${id}/util`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ util }),
      });

      if (res.ok) {
        const nextVotos = { ...votosLocales, [id]: tipoVoto };
        setVotosLocales(nextVotos);
        try {
          localStorage.setItem("technova_ayuda_votos", JSON.stringify(nextVotos));
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.error("[ERROR VOTO AYUDA]:", err);
    } finally {
      setVotingId(null);
    }
  };

  // Función para resaltar coincidencia de búsqueda
  const highlightMatch = (text: string, q: string) => {
    if (!q || q.length < 2) return text;

    // Normalizar para ignorar acentos en la búsqueda
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase() ? (
        <mark key={i} className="bg-amber-100 text-amber-900 rounded px-1 font-semibold">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-8 shadow-xs">
      <h2 className="font-serif text-xl sm:text-2xl font-medium text-stone-900 mb-5 pb-3 border-b border-stone-100">
        {titulo}
      </h2>

      {articulos.length === 0 ? (
        <div className="py-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 mx-auto flex items-center justify-center mb-3">
            <HelpCircle className="w-6 h-6" />
          </div>
          <p className="text-stone-800 font-medium text-sm mb-1">
            No encontramos respuestas para «{query}»
          </p>
          <p className="text-stone-500 text-xs max-w-sm mx-auto mb-5 font-light">
            Nuestro equipo de atención está listo para orientarte con cualquier duda técnica, de envío o de tus productos.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {onOpenWhatsApp && (
              <button
                type="button"
                onClick={onOpenWhatsApp}
                className="px-4 py-2 bg-[#1B4332] text-white text-xs font-semibold rounded-full hover:bg-[#143326] transition-colors cursor-pointer"
              >
                Escríbenos por WhatsApp
              </button>
            )}
            {onOpenChat && (
              <button
                type="button"
                onClick={onOpenChat}
                className="px-4 py-2 border border-stone-300 text-stone-700 text-xs font-semibold rounded-full hover:bg-stone-50 transition-colors cursor-pointer"
              >
                Chat en línea
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="divide-y divide-stone-100">
          {articulos.map((art) => {
            const isOpen = openIds.has(art.id);
            const votoUsuario = votosLocales[art.id];

            return (
              <div
                key={art.id}
                id={art.slug}
                className="py-4 first:pt-0 last:pb-0 transition-colors"
              >
                {/* Cabecera / Pregunta */}
                <button
                  type="button"
                  onClick={() => toggleQuestion(art.id, art.slug)}
                  className="w-full flex items-start justify-between gap-4 text-left group cursor-pointer py-1"
                  aria-expanded={isOpen}
                >
                  <span
                    className={`text-sm sm:text-base font-semibold transition-colors leading-snug ${
                      isOpen ? "text-[#5B122C]" : "text-stone-800 group-hover:text-stone-900"
                    }`}
                  >
                    {highlightMatch(art.pregunta, query)}
                  </span>

                  <div className="shrink-0 mt-0.5 text-stone-400 group-hover:text-stone-700 transition-transform">
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-[#5B122C]" />
                    ) : (
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                  </div>
                </button>

                {/* Respuesta */}
                {isOpen && (
                  <div className="mt-3 pl-0 sm:pl-1 text-xs sm:text-sm text-stone-600 leading-relaxed font-light space-y-3">
                    {art.respuesta.split("\n\n").map((parrafo, idx) => (
                      <p key={idx}>{parrafo}</p>
                    ))}

                    {/* Votación discreta ¿Te sirvió? */}
                    <div className="pt-3 mt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-400">
                      <div className="flex items-center gap-2">
                        <span>¿Te sirvió esta información?</span>
                        {votoUsuario ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <Check className="w-3.5 h-3.5" />
                            <span>Voto registrado</span>
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5 ml-1">
                            <button
                              type="button"
                              onClick={() => handleVoto(art.id, true)}
                              disabled={votingId === art.id}
                              className="px-2.5 py-1 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <ThumbsUp className="w-3 h-3" />
                              <span>Sí</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleVoto(art.id, false)}
                              disabled={votingId === art.id}
                              className="px-2.5 py-1 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <ThumbsDown className="w-3 h-3" />
                              <span>No</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {(art.utilSi > 0 || votoUsuario === "si") && (
                        <span className="text-[11px] text-stone-400 hidden sm:inline">
                          A {art.utilSi + (votoUsuario === "si" ? 1 : 0)} personas les pareció útil
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

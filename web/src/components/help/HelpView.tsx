"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { LogIn, RotateCcw, ShieldCheck, ArrowRight } from "lucide-react";
import HelpSearchBar from "./HelpSearchBar";
import HelpTopicCards, { HelpTopic } from "./HelpTopicCards";
import HelpFaqAccordion, { HelpArticle } from "./HelpFaqAccordion";
import HelpContactBanner from "./HelpContactBanner";
import HelpChatModal from "./HelpChatModal";
import ReturnRequestForm, { EligibleOrder } from "@/components/orders/detail/ReturnRequestForm";
import { NOMBRE_MARCA, WHATSAPP_SOPORTE, DIAS_DEVOLUCION } from "@/lib/marca";
import { useCarrito } from "@/contexts/CarritoContext";

interface HelpViewProps {
  initialTemas: HelpTopic[];
  initialArticulos: HelpArticle[];
  pedidosElegibles?: EligibleOrder[];
  isPublic?: boolean;
  usuario?: {
    nombre?: string;
    correo?: string;
  } | null;
}

export default function HelpView({
  initialTemas,
  initialArticulos,
  pedidosElegibles = [],
  isPublic = false,
  usuario,
}: HelpViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const carrito = useCarrito();
  const showToast = carrito?.showToast || (() => {});

  const [temas] = useState<HelpTopic[]>(initialTemas);
  const [articulosBase] = useState<HelpArticle[]>(initialArticulos);

  // Filtro de tema (sincronizado con URL ?tema=)
  const temaFromUrl = searchParams.get("tema") || null;
  const [temaActivo, setTemaActivo] = useState<string | null>(temaFromUrl);

  // Búsqueda con debounce
  const [inputValue, setInputValue] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Modal de chat
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Actualizar tema activo si cambia la URL
  useEffect(() => {
    setTemaActivo(searchParams.get("tema") || null);
  }, [searchParams]);

  // Debounce de 300 ms para la búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(inputValue.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // Manejar selección de tema
  const handleSelectTema = useCallback(
    (slug: string) => {
      if (temaActivo === slug) {
        // Quitar filtro
        setTemaActivo(null);
        setInputValue("");
        const url = new URL(window.location.href);
        url.searchParams.delete("tema");
        window.history.pushState(null, "", url.toString());
      } else {
        // Activar tema
        setTemaActivo(slug);
        setInputValue("");
        const url = new URL(window.location.href);
        url.searchParams.set("tema", slug);
        window.history.pushState(null, "", url.toString());
      }
    },
    [temaActivo]
  );

  // Función de normalización para quitar acentos
  const normalizeText = (text: string) => {
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  };

  // Filtrado de artículos
  const articulosFiltrados = useMemo(() => {
    // 1. Si hay búsqueda (desde 2 caracteres)
    if (debouncedQuery.length >= 2) {
      const qNorm = normalizeText(debouncedQuery);
      return articulosBase.filter((art) => {
        const pregNorm = normalizeText(art.pregunta);
        const respNorm = normalizeText(art.respuesta);
        return pregNorm.includes(qNorm) || respNorm.includes(qNorm);
      });
    }

    // 2. Si hay tema seleccionado
    if (temaActivo) {
      return articulosBase.filter((art) => art.temaSlug === temaActivo);
    }

    // 3. Sin tema ni búsqueda: destacadas y más útiles
    return articulosBase;
  }, [articulosBase, debouncedQuery, temaActivo]);

  // Título de la sección de preguntas
  const tituloSeccion = useMemo(() => {
    if (debouncedQuery.length >= 2) {
      return `Resultados para «${debouncedQuery}»`;
    }
    if (temaActivo) {
      const temaObj = temas.find((t) => t.slug === temaActivo);
      return `Preguntas sobre ${temaObj?.nombre || temaActivo}`;
    }
    return "Preguntas frecuentes";
  }, [debouncedQuery, temaActivo, temas]);

  const handleOpenWhatsApp = () => {
    window.open(
      `https://wa.me/${WHATSAPP_SOPORTE}?text=${encodeURIComponent(
        "Hola, requiero soporte de Technova-Derm."
      )}`,
      "_blank"
    );
  };

  return (
    <div className="w-full space-y-6 sm:space-y-8">
      {/* Título Serif Grande */}
      <div className="text-center max-w-2xl mx-auto pt-2 pb-1">
        <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-stone-900 tracking-tight">
          ¿En qué te ayudamos?
        </h1>
        <p className="text-stone-500 text-xs sm:text-sm mt-2 font-light">
          Encuentra respuestas rápidas sobre envíos, garantías dermatológicas, facturación y sucursales.
        </p>
      </div>

      {/* Buscador Blanco a Todo lo Ancho con Lupa */}
      <div className="max-w-3xl mx-auto w-full">
        <HelpSearchBar
          value={inputValue}
          onChange={(val) => setInputValue(val)}
          onClear={() => {
            setInputValue("");
            setDebouncedQuery("");
          }}
        />
      </div>

      {/* Fila de 4 Tarjetas Blancas de Tema */}
      <HelpTopicCards
        temas={temas}
        temaActivo={temaActivo}
        onSelectTema={handleSelectTema}
      />

      {/* Dos Tarjetas Lado a Lado */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna Izquierda: Preguntas Frecuentes (Más Ancha) */}
        <div className="lg:col-span-7 w-full">
          <HelpFaqAccordion
            articulos={articulosFiltrados}
            query={debouncedQuery}
            titulo={tituloSeccion}
            onOpenChat={() => setIsChatOpen(true)}
            onOpenWhatsApp={handleOpenWhatsApp}
          />
        </div>

        {/* Columna Derecha: Solicitar Devolución */}
        <div className="lg:col-span-5 w-full">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sm:p-7 shadow-xs">
            <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-stone-100">
              <div className="w-9 h-9 rounded-xl bg-[#FAF3F6] text-[#5B122C] flex items-center justify-center shrink-0">
                <RotateCcw className="w-4 h-4 stroke-[2]" />
              </div>
              <div>
                <h3 className="font-serif text-lg sm:text-xl font-medium text-stone-900 leading-snug">
                  Solicitar devolución
                </h3>
                <span className="text-[11px] text-stone-400">
                  Garantía Dermatológica ({DIAS_DEVOLUCION} días)
                </span>
              </div>
            </div>

            {isPublic ? (
              /* Vista Pública: Invitación a Iniciar Sesión */
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-2xl bg-[#FAF9F6] border border-stone-200/70 text-xs text-stone-600 space-y-2">
                  <div className="flex items-center gap-2 text-stone-900 font-semibold">
                    <ShieldCheck className="w-4 h-4 text-[#5B122C]" />
                    <span>Tu piel está respaldada</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-stone-500 font-light">
                    Si algún producto te causó reacción o no cumplió con tus expectativas, devuélvelo dentro de los {DIAS_DEVOLUCION} días posteriores a la entrega.
                  </p>
                </div>

                <div className="pt-2 text-center">
                  <p className="text-xs text-stone-700 font-medium mb-3">
                    Inicia sesión para consultar tus pedidos y solicitar una devolución.
                  </p>
                  <Link
                    href="/login?volver=/cuenta/ayuda"
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-xs font-semibold text-white bg-[#1A1715] hover:bg-black transition-all shadow-xs cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Iniciar sesión</span>
                  </Link>
                </div>
              </div>
            ) : (
              /* Vista en Mi Cuenta: Formulario de Devolución */
              <ReturnRequestForm
                variant="inline"
                pedidosElegibles={pedidosElegibles}
                onSuccess={(data) => {
                  showToast({
                    message: "Solicitud de devolución recibida con éxito.",
                    type: "success",
                  });
                }}
                showToast={showToast}
              />
            )}
          </div>
        </div>
      </div>

      {/* Tarjeta Final a Todo lo Ancho: ¿Prefieres hablar con alguien? */}
      <HelpContactBanner onOpenChat={() => setIsChatOpen(true)} />

      {/* Modal de Chat y Soporte */}
      <HelpChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        usuarioDefault={usuario}
      />
    </div>
  );
}

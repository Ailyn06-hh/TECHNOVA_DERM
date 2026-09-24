import React from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

export interface SkinProfileData {
  hasProfile: boolean;
  tipoPiel?: string;
  preocupaciones?: string[];
  presupuestoTexto?: string;
}

interface SkinProfileCardProps {
  perfil: SkinProfileData | null;
}

const TIPO_PIEL_LABELS: Record<string, string> = {
  grasa: "Piel grasa",
  seca: "Piel seca",
  mixta: "Piel mixta",
  sensible: "Piel sensible",
  normal: "Piel normal",
};

const PREOCUPACION_LABELS: Record<string, string> = {
  acne: "Acné y brotes",
  manchas: "Manchas y tono irregular",
  lineas: "Líneas finas y arrugas",
  poros: "Poros dilatados",
  brillo: "Control de brillo",
  rojeces: "Rojeces y sensibilidad",
  deshidratacion: "Deshidratación",
  anti_edad: "Anti-edad",
};

export default function SkinProfileCard({ perfil }: SkinProfileCardProps) {
  if (!perfil || !perfil.hasProfile) {
    return (
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-xs flex flex-col justify-between h-full">
        <div>
          <h2 className="font-serif text-xl sm:text-2xl font-medium text-slate-900 mb-2">
            Mi perfil de piel
          </h2>
          <p className="text-xs text-slate-500 font-light leading-relaxed mb-6">
            Completa tu perfil de piel para recibir recomendaciones dermatológicas personalizadas según tus necesidades.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/onboarding/perfil?desde=cuenta"
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-full bg-[#1A1715] hover:bg-[#2C2724] text-white text-xs sm:text-sm font-medium transition shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-rose-300" />
            <span>Completar perfil</span>
          </Link>
        </div>
      </div>
    );
  }

  const tipoLabel = TIPO_PIEL_LABELS[perfil.tipoPiel || ""] || `Piel ${perfil.tipoPiel || "mixta"}`;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-xs flex flex-col justify-between h-full">
      <div>
        {/* Encabezado: Título y Editar */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="font-serif text-xl sm:text-2xl font-medium text-slate-900">
            Mi perfil de piel
          </h2>
          <Link
            href="/onboarding/perfil?desde=cuenta"
            className="text-xs font-semibold text-[#6B1F4A] hover:underline"
          >
            Editar
          </Link>
        </div>

        {/* Chips de tipo de piel y preocupaciones */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200/60">
            {tipoLabel}
          </span>

          {(perfil.preocupaciones || []).map((p) => {
            const label = PREOCUPACION_LABELS[p] || p;
            return (
              <span
                key={p}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/60"
              >
                {label}
              </span>
            );
          })}
        </div>

        {/* Texto de presupuesto */}
        <p className="text-xs text-slate-500 font-light mt-1">
          {perfil.presupuestoTexto || "Presupuesto: $300 - $500 por producto"}
        </p>
      </div>

      <div className="pt-4 border-t border-slate-100">
        <Link
          href="/rutinas"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B1F4A] hover:underline"
        >
          <span>Explorar fórmulas para mi piel</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

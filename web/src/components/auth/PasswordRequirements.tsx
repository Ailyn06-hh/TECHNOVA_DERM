"use client";

import React from "react";
import { Check, AlertTriangle } from "lucide-react";
import { ReglaContrasena } from "@/lib/validaciones";

interface PasswordRequirementsProps {
  reglas: ReglaContrasena[];
  visible: boolean;
}

export default function PasswordRequirements({
  reglas,
  visible,
}: PasswordRequirementsProps) {
  if (!visible) return null;

  const getCumplida = (id: string) => Boolean(reglas.find((r) => r.id === id)?.cumplida);

  const itemsVisuales = [
    {
      id: "longitud",
      texto: "8 o más caracteres",
      cumplida: getCumplida("minimo_caracteres") && getCumplida("maximo_bytes"),
    },
    {
      id: "mayus_minus",
      texto: "Al menos una mayúscula y una minúscula",
      cumplida: getCumplida("mayuscula") && getCumplida("minuscula"),
    },
    {
      id: "numero",
      texto: "Al menos un número",
      cumplida: getCumplida("numero"),
    },
    {
      id: "espacios",
      texto: "Sin espacios al inicio o final",
      cumplida: getCumplida("sin_espacios_extremos"),
    },
    {
      id: "datos_personales",
      texto: "No usar tu nombre, apellido ni correo",
      cumplida: getCumplida("sin_datos_personales"),
    },
  ];

  const esComun = !getCumplida("no_comun");

  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-2.5 p-3.5 rounded-xl bg-[#FAF7F5] border border-[#EAE4DD] space-y-2 animate-fade-in"
    >
      <p className="text-[11px] font-semibold text-gray-700 tracking-wide mb-1.5">
        Requisitos de seguridad:
      </p>

      <ul className="space-y-1.5">
        {itemsVisuales.map((item) => (
          <li
            key={item.id}
            className={`flex items-center gap-2 text-xs transition-colors duration-200 ${
              item.cumplida
                ? "text-[#2C523B] font-medium"
                : "text-gray-500 font-light"
            }`}
          >
            {item.cumplida ? (
              <span className="w-4 h-4 rounded-full bg-[#E3EDE6] flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 text-[#2C523B] stroke-[3]" />
              </span>
            ) : (
              <span className="w-4 h-4 rounded-full border border-gray-300 bg-white shrink-0 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
              </span>
            )}
            <span>{item.texto}</span>
          </li>
        ))}
      </ul>

      {esComun && (
        <div className="pt-1 flex items-center gap-1.5 text-xs text-amber-700 font-normal">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Esta contraseña es muy común o predecible. Elige una más segura.</span>
        </div>
      )}
    </div>
  );
}

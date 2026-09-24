"use client";

import React, { useState, useEffect } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export interface PostalCodeData {
  encontrado: boolean;
  codigoPostal: string;
  ciudad?: string;
  municipio?: string;
  estado?: string;
  estadoAbreviatura?: string;
  colonias: string[];
}

interface PostalCodeLookupProps {
  codigoPostal: string;
  colonia: string;
  ciudad: string;
  estado: string;
  errorCp?: string;
  errorColonia?: string;
  errorCiudad?: string;
  errorEstado?: string;
  onChangeCp: (cp: string) => void;
  onChangeColonia: (colonia: string) => void;
  onChangeCiudad: (ciudad: string) => void;
  onChangeEstado: (estado: string) => void;
}

export default function PostalCodeLookup({
  codigoPostal,
  colonia,
  ciudad,
  estado,
  errorCp,
  errorColonia,
  errorCiudad,
  errorEstado,
  onChangeCp,
  onChangeColonia,
  onChangeCiudad,
  onChangeEstado,
}: PostalCodeLookupProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [colonias, setColonias] = useState<string[]>([]);
  const [cpEncontrado, setCpEncontrado] = useState<boolean | null>(null);
  const [isOtraColonia, setIsOtraColonia] = useState(false);
  const [otraColoniaTexto, setOtraColoniaTexto] = useState("");

  // Al cambiar código postal a 5 dígitos, consultar catálogo
  useEffect(() => {
    const cpLimpio = codigoPostal.replace(/\D/g, "");

    if (cpLimpio.length === 5) {
      let isCancelled = false;
      setIsLoading(true);

      fetch(`/api/codigos-postales/${cpLimpio}`)
        .then((res) => res.json())
        .then((data: PostalCodeData) => {
          if (isCancelled) return;
          if (data && data.encontrado) {
            setCpEncontrado(true);
            const listCol = data.colonias || [];
            setColonias(listCol);

            if (data.ciudad || data.municipio) {
              onChangeCiudad(data.ciudad || data.municipio || "");
            }
            if (data.estadoAbreviatura || data.estado) {
              onChangeEstado(data.estadoAbreviatura || data.estado || "");
            }

            if (listCol.length > 0) {
              if (colonia && listCol.includes(colonia)) {
                setIsOtraColonia(false);
              } else if (colonia && !listCol.includes(colonia)) {
                setIsOtraColonia(true);
                setOtraColoniaTexto(colonia);
              } else {
                setIsOtraColonia(false);
                onChangeColonia(listCol[0]);
              }
            } else {
              setIsOtraColonia(true);
            }
          } else {
            setCpEncontrado(false);
            setColonias([]);
            setIsOtraColonia(true);
          }
        })
        .catch((err) => {
          console.error("[CP LOOKUP ERROR]:", err);
          if (!isCancelled) {
            setCpEncontrado(false);
            setColonias([]);
            setIsOtraColonia(true);
          }
        })
        .finally(() => {
          if (!isCancelled) setIsLoading(false);
        });

      return () => {
        isCancelled = true;
      };
    } else {
      setCpEncontrado(null);
      setColonias([]);
      setIsOtraColonia(false);
    }
  }, [codigoPostal]);

  const handleSelectColonia = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "__OTRA__") {
      setIsOtraColonia(true);
      onChangeColonia(otraColoniaTexto);
    } else {
      setIsOtraColonia(false);
      onChangeColonia(val);
    }
  };

  const handleOtraColoniaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setOtraColoniaTexto(val);
    onChangeColonia(val);
  };

  return (
    <div className="space-y-3.5">
      {/* Fila: Colonia y Código postal */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
        {/* Colonia */}
        <div className="sm:col-span-7">
          <label htmlFor="colonia-field" className="block text-[11px] font-medium text-stone-600 mb-1">
            Colonia o fraccionamiento <span className="text-rose-500">*</span>
          </label>

          {colonias.length > 0 && !isOtraColonia ? (
            <select
              id="colonia-field"
              value={colonia}
              onChange={handleSelectColonia}
              className={`w-full px-3.5 py-2.5 rounded-xl bg-white border text-xs focus:border-[#5B122C] focus:ring-1 focus:ring-[#5B122C] outline-none transition cursor-pointer ${
                errorColonia ? "border-rose-400 ring-1 ring-rose-200" : "border-stone-300"
              }`}
            >
              {colonias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="__OTRA__">+ Escribir otra colonia...</option>
            </select>
          ) : (
            <div>
              <input
                id="colonia-field"
                type="text"
                value={colonia}
                onChange={(e) => {
                  onChangeColonia(e.target.value);
                  setOtraColoniaTexto(e.target.value);
                }}
                placeholder="Ej. Bosques del Prado"
                className={`w-full px-3.5 py-2.5 rounded-xl bg-white border text-xs focus:border-[#5B122C] focus:ring-1 focus:ring-[#5B122C] outline-none transition ${
                  errorColonia ? "border-rose-400 ring-1 ring-rose-200" : "border-stone-300"
                }`}
              />
              {colonias.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOtraColonia(false);
                    onChangeColonia(colonias[0]);
                  }}
                  className="text-[10px] text-[#5B122C] hover:underline mt-1 font-medium block"
                >
                  ← Seleccionar de la lista de este CP
                </button>
              )}
            </div>
          )}
          {errorColonia && <p className="text-[10px] text-rose-600 mt-1">{errorColonia}</p>}
        </div>

        {/* Código Postal */}
        <div className="sm:col-span-5">
          <label htmlFor="cp-field" className="block text-[11px] font-medium text-stone-600 mb-1">
            Código postal <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              id="cp-field"
              type="text"
              inputMode="numeric"
              maxLength={5}
              value={codigoPostal}
              onChange={(e) => onChangeCp(e.target.value.replace(/\D/g, ""))}
              placeholder="Ej. 20127"
              className={`w-full px-3.5 py-2.5 rounded-xl bg-white border text-xs font-mono tracking-wider focus:border-[#5B122C] focus:ring-1 focus:ring-[#5B122C] outline-none transition pr-8 ${
                errorCp ? "border-rose-400 ring-1 ring-rose-200" : "border-stone-300"
              }`}
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 text-[#5B122C] animate-spin" />
              ) : cpEncontrado === true ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : null}
            </div>
          </div>
          {errorCp && <p className="text-[10px] text-rose-600 mt-1">{errorCp}</p>}
        </div>
      </div>

      {/* Nota si no se encontró en catálogo */}
      {cpEncontrado === false && (
        <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/70 text-amber-900 text-[11px] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            No encontramos ese código postal; revisa que sea correcto o escribe tu ciudad y estado a continuación.
          </span>
        </div>
      )}

      {/* Ciudad y Estado (visibles o editables a mano si no se encontró) */}
      {(cpEncontrado === false || !ciudad || !estado) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label htmlFor="ciudad-field" className="block text-[11px] font-medium text-stone-600 mb-1">
              Ciudad / Municipio <span className="text-rose-500">*</span>
            </label>
            <input
              id="ciudad-field"
              type="text"
              value={ciudad}
              onChange={(e) => onChangeCiudad(e.target.value)}
              placeholder="Ej. Aguascalientes"
              className={`w-full px-3.5 py-2.5 rounded-xl bg-white border text-xs focus:border-[#5B122C] focus:ring-1 focus:ring-[#5B122C] outline-none transition ${
                errorCiudad ? "border-rose-400 ring-1 ring-rose-200" : "border-stone-300"
              }`}
            />
            {errorCiudad && <p className="text-[10px] text-rose-600 mt-1">{errorCiudad}</p>}
          </div>

          <div>
            <label htmlFor="estado-field" className="block text-[11px] font-medium text-stone-600 mb-1">
              Estado <span className="text-rose-500">*</span>
            </label>
            <input
              id="estado-field"
              type="text"
              value={estado}
              onChange={(e) => onChangeEstado(e.target.value)}
              placeholder="Ej. Ags."
              className={`w-full px-3.5 py-2.5 rounded-xl bg-white border text-xs focus:border-[#5B122C] focus:ring-1 focus:ring-[#5B122C] outline-none transition ${
                errorEstado ? "border-rose-400 ring-1 ring-rose-200" : "border-stone-300"
              }`}
            />
            {errorEstado && <p className="text-[10px] text-rose-600 mt-1">{errorEstado}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

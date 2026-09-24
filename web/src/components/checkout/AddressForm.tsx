"use client";

import React, { useState, useEffect } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { validarDireccion, type DireccionInput } from "@/lib/validaciones";
import PostalCodeLookup from "@/components/account/addresses/PostalCodeLookup";

export interface DireccionGuardada {
  id: number;
  usuario_id?: number;
  alias: string;
  calle_y_numero: string;
  calle?: string;
  numero_exterior?: string;
  numero_interior?: string | null;
  colonia: string;
  codigo_postal: string;
  ciudad: string;
  estado: string;
  referencias?: string | null;
  predeterminada: boolean | number;
}

export interface AddressFormProps {
  onSuccess: (direccion: DireccionGuardada) => void;
  onCancel?: () => void;
  initialValues?: Partial<DireccionInput>;
  isEditing?: boolean;
  direccionId?: number;
  title?: string;
}

const ALIAS_PREDETERMINADOS = ["Casa", "Trabajo", "Otro"];

export default function AddressForm({
  onSuccess,
  onCancel,
  initialValues,
  isEditing = false,
  direccionId,
  title,
}: AddressFormProps) {
  const initialCalleYNumero =
    initialValues?.calle_y_numero ||
    `${initialValues?.calle || ""} ${initialValues?.numero_exterior || ""}`.trim();

  const [calleYNumero, setCalleYNumero] = useState(initialCalleYNumero);
  const [numeroInterior, setNumeroInterior] = useState(initialValues?.numero_interior || "");
  const [colonia, setColonia] = useState(initialValues?.colonia || "");
  const [codigoPostal, setCodigoPostal] = useState(initialValues?.codigo_postal || "");
  const [ciudad, setCiudad] = useState(initialValues?.ciudad || "");
  const [estado, setEstado] = useState(initialValues?.estado || "");
  const [referencias, setReferencias] = useState(initialValues?.referencias || "");
  const [predeterminada, setPredeterminada] = useState<boolean>(
    initialValues?.predeterminada === true || initialValues?.predeterminada === 1
  );

  // Manejo de chips de Alias: Casa, Trabajo, Otro
  const initialAlias = initialValues?.alias || "Casa";
  const isDefaultChip = ["Casa", "Trabajo"].includes(initialAlias);
  const [selectedChip, setSelectedChip] = useState<string>(isDefaultChip ? initialAlias : "Otro");
  const [customAlias, setCustomAlias] = useState<string>(isDefaultChip ? "" : initialAlias);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Sincronizar si cambian los initialValues (por ejemplo al hacer clic en Editar)
  useEffect(() => {
    if (initialValues) {
      const cYNum =
        initialValues.calle_y_numero ||
        `${initialValues.calle || ""} ${initialValues.numero_exterior || ""}`.trim();
      setCalleYNumero(cYNum);
      setNumeroInterior(initialValues.numero_interior || "");
      setColonia(initialValues.colonia || "");
      setCodigoPostal(initialValues.codigo_postal || "");
      setCiudad(initialValues.ciudad || "");
      setEstado(initialValues.estado || "");
      setReferencias(initialValues.referencias || "");
      setPredeterminada(
        initialValues.predeterminada === true || initialValues.predeterminada === 1
      );

      const al = initialValues.alias || "Casa";
      if (["Casa", "Trabajo"].includes(al)) {
        setSelectedChip(al);
        setCustomAlias("");
      } else {
        setSelectedChip("Otro");
        setCustomAlias(al);
      }
    }
  }, [initialValues]);

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const aliasFinal =
      selectedChip === "Otro" ? customAlias.trim() || "Otro" : selectedChip;

    const payload: Partial<DireccionInput> = {
      alias: aliasFinal,
      calle_y_numero: calleYNumero.trim(),
      numero_interior: numeroInterior.trim() || null,
      colonia: colonia.trim(),
      codigo_postal: codigoPostal.trim(),
      ciudad: ciudad.trim() || "Aguascalientes",
      estado: estado.trim() || "Ags.",
      referencias: referencias.trim() || null,
      predeterminada,
    };

    const validacion = validarDireccion(payload);
    if (!validacion.valido) {
      setErrors(validacion.errores as Record<string, string>);
      return;
    }

    setIsSubmitting(true);
    try {
      const url =
        isEditing && direccionId
          ? `/api/direcciones/${direccionId}`
          : "/api/direcciones";
      const method = isEditing && direccionId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.exito) {
        setServerError(data.error || "No fue posible guardar la dirección.");
        return;
      }

      onSuccess(
        data.direccion || {
          id: direccionId || data.id,
          ...payload,
        }
      );
    } catch {
      setServerError("Error de red al conectar con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs text-stone-700">
      {title && (
        <h3 className="font-serif text-base font-medium text-stone-900 pb-2 border-b border-stone-100">
          {title}
        </h3>
      )}

      {serverError && (
        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Calle y número + Interior */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
        <div className="sm:col-span-8">
          <label htmlFor="calle-field" className="block text-[11px] font-medium text-stone-600 mb-1">
            Calle y número <span className="text-rose-500">*</span>
          </label>
          <input
            id="calle-field"
            type="text"
            value={calleYNumero}
            onChange={(e) => {
              setCalleYNumero(e.target.value);
              clearError("calle_y_numero");
            }}
            placeholder="Ej. Av. Madero 214"
            className={`w-full px-3.5 py-2.5 rounded-xl bg-white border text-xs focus:border-[#5B122C] focus:ring-1 focus:ring-[#5B122C] outline-none transition ${
              errors.calle_y_numero
                ? "border-rose-400 ring-1 ring-rose-200"
                : "border-stone-300"
            }`}
          />
          {errors.calle_y_numero && (
            <p className="text-[10px] text-rose-600 mt-1">{errors.calle_y_numero}</p>
          )}
        </div>

        <div className="sm:col-span-4">
          <label htmlFor="interior-field" className="block text-[11px] font-medium text-stone-600 mb-1">
            Interior <span className="text-stone-400 text-[10px]">(opcional)</span>
          </label>
          <input
            id="interior-field"
            type="text"
            maxLength={10}
            value={numeroInterior}
            onChange={(e) => {
              setNumeroInterior(e.target.value);
              clearError("numero_interior");
            }}
            placeholder="Ej. 3, Depto 4B"
            className={`w-full px-3.5 py-2.5 rounded-xl bg-white border text-xs focus:border-[#5B122C] focus:ring-1 focus:ring-[#5B122C] outline-none transition ${
              errors.numero_interior
                ? "border-rose-400 ring-1 ring-rose-200"
                : "border-stone-300"
            }`}
          />
          {errors.numero_interior && (
            <p className="text-[10px] text-rose-600 mt-1">{errors.numero_interior}</p>
          )}
        </div>
      </div>

      {/* Selector de Colonia y Código Postal con autocompletado */}
      <PostalCodeLookup
        codigoPostal={codigoPostal}
        colonia={colonia}
        ciudad={ciudad}
        estado={estado}
        errorCp={errors.codigo_postal}
        errorColonia={errors.colonia}
        errorCiudad={errors.ciudad}
        errorEstado={errors.estado}
        onChangeCp={(val) => {
          setCodigoPostal(val);
          clearError("codigo_postal");
        }}
        onChangeColonia={(val) => {
          setColonia(val);
          clearError("colonia");
        }}
        onChangeCiudad={(val) => {
          setCiudad(val);
          clearError("ciudad");
        }}
        onChangeEstado={(val) => {
          setEstado(val);
          clearError("estado");
        }}
      />

      {/* Referencias */}
      <div>
        <label htmlFor="ref-field" className="block text-[11px] font-medium text-stone-600 mb-1">
          Referencias de entrega <span className="text-stone-400 text-[10px]">(opcional)</span>
        </label>
        <input
          id="ref-field"
          type="text"
          maxLength={200}
          value={referencias}
          onChange={(e) => {
            setReferencias(e.target.value);
            clearError("referencias");
          }}
          placeholder="Entre calles, color de fachada o reja"
          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-stone-300 focus:border-[#5B122C] focus:ring-1 focus:ring-[#5B122C] outline-none text-xs transition"
        />
        {errors.referencias && (
          <p className="text-[10px] text-rose-600 mt-1">{errors.referencias}</p>
        )}
      </div>

      {/* Alias con Chips: Casa, Trabajo, Otro */}
      <div>
        <label className="block text-[11px] font-medium text-stone-600 mb-1.5">
          Identificador de la dirección <span className="text-rose-500">*</span>
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {ALIAS_PREDETERMINADOS.map((chip) => {
            const isSelected = selectedChip === chip;
            return (
              <button
                key={chip}
                type="button"
                onClick={() => {
                  setSelectedChip(chip);
                  clearError("alias");
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#5B122C] text-white border-[#5B122C] shadow-2xs"
                    : "bg-white text-stone-700 border-stone-300 hover:border-stone-400"
                }`}
              >
                {chip}
              </button>
            );
          })}
        </div>

        {selectedChip === "Otro" && (
          <div className="mt-2.5">
            <input
              type="text"
              maxLength={30}
              value={customAlias}
              onChange={(e) => {
                setCustomAlias(e.target.value);
                clearError("alias");
              }}
              placeholder="Ej. Departamento de playa, Estudio"
              className={`w-full px-3.5 py-2 rounded-xl bg-white border text-xs focus:border-[#5B122C] focus:ring-1 focus:ring-[#5B122C] outline-none transition ${
                errors.alias ? "border-rose-400 ring-1 ring-rose-200" : "border-stone-300"
              }`}
            />
          </div>
        )}
        {errors.alias && <p className="text-[10px] text-rose-600 mt-1">{errors.alias}</p>}
      </div>

      {/* Checkbox Predeterminada */}
      <div className="pt-1">
        <label className="flex items-center gap-2.5 cursor-pointer text-xs text-stone-700">
          <input
            type="checkbox"
            checked={predeterminada}
            onChange={(e) => setPredeterminada(e.target.checked)}
            className="w-4 h-4 rounded-sm text-[#5B122C] accent-[#5B122C] border-stone-300 cursor-pointer"
          />
          <span className="font-normal select-none">Usar como dirección predeterminada</span>
        </label>
      </div>

      {/* Botones de acción */}
      <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-full text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
          >
            Cancelar
          </button>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2.5 rounded-full text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 active:scale-[0.98] transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : (
            <span>{isEditing ? "Guardar cambios" : "Guardar dirección"}</span>
          )}
        </button>
      </div>
    </form>
  );
}

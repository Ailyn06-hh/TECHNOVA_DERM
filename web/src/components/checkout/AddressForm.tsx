"use client";

import React, { useState } from "react";
import { Loader2, Plus, AlertCircle } from "lucide-react";
import { validarDireccion, type DireccionInput } from "@/lib/validaciones";

export interface DireccionGuardada {
  id: number;
  usuario_id?: number;
  alias: string;
  calle: string;
  numero_exterior: string;
  numero_interior?: string | null;
  colonia: string;
  codigo_postal: string;
  ciudad: string;
  estado: string;
  referencias?: string | null;
  predeterminada: number | boolean;
}

export interface AddressFormProps {
  onSuccess: (direccion: DireccionGuardada) => void;
  onCancel?: () => void;
  initialValues?: Partial<DireccionInput>;
}

export default function AddressForm({
  onSuccess,
  onCancel,
  initialValues,
}: AddressFormProps) {
  const [formData, setFormData] = useState<DireccionInput>({
    alias: initialValues?.alias || "Casa",
    calle: initialValues?.calle || "",
    numero_exterior: initialValues?.numero_exterior || "",
    numero_interior: initialValues?.numero_interior || "",
    colonia: initialValues?.colonia || "",
    codigo_postal: initialValues?.codigo_postal || "",
    ciudad: initialValues?.ciudad || "Ciudad de México",
    estado: initialValues?.estado || "CDMX",
    referencias: initialValues?.referencias || "",
    predeterminada: initialValues?.predeterminada ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validacion = validarDireccion(formData);
    if (!validacion.valido) {
      setErrors(validacion.errores as Record<string, string>);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/direcciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.exito) {
        setServerError(data.error || "No se pudo guardar la dirección.");
        return;
      }

      onSuccess(data.direccion);
    } catch {
      setServerError("Error de red al guardar la dirección.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5 text-xs text-slate-700">
      {serverError && (
        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Alias */}
      <div>
        <label className="block text-[11px] font-medium text-slate-500 mb-1">
          Identificador / Alias (ej. Casa, Oficina)
        </label>
        <input
          type="text"
          name="alias"
          value={formData.alias}
          onChange={handleChange}
          placeholder="Casa"
          className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 focus:border-[#6B1F4A] focus:ring-1 focus:ring-[#6B1F4A] outline-none text-xs transition"
        />
      </div>

      {/* Calle y Números */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-6">
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            Calle <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            name="calle"
            value={formData.calle}
            onChange={handleChange}
            placeholder="Av. Álvaro Obregón"
            className={`w-full px-3.5 py-2 rounded-xl bg-white border outline-none text-xs transition ${
              errors.calle ? "border-rose-400 ring-1 ring-rose-200" : "border-slate-200 focus:border-[#6B1F4A]"
            }`}
          />
          {errors.calle && <p className="text-[10px] text-rose-600 mt-0.5">{errors.calle}</p>}
        </div>

        <div className="sm:col-span-3">
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            Núm. Ext. <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            name="numero_exterior"
            value={formData.numero_exterior}
            onChange={handleChange}
            placeholder="123"
            className={`w-full px-3.5 py-2 rounded-xl bg-white border outline-none text-xs transition ${
              errors.numero_exterior ? "border-rose-400 ring-1 ring-rose-200" : "border-slate-200 focus:border-[#6B1F4A]"
            }`}
          />
          {errors.numero_exterior && <p className="text-[10px] text-rose-600 mt-0.5">{errors.numero_exterior}</p>}
        </div>

        <div className="sm:col-span-3">
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            Núm. Int.
          </label>
          <input
            type="text"
            name="numero_interior"
            value={formData.numero_interior || ""}
            onChange={handleChange}
            placeholder="4B (opcional)"
            className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 focus:border-[#6B1F4A] outline-none text-xs transition"
          />
        </div>
      </div>

      {/* Colonia y Código Postal */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        <div className="sm:col-span-8">
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            Colonia / Fraccionamiento <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            name="colonia"
            value={formData.colonia}
            onChange={handleChange}
            placeholder="Roma Norte"
            className={`w-full px-3.5 py-2 rounded-xl bg-white border outline-none text-xs transition ${
              errors.colonia ? "border-rose-400 ring-1 ring-rose-200" : "border-slate-200 focus:border-[#6B1F4A]"
            }`}
          />
          {errors.colonia && <p className="text-[10px] text-rose-600 mt-0.5">{errors.colonia}</p>}
        </div>

        <div className="sm:col-span-4">
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            C.P. (5 dígitos) <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            name="codigo_postal"
            maxLength={5}
            value={formData.codigo_postal}
            onChange={handleChange}
            placeholder="06700"
            className={`w-full px-3.5 py-2 rounded-xl bg-white border outline-none text-xs transition ${
              errors.codigo_postal ? "border-rose-400 ring-1 ring-rose-200" : "border-slate-200 focus:border-[#6B1F4A]"
            }`}
          />
          {errors.codigo_postal && <p className="text-[10px] text-rose-600 mt-0.5">{errors.codigo_postal}</p>}
        </div>
      </div>

      {/* Ciudad y Estado */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            Ciudad / Municipio <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            name="ciudad"
            value={formData.ciudad}
            onChange={handleChange}
            placeholder="Cuauhtémoc / CDMX"
            className={`w-full px-3.5 py-2 rounded-xl bg-white border outline-none text-xs transition ${
              errors.ciudad ? "border-rose-400 ring-1 ring-rose-200" : "border-slate-200 focus:border-[#6B1F4A]"
            }`}
          />
          {errors.ciudad && <p className="text-[10px] text-rose-600 mt-0.5">{errors.ciudad}</p>}
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">
            Estado <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            name="estado"
            value={formData.estado}
            onChange={handleChange}
            placeholder="CDMX"
            className={`w-full px-3.5 py-2 rounded-xl bg-white border outline-none text-xs transition ${
              errors.estado ? "border-rose-400 ring-1 ring-rose-200" : "border-slate-200 focus:border-[#6B1F4A]"
            }`}
          />
          {errors.estado && <p className="text-[10px] text-rose-600 mt-0.5">{errors.estado}</p>}
        </div>
      </div>

      {/* Referencias */}
      <div>
        <label className="block text-[11px] font-medium text-slate-500 mb-1">
          Referencias de entrega (opcional, máx. 200 caracteres)
        </label>
        <textarea
          name="referencias"
          maxLength={200}
          rows={2}
          value={formData.referencias || ""}
          onChange={handleChange}
          placeholder="Entre calles, color de fachada, zaguán..."
          className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 focus:border-[#6B1F4A] outline-none text-xs resize-none transition"
        />
      </div>

      {/* Usar como predeterminada */}
      <div className="flex items-center gap-2 pt-1">
        <input
          type="checkbox"
          id="predeterminada_check"
          name="predeterminada"
          checked={Boolean(formData.predeterminada)}
          onChange={handleChange}
          className="w-4 h-4 text-[#6B1F4A] rounded border-slate-300 focus:ring-[#6B1F4A]"
        />
        <label htmlFor="predeterminada_check" className="text-xs text-slate-600 cursor-pointer">
          Usar esta dirección como predeterminada para futuras compras
        </label>
      </div>

      {/* Botones */}
      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-full border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition"
          >
            Cancelar
          </button>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2 rounded-full bg-[#6B1F4A] hover:bg-[#531839] text-white text-xs font-medium flex items-center gap-1.5 transition shadow-2xs active:scale-95"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              <span>Guardar dirección</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

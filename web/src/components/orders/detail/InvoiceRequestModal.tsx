"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface DatosFiscales {
  rfc?: string;
  razon_social?: string;
  regimen_fiscal?: string;
  codigo_postal_fiscal?: string;
  uso_cfdi?: string;
  correo?: string;
}

interface InvoiceRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  folio: string;
  initialData?: DatosFiscales | null;
  onSuccess: (data: any) => void;
  showToast: (opts: { message: string; type: "success" | "error" | "info" }) => void;
}

const REGIMENES_FISCALES = [
  { clave: "601", nombre: "601 - General de Ley Personas Morales" },
  { clave: "603", nombre: "603 - Personas Morales con Fines no Lucrativos" },
  { clave: "605", nombre: "605 - Sueldos y Salarios e Ingresos Asimilados a Salarios" },
  { clave: "612", nombre: "612 - Personas Físicas con Actividades Empresariales y Profesionales" },
  { clave: "616", nombre: "616 - Sin obligaciones fiscales" },
  { clave: "621", nombre: "621 - Incorporación Fiscal" },
  { clave: "626", nombre: "626 - Régimen Simplificado de Confianza (RESICO)" },
];

const USOS_CFDI = [
  { clave: "G01", nombre: "G01 - Adquisición de mercancías" },
  { clave: "G03", nombre: "G03 - Gastos en general" },
  { clave: "S01", nombre: "S01 - Sin efectos fiscales" },
  { clave: "D01", nombre: "D01 - Honorarios médicos y gastos hospitalarios" },
  { clave: "CP01", nombre: "CP01 - Pagos" },
];

export default function InvoiceRequestModal({
  isOpen,
  onClose,
  folio,
  initialData,
  onSuccess,
  showToast,
}: InvoiceRequestModalProps) {
  const [rfc, setRfc] = useState(initialData?.rfc || "");
  const [razonSocial, setRazonSocial] = useState(initialData?.razon_social || "");
  const [regimenFiscal, setRegimenFiscal] = useState(
    initialData?.regimen_fiscal || "612"
  );
  const [codigoPostal, setCodigoPostal] = useState(
    initialData?.codigo_postal_fiscal || ""
  );
  const [usoCfdi, setUsoCfdi] = useState(initialData?.uso_cfdi || "G01");
  const [correo, setCorreo] = useState(initialData?.correo || "");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const rfcInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setRfc(initialData.rfc || "");
        setRazonSocial(initialData.razon_social || "");
        setRegimenFiscal(initialData.regimen_fiscal || "612");
        setCodigoPostal(initialData.codigo_postal_fiscal || "");
        setUsoCfdi(initialData.uso_cfdi || "G01");
        setCorreo(initialData.correo || "");
      }
      setErrorMsg(null);
      setTimeout(() => rfcInputRef.current?.focus(), 50);
    }
  }, [isOpen, initialData]);

  // Manejo de la tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const rfcLimpio = rfc.trim().toUpperCase();
    const cpLimpio = codigoPostal.trim();
    const razonLimpia = razonSocial.trim();
    const correoLimpio = correo.trim().toLowerCase();

    // Validaciones en cliente
    const rfcRegex = /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/;
    if (!rfcRegex.test(rfcLimpio)) {
      setErrorMsg("El RFC debe ser válido: 12 caracteres (persona moral) o 13 (persona física).");
      return;
    }

    if (!/^\d{5}$/.test(cpLimpio)) {
      setErrorMsg("El código postal fiscal debe tener exactamente 5 dígitos numéricos.");
      return;
    }

    if (!razonLimpia || razonLimpia.length < 3) {
      setErrorMsg("La razón social o nombre fiscal es obligatorio.");
      return;
    }

    if (!correoLimpio || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoLimpio)) {
      setErrorMsg("Proporciona un correo electrónico válido para enviar tu factura.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`/api/cuenta/pedidos/${encodeURIComponent(folio)}/factura`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rfc: rfcLimpio,
          razon_social: razonLimpia,
          regimen_fiscal: regimenFiscal,
          codigo_postal_fiscal: cpLimpio,
          uso_cfdi: usoCfdi,
          correo: correoLimpio,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        const errorText = data?.error || "Error al procesar la solicitud de factura.";
        setErrorMsg(errorText);
        showToast({ message: errorText, type: "error" });
        return;
      }

      showToast({
        message: "Te enviaremos tu factura por correo una vez timbrada.",
        type: "success",
      });

      onSuccess(data);
      onClose();
    } catch (err: any) {
      console.error("[INVOICE REQUEST ERROR]:", err);
      setErrorMsg("Ocurrió un error de red al solicitar la factura.");
      showToast({ message: "Error de conexión al solicitar factura.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-stone-200 shadow-2xl relative overflow-y-auto max-h-[90vh]"
      >
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#5B122C] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="invoice-modal-title"
                className="font-serif text-lg sm:text-xl font-medium text-stone-900"
              >
                Solicitar factura electrónica
              </h2>
              <span className="text-xs text-stone-500 font-light">
                Pedido #{folio} · CFDI versión 4.0
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* RFC */}
          <div>
            <label htmlFor="rfc-input" className="block font-semibold text-stone-800 mb-1">
              RFC (Registro Federal de Contribuyentes) *
            </label>
            <input
              id="rfc-input"
              ref={rfcInputRef}
              type="text"
              required
              maxLength={13}
              value={rfc}
              onChange={(e) => setRfc(e.target.value.toUpperCase())}
              placeholder="XAXX010101000"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 font-mono uppercase text-sm focus:border-[#5B122C] focus:ring-1 focus:ring-[#5B122C] outline-none"
            />
            <span className="text-[11px] text-stone-500 mt-1 block">
              12 caracteres para personas morales o 13 para personas físicas.
            </span>
          </div>

          {/* Razón Social */}
          <div>
            <label htmlFor="razon-input" className="block font-semibold text-stone-800 mb-1">
              Razón Social o Nombre Fiscal *
            </label>
            <input
              id="razon-input"
              type="text"
              required
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              placeholder="Nombre fiscal tal como aparece en tu Constancia SAT"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:border-[#5B122C] focus:ring-1 focus:ring-[#5B122C] outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Código Postal */}
            <div>
              <label htmlFor="cp-input" className="block font-semibold text-stone-800 mb-1">
                Código Postal Fiscal *
              </label>
              <input
                id="cp-input"
                type="text"
                required
                maxLength={5}
                value={codigoPostal}
                onChange={(e) => setCodigoPostal(e.target.value.replace(/\D/g, ""))}
                placeholder="06000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 font-mono text-sm focus:border-[#5B122C] focus:ring-1 focus:ring-[#5B122C] outline-none"
              />
            </div>

            {/* Uso de CFDI */}
            <div>
              <label htmlFor="uso-select" className="block font-semibold text-stone-800 mb-1">
                Uso de CFDI *
              </label>
              <select
                id="uso-select"
                value={usoCfdi}
                onChange={(e) => setUsoCfdi(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:border-[#5B122C] focus:ring-1 focus:ring-[#5B122C] outline-none bg-white"
              >
                {USOS_CFDI.map((u) => (
                  <option key={u.clave} value={u.clave}>
                    {u.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Régimen Fiscal */}
          <div>
            <label htmlFor="regimen-select" className="block font-semibold text-stone-800 mb-1">
              Régimen Fiscal (SAT) *
            </label>
            <select
              id="regimen-select"
              value={regimenFiscal}
              onChange={(e) => setRegimenFiscal(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:border-[#5B122C] focus:ring-1 focus:ring-[#5B122C] outline-none bg-white"
            >
              {REGIMENES_FISCALES.map((r) => (
                <option key={r.clave} value={r.clave}>
                  {r.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Correo para envío */}
          <div>
            <label htmlFor="email-input" className="block font-semibold text-stone-800 mb-1">
              Correo electrónico para recibir los archivos CFDI *
            </label>
            <input
              id="email-input"
              type="email"
              required
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              placeholder="tu-correo@ejemplo.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs focus:border-[#5B122C] focus:ring-1 focus:ring-[#5B122C] outline-none"
            />
          </div>

          <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-full text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 rounded-full text-xs font-semibold text-white bg-[#5B122C] hover:bg-[#4A0E17] active:scale-[0.98] transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Solicitando...</span>
                </>
              ) : (
                <span>Confirmar solicitud</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

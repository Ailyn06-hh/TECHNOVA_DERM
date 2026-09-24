"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Calculator,
  Printer,
  Lock,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  Clock,
  Building2,
  CheckCircle2,
  AlertCircle,
  X,
  FileCheck,
} from "lucide-react";
import type { PosSessionData } from "@/lib/pos-session";
import ShiftSummaryCards, { ShiftIndicatorsData } from "./ShiftSummaryCards";
import CashCountTable, { ArqueoValoresEsperados, ArqueoValoresContados } from "./CashCountTable";
import DenominationCounter, { ConteoDenominaciones } from "./DenominationCounter";
import ShiftNotes from "./ShiftNotes";
import SupervisorPinDialog from "./SupervisorPinDialog";
import CloseShiftConfirm from "./CloseShiftConfirm";
import ShiftClosedPanel, { CorteCerradoData } from "./ShiftClosedPanel";
import PrintableCashClose, { CashClosePrintData } from "./PrintableCashClose";

interface PosCorteApiResponse {
  exito: boolean;
  marca: string;
  yaCerrado: boolean;
  corteDefinitivo?: any;
  turno: {
    id: number;
    inicio: string;
    inicioHora: string;
    fin: string | null;
    finHora: string;
    estado: "abierto" | "cerrado";
    fondoInicial: number;
    horaEntrada: string;
    horaSalida: string;
  };
  caja: {
    id: number;
    nombre: string;
  };
  sucursal: {
    id: number;
    nombre: string;
    sucursalSimple: string;
    correoGerencia: string;
  };
  cajera: {
    id: number;
    nombre: string;
  };
  indicadores: ShiftIndicatorsData;
  esperados: ArqueoValoresEsperados;
  configuracion: {
    tolerancia: number;
    corteCiego: boolean;
  };
  advertencias: {
    tieneBorradorPendiente: boolean;
    itemsEnBorrador: number;
    borradorId: number | null;
  };
}

interface CashClosePageProps {
  session: PosSessionData;
}

export default function CashClosePage({ session }: CashClosePageProps) {
  const [data, setData] = useState<PosCorteApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  // Conteo de valores ingresado por la cajera
  const [contados, setContados] = useState<ArqueoValoresContados>({
    efectivo: 0,
    tarjeta: 0,
    transferencia: 0,
  });

  const [desglose, setDesglose] = useState<ConteoDenominaciones>({});
  const [notas, setNotas] = useState<string>("");
  const [supervisorPin, setSupervisorPin] = useState<string>("");

  // Estado de modales
  const [isDesgloseModalOpen, setIsDesgloseModalOpen] = useState(false);
  const [isSupervisorModalOpen, setIsSupervisorModalOpen] = useState(false);
  const [isCloseConfirmOpen, setIsCloseConfirmOpen] = useState(false);

  // Estado de turno cerrado y pantalla imprimible
  const [closedCorte, setClosedCorte] = useState<CorteCerradoData | null>(null);
  const [printData, setPrintData] = useState<CashClosePrintData | null>(null);

  // Mensaje flotante Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 4500);
  }, []);

  const draftStorageKey = `pos_corte_draft_turno_${session.turnoId}`;

  // 1. Cargar datos del corte desde la API
  const fetchCorteData = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsLoading(true);

    try {
      const res = await fetch("/api/pos/corte");
      if (!res.ok) {
        showToast("Error al consultar datos de corte.");
        return;
      }

      const resJson: PosCorteApiResponse = await res.json();
      if (!resJson.exito) {
        showToast("No se pudo cargar el balance del turno.");
        return;
      }

      setData(resJson);
      setLastRefreshed(new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));

      // Si el turno ya estaba cerrado en la base de datos
      if (resJson.yaCerrado && resJson.corteDefinitivo) {
        const cd = resJson.corteDefinitivo;
        setClosedCorte({
          corteId: cd.id,
          turnoId: cd.turno_id,
          cerradoEn: cd.cerrado_en,
          sucursalNombre: resJson.sucursal.nombre,
          cajaNombre: resJson.caja.nombre,
          cajeraNombre: resJson.cajera.nombre,
          totalEsperado: Number(cd.total_esperado),
          totalContado: Number(cd.total_contado),
          diferenciaTotal: Number(cd.diferencia_total),
          enviadoA: cd.enviado_a || resJson.sucursal.correoGerencia,
          autorizadoPor: cd.autorizado_por ? "Supervisora" : null,
          notas: cd.notas,
        });
        return;
      }

      // Si es la primera carga y no hay valores en sessionStorage, inicializar con los esperados
      const stored = sessionStorage.getItem(draftStorageKey);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.contados) setContados(parsed.contados);
          if (parsed.desglose) setDesglose(parsed.desglose);
          if (parsed.notas) setNotas(parsed.notas);
        } catch {
          // fallback
          setContados({
            efectivo: resJson.esperados.efectivoEsperado,
            tarjeta: resJson.esperados.tarjetaEsperado,
            transferencia: resJson.esperados.transferenciaEsperado,
          });
        }
      } else {
        setContados({
          efectivo: resJson.esperados.efectivoEsperado,
          tarjeta: resJson.esperados.tarjetaEsperado,
          transferencia: resJson.esperados.transferenciaEsperado,
        });
      }
    } catch {
      showToast("Error de conexión al cargar corte de caja.");
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  }, [draftStorageKey, showToast]);

  useEffect(() => {
    fetchCorteData();
  }, [fetchCorteData]);

  // 2. Auto-refresco cada 30 segundos si la ventana no está en un modal
  useEffect(() => {
    if (closedCorte) return;

    const interval = setInterval(() => {
      if (!isDesgloseModalOpen && !isSupervisorModalOpen && !isCloseConfirmOpen && !isSubmitting) {
        fetchCorteData(true);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [closedCorte, isDesgloseModalOpen, isSupervisorModalOpen, isCloseConfirmOpen, isSubmitting, fetchCorteData]);

  // 3. Persistir borrador de conteo en sessionStorage
  useEffect(() => {
    if (closedCorte) return;
    try {
      sessionStorage.setItem(
        draftStorageKey,
        JSON.stringify({ contados, desglose, notas })
      );
    } catch {}
  }, [draftStorageKey, contados, desglose, notas, closedCorte]);

  // 4. Actualizar conteo manual
  const handleUpdateContado = (campo: keyof ArqueoValoresContados, valor: number) => {
    setContados((prev) => ({ ...prev, [campo]: valor }));
  };

  // 5. Aplicar desglose de efectivo
  const handleApplyDesglose = (total: number, breakdown: ConteoDenominaciones) => {
    setContados((prev) => ({ ...prev, efectivo: total }));
    setDesglose(breakdown);
    setIsDesgloseModalOpen(false);
    showToast(`Desglose de efectivo aplicado: $${total.toFixed(2)}`);
  };

  // Cálculos de balance
  const totalEsperado = data?.esperados.totalEsperado || 0;
  const totalContado = Math.round((contados.efectivo + contados.tarjeta + contados.transferencia) * 100) / 100;
  const diferenciaTotal = Math.round((totalContado - totalEsperado) * 100) / 100;
  const tolerancia = data?.configuracion.tolerancia ?? 10;
  const excedeTolerancia = Math.abs(diferenciaTotal) > tolerancia;

  // 6. Flujo de Cierre de Turno
  const handleInitiateClose = () => {
    if (!data) return;

    // Validación de venta en borrador
    if (data.advertencias.tieneBorradorPendiente) {
      showToast(`Tienes una venta con ${data.advertencias.itemsEnBorrador} producto(s) en borrador. Debes cobrarla o cancelarla antes de cerrar.`);
      return;
    }

    // Si excede la tolerancia
    if (excedeTolerancia) {
      if (notas.trim().length < 5) {
        showToast("La diferencia excede la tolerancia. Debes ingresar una justificación en las Notas del Turno.");
        return;
      }

      if (!supervisorPin) {
        setIsSupervisorModalOpen(true);
        return;
      }
    }

    // Abrir confirmación
    setIsCloseConfirmOpen(true);
  };

  // 7. Autorizar supervisora
  const handleAuthorizeSupervisor = async (pin: string): Promise<boolean> => {
    setSupervisorPin(pin);
    setIsSupervisorModalOpen(false);
    // Abrir confirmación tras autorizar PIN
    setIsCloseConfirmOpen(true);
    return true;
  };

  // 8. Confirmar y ejecutar cierre de turno oficial
  const handleExecuteClose = async () => {
    if (!data) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/pos/turnos/cerrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          efectivo_contado: contados.efectivo,
          tarjeta_contado: contados.tarjeta,
          transferencia_contado: contados.transferencia,
          desglose_efectivo: Object.keys(desglose).length > 0 ? desglose : null,
          notas: notas.trim() || null,
          pin_supervisor: supervisorPin || null,
        }),
      });

      const resJson = await res.json();

      if (!res.ok || !resJson.exito) {
        if (resJson.pinInvalido) {
          showToast(resJson.error || "El PIN de supervisión es incorrecto.");
          setSupervisorPin("");
          setIsCloseConfirmOpen(false);
          setIsSupervisorModalOpen(true);
          return;
        }

        showToast(resJson.error || "Error al cerrar el turno.");
        setIsCloseConfirmOpen(false);
        return;
      }

      // Éxito: limpiar draft de sesión
      try {
        sessionStorage.removeItem(draftStorageKey);
      } catch {}

      setIsCloseConfirmOpen(false);

      const corteFinal: CorteCerradoData = {
        corteId: resJson.corteId,
        turnoId: data.turno.id,
        cerradoEn: resJson.corte?.cerradoEn || new Date().toISOString(),
        sucursalNombre: data.sucursal.nombre,
        cajaNombre: data.caja.nombre,
        cajeraNombre: data.cajera.nombre,
        totalEsperado,
        totalContado,
        diferenciaTotal,
        enviadoA: resJson.corte?.enviadoA || data.sucursal.correoGerencia,
        autorizadoPor: resJson.corte?.autorizadoPor || (supervisorPin ? "Supervisora" : null),
        notas: notas || null,
      };

      setClosedCorte(corteFinal);
      showToast("¡Turno cerrado y notificado a gerencia exitosamente!");
    } catch {
      showToast("Error de conexión al procesar el cierre del turno.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 9. Imprimir comprobante
  const handlePrint = (esParcial: boolean) => {
    if (!data) return;

    const fechaInicioTxt = new Date(data.turno.inicio).toLocaleString("es-MX", {
      dateStyle: "short",
      timeStyle: "short",
    });

    const fechaCierreTxt = closedCorte
      ? new Date(closedCorte.cerradoEn).toLocaleString("es-MX", {
          dateStyle: "short",
          timeStyle: "short",
        })
      : new Date().toLocaleString("es-MX", {
          dateStyle: "short",
          timeStyle: "short",
        });

    setPrintData({
      esParcial,
      turnoId: data.turno.id,
      sucursalNombre: data.sucursal.nombre,
      cajaNombre: data.caja.nombre,
      cajeraNombre: data.cajera.nombre,
      inicioTurno: fechaInicioTxt,
      cierreTurno: fechaCierreTxt,
      indicadores: data.indicadores,
      esperados: data.esperados,
      contados,
      diferenciaTotal,
      desglose: Object.keys(desglose).length > 0 ? desglose : null,
      notas: notas || null,
      supervisorNombre: closedCorte?.autorizadoPor || (supervisorPin ? "Supervisora" : null),
    });

    setTimeout(() => {
      window.print();
    }, 150);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12">
        <div className="w-12 h-12 rounded-2xl bg-[#FAF3F6] text-[#5B122C] flex items-center justify-center animate-pulse mb-3">
          <Calculator className="w-6 h-6 animate-spin" />
        </div>
        <p className="font-serif text-lg text-stone-700 font-medium">
          Cargando arqueo y movimientos de caja...
        </p>
        <p className="text-xs text-stone-400 font-light mt-1">
          Turno #{session.turnoId} · {session.sucursalNombreCompleto}
        </p>
      </div>
    );
  }

  // Si el turno ya está cerrado, renderizar pantalla de comprobante
  if (closedCorte) {
    return (
      <>
        <PrintableCashClose data={printData} />
        <div className="flex-1 p-4 sm:p-8 overflow-y-auto">
          <ShiftClosedPanel
            corte={closedCorte}
            onPrint={() => handlePrint(false)}
          />
        </div>
      </>
    );
  }

  return (
    <>
      {/* Componente para impresión térmica 80mm */}
      <PrintableCashClose data={printData} />

      <div className="flex-1 p-4 sm:p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Toast flotante */}
          {toastMessage && (
            <div className="fixed top-6 right-6 z-50 animate-slide-down bg-stone-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-stone-700/60 flex items-center gap-3 text-xs max-w-md">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="flex-1 font-medium">{toastMessage}</span>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="text-stone-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Encabezado Principal */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200/80">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#FAF3F6] text-[#5B122C] flex items-center justify-center shrink-0 shadow-xs border border-[#5B122C]/10">
                <Calculator className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-serif text-2xl sm:text-3xl font-medium text-stone-900">
                    Corte de Caja
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
                    Turno #{data?.turno.id}
                  </span>
                </div>
                <p className="text-xs text-stone-500 font-light mt-0.5">
                  {data?.cajera.nombre} · {data?.sucursal.nombre} · {data?.caja.nombre} · Entrada: {data?.turno.horaEntrada}
                </p>
              </div>
            </div>

            {/* Acciones del encabezado */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePrint(true)}
                title="Imprimir arqueo parcial preliminar"
                className="px-3.5 py-2.5 rounded-2xl border border-stone-200 bg-white text-stone-700 text-xs font-semibold hover:bg-stone-50 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Corte Parcial (X)</span>
              </button>

              <button
                type="button"
                onClick={() => fetchCorteData(false)}
                title="Actualizar movimientos de caja"
                className="p-2.5 rounded-2xl border border-stone-200 bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-colors shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Banner de Advertencia: Venta en borrador pendiente */}
          {data?.advertencias.tieneBorradorPendiente && (
            <div className="p-4 rounded-3xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-shake">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    Venta activa en borrador
                  </h4>
                  <p className="text-xs text-amber-800 font-light">
                    Hay {data.advertencias.itemsEnBorrador} producto(s) en el carrito sin cobrar. Debes finalizar o descartar la venta antes de realizar el corte.
                  </p>
                </div>
              </div>

              <Link
                href="/pos/venta"
                className="px-4 py-2 rounded-xl bg-amber-800 text-white text-xs font-semibold hover:bg-amber-900 transition-colors flex items-center justify-center gap-1.5 shrink-0"
              >
                <span>Ir a Nueva Venta</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* 1. Tarjetas de Resumen Operativo */}
          {data && <ShiftSummaryCards indicadores={data.indicadores} />}

          {/* 2. Tabla de Arqueo y Cierre de Valores */}
          {data && (
            <CashCountTable
              esperados={data.esperados}
              contados={contados}
              tolerancia={tolerancia}
              corteCiegoInicial={data.configuracion.corteCiego}
              onUpdateContado={handleUpdateContado}
              onOpenDesgloseModal={() => setIsDesgloseModalOpen(true)}
              disabled={isSubmitting}
            />
          )}

          {/* 3. Notas del Turno */}
          <ShiftNotes
            notes={notas}
            onChange={setNotas}
            esObligatorio={excedeTolerancia}
            disabled={isSubmitting}
          />

          {/* 4. Barra Inferior de Acción "Cerrar Turno" */}
          <div className="p-5 rounded-3xl bg-white border border-stone-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-stone-500 font-light">
              <p>
                Última sincronización con movimientos de caja: <strong className="font-mono text-stone-700">{lastRefreshed}</strong>
              </p>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Al confirmar el cierre, se emitirá el Comprobante Final Z y se notificará a gerencia de sucursal.
              </p>
            </div>

            <button
              type="button"
              onClick={handleInitiateClose}
              disabled={isSubmitting || Boolean(data?.advertencias.tieneBorradorPendiente)}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#5B122C] text-white font-serif text-base font-semibold shadow-md hover:bg-[#4A0E24] active:bg-[#3D0B1D] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 min-h-[56px] transition-all cursor-pointer"
            >
              <Lock className="w-5 h-5" />
              <span>Cerrar Turno de Caja</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Desglose de Efectivo */}
      <DenominationCounter
        isOpen={isDesgloseModalOpen}
        esperadoEfectivo={data?.esperados.efectivoEsperado || 0}
        initialCounts={desglose}
        onClose={() => setIsDesgloseModalOpen(false)}
        onApply={handleApplyDesglose}
      />

      {/* Modal Autorización Supervisora */}
      <SupervisorPinDialog
        isOpen={isSupervisorModalOpen}
        diferencia={diferenciaTotal}
        tolerancia={tolerancia}
        onClose={() => setIsSupervisorModalOpen(false)}
        onAuthorize={handleAuthorizeSupervisor}
        isLoading={isSubmitting}
      />

      {/* Modal Confirmar Cierre de Turno */}
      <CloseShiftConfirm
        isOpen={isCloseConfirmOpen}
        turnoId={data?.turno.id || session.turnoId}
        cajaNombre={data?.caja.nombre || session.cajaNombre}
        cajeraNombre={data?.cajera.nombre || `${session.nombre} ${session.apellido}`}
        totalEsperado={totalEsperado}
        totalContado={totalContado}
        diferencia={diferenciaTotal}
        horaSalida={data?.turno.horaSalida || session.horaSalida || "18:00"}
        onClose={() => setIsCloseConfirmOpen(false)}
        onConfirm={handleExecuteClose}
        isLoading={isSubmitting}
      />
    </>
  );
}

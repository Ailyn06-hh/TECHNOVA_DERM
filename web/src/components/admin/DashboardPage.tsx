"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  ShoppingBag,
  Tag,
  AlertTriangle,
  RefreshCw,
  Truck,
  Calendar,
  CheckCircle2,
  Sparkles,
  Layers,
  Store,
  Globe,
  Smartphone,
  MessageSquare,
  Building2,
  ChevronRight,
  Check,
  Loader2,
} from "lucide-react";
import { NOMBRE_MARCA } from "@/lib/marca";

interface DashboardData {
  kpis: {
    ventasHoy: number;
    pedidosHoy: number;
    pctCombos: number;
    productosEnRiesgo: number;
  };
  canales: Array<{
    canal: string;
    clave: string;
    monto: number;
    pedidos: number;
  }>;
  reabastecimiento: Array<{
    productoId: number;
    nombre: string;
    sku: string;
    stockActual: number;
    pronostico4Semanas: number;
    sugeridoCompra: number;
    urgencia: string;
  }>;
  lotesCaducar: Array<{
    loteId: number;
    productoId: number;
    productoNombre: string;
    numeroLote: string;
    fechaCaducidad: string;
    diasRestantes: number;
    cantidadDisponible: number;
    precioNormal: number;
    descuentoSugeridoPct: number;
    precioOfertaSugerido: number;
    aprobado: boolean;
  }>;
  sobrestock: Array<{
    productoId: number;
    nombre: string;
    precioNormal: number;
    stockTotal: number;
    diasEstimadosVenta: number;
    comboSugerido: string;
    descuentoCombo: number;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [aprobandoId, setAprobandoId] = useState<number | null>(null);
  const [aprobados, setAprobados] = useState<Record<number, boolean>>({});

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.ok) {
        const json = await res.json();
        if (json.ok) {
          setData(json);
          // Inicializar estado de aprobados
          const map: Record<number, boolean> = {};
          (json.lotesCaducar || []).forEach((l: any) => {
            if (l.aprobado) map[l.loteId] = true;
          });
          setAprobados(map);
        }
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAprobarDescuento = async (lote: any) => {
    setAprobandoId(lote.loteId);
    try {
      const res = await fetch("/api/admin/dashboard/aprobar-descuento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productoId: lote.productoId,
          loteId: lote.loteId,
          precioOferta: lote.precioOfertaSugerido,
          descuentoPct: lote.descuentoSugeridoPct,
        }),
      });

      if (res.ok) {
        setAprobados((prev) => ({ ...prev, [lote.loteId]: true }));
      }
    } catch (err) {
      alert("Error al aplicar descuento");
    } finally {
      setAprobandoId(null);
    }
  };

  const getCanalIcon = (clave: string) => {
    switch (clave) {
      case "web":
        return <Globe className="w-4 h-4 text-blue-600" />;
      case "pos":
        return <Store className="w-4 h-4 text-emerald-600" />;
      case "app":
        return <Smartphone className="w-4 h-4 text-purple-600" />;
      case "whatsapp":
        return <MessageSquare className="w-4 h-4 text-green-600" />;
      default:
        return <Building2 className="w-4 h-4 text-amber-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-stone-500">
        <Loader2 className="w-8 h-8 animate-spin text-[#5B122C]" />
        <p className="text-sm font-semibold">Cargando Inteligencia Operativa...</p>
      </div>
    );
  }

  const kpis = data?.kpis || { ventasHoy: 0, pedidosHoy: 0, pctCombos: 0, productosEnRiesgo: 0 };
  const canales = data?.canales || [];
  const maxCanalMonto = Math.max(...canales.map((c) => c.monto), 1);

  return (
    <div className="space-y-8 pb-12">
      {/* Header del Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <h1 className="font-serif text-2xl font-bold text-stone-900 tracking-tight">
            Panel de Inteligencia Operativa
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Monitoreo en tiempo real omnicanal · {NOMBRE_MARCA}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-stone-500 bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200">
            {new Date().toLocaleDateString("es-MX", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              timeZone: "America/Mexico_City",
            })}
          </span>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="px-3.5 py-2 bg-stone-900 text-white hover:bg-stone-800 text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* BLOQUE 1: INDICADORES DEL DÍA */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Ventas del día */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Ventas del Día</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-stone-900 font-serif">
            ${kpis.ventasHoy.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">
            +14% vs. mismo día semana pasada
          </p>
        </div>

        {/* KPI 2: Pedidos atendidos */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pedidos Hoy</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-stone-900 font-serif">
            {kpis.pedidosHoy} pedidos
          </p>
          <p className="text-[11px] text-stone-500 font-medium mt-1">
            Web, App, POS y WhatsApp
          </p>
        </div>

        {/* KPI 3: % Vendido en Combos */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">% Ventas en Combos</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-[#5B122C] font-serif">
            {kpis.pctCombos}%
          </p>
          <p className="text-[11px] text-purple-700 font-medium mt-1">
            Alta efectividad promocional
          </p>
        </div>

        {/* KPI 4: Productos en riesgo */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">En Riesgo</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-700 font-serif">
            {kpis.productosEnRiesgo} alertas
          </p>
          <p className="text-[11px] text-amber-800 font-medium mt-1">
            Reabastecimiento y caducidad
          </p>
        </div>
      </div>

      {/* BLOQUE 2: VENTAS POR CANAL Y SOBRESTOCK */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ventas por Canal en Barras (2 columnas) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h2 className="font-serif text-lg font-bold text-stone-900">
                Ventas por Canal (Últimos 30 días)
              </h2>
              <p className="text-xs text-stone-500">
                Desglose omnicanal de ingresos totales
              </p>
            </div>
            <span className="text-xs font-semibold text-[#5B122C] bg-red-50 px-3 py-1 rounded-full">
              5 Canales Activos
            </span>
          </div>

          <div className="space-y-4 pt-2">
            {canales.map((c) => {
              const pctWidth = Math.round((c.monto / maxCanalMonto) * 100);
              return (
                <div key={c.clave} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-stone-800">
                    <div className="flex items-center gap-2">
                      {getCanalIcon(c.clave)}
                      <span>{c.canal}</span>
                      <span className="text-[11px] text-stone-400 font-normal">
                        ({c.pedidos} pedidos)
                      </span>
                    </div>
                    <span className="font-mono text-stone-900 font-bold">
                      ${c.monto.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="w-full h-3.5 bg-stone-100 rounded-full overflow-hidden p-0.5 border border-stone-200/50">
                    <div
                      className="h-full bg-[#5B122C] rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pctWidth, 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sugerencias de Combos por Sobrestock (1 columna) */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#5B122C]" />
                <h2 className="font-serif text-lg font-bold text-stone-900">
                  Sugerencia de Combos
                </h2>
              </div>
              <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Sobrestock &gt; 45 días
              </span>
            </div>

            <div className="space-y-3">
              {(data?.sobrestock || []).slice(0, 3).map((s) => (
                <div
                  key={s.productoId}
                  className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1"
                >
                  <div className="flex justify-between font-bold text-stone-800">
                    <span className="truncate pr-2">{s.nombre}</span>
                    <span className="text-amber-700 shrink-0 font-mono">
                      {s.stockTotal} pzs
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Ritmo actual: ~{s.diasEstimadosVenta} días de inventario.
                  </p>
                  <div className="pt-1 flex items-center justify-between text-[#5B122C] font-semibold text-[11px]">
                    <span>💡 Sugerir: {s.comboSugerido}</span>
                    <span className="bg-red-100 px-1.5 py-0.5 rounded text-[10px]">
                      -{s.descuentoCombo}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100">
            <a
              href="/admin/promociones"
              className="w-full py-2 bg-[#5B122C]/10 text-[#5B122C] hover:bg-[#5B122C]/20 font-bold text-xs rounded-lg flex items-center justify-center gap-1 transition-colors"
            >
              <span>Crear Nuevo Combo</span>
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* BLOQUE 3: ALERTAS DE REABASTECIMIENTO Y LOTES POR CADUCAR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertas de Reabastecimiento con Pronóstico a 4 Semanas */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-amber-700" />
              <h2 className="font-serif text-lg font-bold text-stone-900">
                Alertas de Reabastecimiento
              </h2>
            </div>
            <span className="text-xs font-semibold text-stone-500">
              Pronóstico a 4 Semanas
            </span>
          </div>

          <div className="divide-y divide-stone-100">
            {(data?.reabastecimiento || []).map((item) => (
              <div
                key={item.productoId}
                className="py-3 flex items-center justify-between text-xs gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-stone-800 truncate">{item.nombre}</p>
                  <p className="text-[11px] text-stone-500 font-mono">
                    SKU: {item.sku} · Stock:{" "}
                    <span className="font-bold text-amber-700">{item.stockActual} pzs</span>
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[11px] text-stone-600 font-semibold">
                    Req. 4 sem: <span className="font-bold text-stone-900">{item.pronostico4Semanas} pzs</span>
                  </p>
                  <p className="text-[10px] text-emerald-700 font-bold">
                    Sugerido: +{item.sugeridoCompra} pzs
                  </p>
                </div>

                <a
                  href={`/admin/reabastecimiento?productoId=${item.productoId}`}
                  className="px-3 py-1.5 bg-stone-900 text-white hover:bg-stone-800 rounded-md font-semibold text-[11px] shrink-0 transition-colors shadow-2xs"
                >
                  Crear O.C.
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Lotes por Caducar con Descuento Sugerido y Aprobación Instantánea */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-red-700" />
              <h2 className="font-serif text-lg font-bold text-stone-900">
                Lotes Próximos a Caducar (FEFO)
              </h2>
            </div>
            <span className="text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded">
              Descuento Sugerido
            </span>
          </div>

          <div className="divide-y divide-stone-100">
            {(data?.lotesCaducar || []).map((lote) => {
              const estaAprobado = aprobados[lote.loteId];
              const esAprobando = aprobandoId === lote.loteId;

              return (
                <div
                  key={lote.loteId}
                  className="py-3 flex items-center justify-between text-xs gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-stone-800 truncate">
                      {lote.productoNombre}
                    </p>
                    <p className="text-[11px] text-stone-500">
                      Lote: <span className="font-mono">{lote.numeroLote}</span> · Caduca en{" "}
                      <strong className="text-red-700">{lote.diasRestantes} días</strong> ({lote.cantidadDisponible} pzs)
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="line-through text-stone-400 text-[11px]">
                      ${lote.precioNormal.toFixed(2)}
                    </p>
                    <p className="font-bold text-[#5B122C] text-sm">
                      ${lote.precioOfertaSugerido.toFixed(2)}{" "}
                      <span className="text-[10px] bg-red-100 text-red-800 px-1 rounded font-normal">
                        -{lote.descuentoSugeridoPct}%
                      </span>
                    </p>
                  </div>

                  {estaAprobado ? (
                    <div className="flex items-center gap-1 text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2.5 py-1.5 rounded-md border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Aprobado</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAprobarDescuento(lote)}
                      disabled={esAprobando}
                      className="px-3 py-1.5 bg-[#5B122C] text-white hover:bg-[#430c20] rounded-md font-semibold text-[11px] shrink-0 transition-colors shadow-2xs flex items-center gap-1 disabled:opacity-50"
                    >
                      {esAprobando ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                      <span>Aprobar</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

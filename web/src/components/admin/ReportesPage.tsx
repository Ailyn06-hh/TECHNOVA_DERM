"use client";

import React, { useState, useEffect } from "react";
import {
  Download,
  TrendingUp,
  ShoppingBag,
  RotateCcw,
  ShieldCheck,
  Loader2,
  Calendar,
  Filter,
  BarChart3,
} from "lucide-react";
import { NOMBRE_MARCA } from "@/lib/marca";

interface ReporteData {
  kpis: {
    ventas: number;
    pedidos: number;
    pctRecogida: number;
    pctRecompras: number;
    mermaEvitada: number;
  };
  graficaSemanas: Array<{
    semana: string;
    web: number;
    pos: number;
    app: number;
    whatsapp: number;
  }>;
  masVendidos: Array<{
    id: number;
    nombre: string;
    piezas_vendidas: number;
  }>;
  efectividadCombos: {
    pctCombos: number;
    comboMasVendido: string;
  };
  recordatoriosRecompra: {
    enviados: number;
    compras: number;
  };
  sucursales: Array<{ id: number; nombre: string }>;
}

export default function ReportesPage() {
  const [data, setData] = useState<ReporteData | null>(null);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [periodo, setPeriodo] = useState("30dias");
  const [canal, setCanal] = useState("todos");
  const [sucursalId, setSucursalId] = useState("todas");

  const [exporting, setExporting] = useState(false);

  const loadReportes = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ periodo, canal, sucursalId });
      const res = await fetch(`/api/admin/reportes?${query.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.ok) {
          setData(json);
        }
      }
    } catch (err) {
      console.error("Error al cargar reportes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportes();
  }, [periodo, canal, sucursalId]);

  const handleExportarExcel = async () => {
    setExporting(true);
    try {
      const query = new URLSearchParams({ periodo, canal, sucursalId, exportar: "true" });
      const windowRef = window.open(`/api/admin/reportes?${query.toString()}`, "_blank");
      if (!windowRef) {
        window.location.href = `/api/admin/reportes?${query.toString()}`;
      }
    } catch (err) {
      alert("Error al exportar reporte");
    } finally {
      setTimeout(() => setExporting(false), 1500);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-stone-500">
        <Loader2 className="w-8 h-8 animate-spin text-[#5B122C]" />
        <p className="text-sm font-semibold">Generando reportes y analítica...</p>
      </div>
    );
  }

  const kpis = data?.kpis || { ventas: 412300, pedidos: 1046, pctRecogida: 38, pctRecompras: 27, mermaEvitada: 9800 };
  const graficaSemanas = data?.graficaSemanas || [];
  const masVendidos = data?.masVendidos || [];
  const sucursales = data?.sucursales || [];

  // Calcular máximos para la gráfica proporcional de barras
  const maxVentaSemana = Math.max(
    ...graficaSemanas.map((s) => Math.max(s.web, s.pos, s.app, s.whatsapp)),
    1000
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header Titular con Botón Exportar a Excel (Top Right) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">
            Reportes
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Mide el negocio por periodo, canal, producto y tienda
          </p>
        </div>

        <button
          onClick={handleExportarExcel}
          disabled={exporting}
          className="px-4 py-2.5 bg-[#1A1715] hover:bg-stone-800 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 self-start sm:self-auto disabled:opacity-50"
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span>Exportar a Excel</span>
        </button>
      </div>

      {/* BARRA DE FILTROS DE 3 SELECTS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Select 1: Periodo */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Periodo
          </label>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B122C] text-stone-800 font-medium shadow-2xs"
          >
            <option value="30dias">Últimos 30 días</option>
            <option value="7dias">Últimos 7 días</option>
            <option value="mes">Este mes</option>
            <option value="ano">Año actual</option>
          </select>
        </div>

        {/* Select 2: Canal */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Canal
          </label>
          <select
            value={canal}
            onChange={(e) => setCanal(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B122C] text-stone-800 font-medium shadow-2xs"
          >
            <option value="todos">Todos</option>
            <option value="web">Tienda Web</option>
            <option value="pos">Tienda (POS)</option>
            <option value="app">App</option>
            <option value="whatsapp_marketplace">WhatsApp y marketplace</option>
          </select>
        </div>

        {/* Select 3: Tienda */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            Tienda
          </label>
          <select
            value={sucursalId}
            onChange={(e) => setSucursalId(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B122C] text-stone-800 font-medium shadow-2xs"
          >
            <option value="todas">Todas</option>
            {sucursales.map((suc) => (
              <option key={suc.id} value={suc.id}>
                {NOMBRE_MARCA} {suc.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* BLOQUE 1: TARJETAS DE KPIS PRINCIPALES (4 TARJETAS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Ventas */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-2xs space-y-1">
          <span className="text-xs text-stone-500 font-medium">Ventas</span>
          <p className="font-serif text-3xl font-bold text-stone-900 tracking-tight">
            ${kpis.ventas.toLocaleString("es-MX")}
          </p>
          <p className="text-[11px] text-stone-500 font-medium pt-1">
            {canal === "todos" ? "Todos los canales" : `Canal: ${canal}`}
          </p>
        </div>

        {/* KPI 2: Pedidos */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-2xs space-y-1">
          <span className="text-xs text-stone-500 font-medium">Pedidos</span>
          <p className="font-serif text-3xl font-bold text-stone-900 tracking-tight">
            {kpis.pedidos.toLocaleString("es-MX")}
          </p>
          <p className="text-[11px] text-emerald-700 font-medium pt-1">
            {kpis.pctRecogida}% para recoger en tienda
          </p>
        </div>

        {/* KPI 3: Recompras */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-2xs space-y-1">
          <span className="text-xs text-stone-500 font-medium">Recompras</span>
          <p className="font-serif text-3xl font-bold text-stone-900 tracking-tight">
            {kpis.pctRecompras}%
          </p>
          <p className="text-[11px] text-emerald-700 font-medium pt-1">
            de clientas volvieron a comprar
          </p>
        </div>

        {/* KPI 4: Merma evitada */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-2xs space-y-1">
          <span className="text-xs text-stone-500 font-medium">Merma evitada</span>
          <p className="font-serif text-3xl font-bold text-stone-900 tracking-tight">
            ${kpis.mermaEvitada.toLocaleString("es-MX")}
          </p>
          <p className="text-[11px] text-emerald-700 font-medium pt-1">
            por descuentos a tiempo
          </p>
        </div>
      </div>

      {/* BLOQUE 2: GRÁFICA DE VENTAS POR SEMANA Y CANAL + MÁS VENDIDOS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* GRÁFICA DE VENTAS POR SEMANA Y CANAL (8 Columnas en Desktop) */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-stone-200/80 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
            <h2 className="font-serif text-lg font-bold text-stone-900">
              Ventas por semana y canal
            </h2>

            {/* Leyenda de Canales */}
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-stone-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#5B122C]" />
                Web
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#1C1917]" />
                Tienda (POS)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]" />
                App
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                WhatsApp y marketplace
              </span>
            </div>
          </div>

          {/* Renderizado de Barras de Gráfica por Semana */}
          <div className="grid grid-cols-4 gap-4 pt-4 h-64 items-end border-b border-stone-200 pb-3">
            {graficaSemanas.map((s) => (
              <div key={s.semana} className="flex flex-col items-center gap-2 h-full justify-end">
                {/* Grupo de 4 Barras por Semana */}
                <div className="flex items-end gap-1.5 w-full justify-center h-48">
                  {/* Barra Web */}
                  <div
                    className="w-3.5 bg-[#5B122C] rounded-t-md transition-all duration-500 hover:opacity-90"
                    style={{ height: `${Math.max((s.web / maxVentaSemana) * 100, 10)}%` }}
                    title={`Web: $${s.web.toLocaleString()}`}
                  />
                  {/* Barra POS */}
                  <div
                    className="w-3.5 bg-[#1C1917] rounded-t-md transition-all duration-500 hover:opacity-90"
                    style={{ height: `${Math.max((s.pos / maxVentaSemana) * 100, 8)}%` }}
                    title={`POS: $${s.pos.toLocaleString()}`}
                  />
                  {/* Barra App */}
                  <div
                    className="w-3.5 bg-[#8B5CF6] rounded-t-md transition-all duration-500 hover:opacity-90"
                    style={{ height: `${Math.max((s.app / maxVentaSemana) * 100, 6)}%` }}
                    title={`App: $${s.app.toLocaleString()}`}
                  />
                  {/* Barra WhatsApp */}
                  <div
                    className="w-3.5 bg-[#10B981] rounded-t-md transition-all duration-500 hover:opacity-90"
                    style={{ height: `${Math.max((s.whatsapp / maxVentaSemana) * 100, 4)}%` }}
                    title={`WhatsApp: $${s.whatsapp.toLocaleString()}`}
                  />
                </div>
                <span className="text-xs font-semibold text-stone-600">{s.semana}</span>
              </div>
            ))}
          </div>
        </div>

        {/* LISTA MÁS VENDIDOS (4 Columnas en Desktop) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-stone-200/80 shadow-2xs space-y-4">
          <h2 className="font-serif text-lg font-bold text-stone-900 border-b border-stone-100 pb-3">
            Más vendidos
          </h2>

          <div className="divide-y divide-stone-100 space-y-2">
            {masVendidos.map((prod, idx) => (
              <div
                key={prod.id || idx}
                className="py-2.5 flex items-center justify-between text-xs gap-2"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-serif font-bold text-stone-400 text-sm w-4 shrink-0 text-right">
                    {idx + 1}
                  </span>
                  <span className="font-medium text-stone-800 truncate">
                    {prod.nombre}
                  </span>
                </div>
                <span className="font-bold font-mono text-stone-900 shrink-0">
                  {prod.piezas_vendidas} pzas
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BLOQUE 3: TARJETAS INFERIORES DE EFECTIVIDAD Y RECORDATORIOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tarjeta 1: Efectividad de combos */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-2xs space-y-2">
          <h3 className="font-bold text-stone-900 text-base">
            Efectividad de combos
          </h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            <strong>{data?.efectividadCombos?.pctCombos || 34}%</strong> de las ventas incluyen un combo. «
            <strong className="text-stone-900">{data?.efectividadCombos?.comboMasVendido || "Rutina piel mixta"}</strong>» es el más vendido.
          </p>
        </div>

        {/* Tarjeta 2: Recordatorios de recompra */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-2xs space-y-2">
          <h3 className="font-bold text-stone-900 text-base">
            Recordatorios de recompra
          </h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            De <strong>{data?.recordatoriosRecompra?.enviados || 310}</strong> recordatorios enviados,{" "}
            <strong className="text-stone-900">{data?.recordatoriosRecompra?.compras || 84}</strong> terminaron en compra.
          </p>
        </div>
      </div>

      {/* Footer Nota del Prototipo */}
      <div className="text-[11px] text-stone-400">
        Cifras de ejemplo para el prototipo.
      </div>
    </div>
  );
}

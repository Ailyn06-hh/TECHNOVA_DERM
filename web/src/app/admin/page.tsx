"use client";

import { useEffect, useState } from "react";
import {
  api,
  InventorySummary,
  ProductForecast,
  PricingRecommendation,
} from "@/lib/api";
import {
  LineChart as LineChartIcon,
  TrendingUp,
  AlertTriangle,
  Zap,
  Package,
  Layers,
  CheckCircle,
  Truck,
  RotateCw,
  Sparkles,
  Info,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

export default function AdminBrainPage() {
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [forecasts, setForecasts] = useState<ProductForecast[]>([]);
  const [pricingRecs, setPricingRecs] = useState<PricingRecommendation[]>([]);
  const [selectedForecastIndex, setSelectedForecastIndex] = useState(0);
  const [supplierOrders, setSupplierOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadAllIntelligenceData = async () => {
    try {
      setLoading(true);
      const [sum, fcasts, recs, sOrders] = await Promise.all([
        api.getInventorySummary(),
        api.getAllForecasts(),
        api.getPricingRecommendations(),
        api.getSupplierOrders(),
      ]);
      setSummary(sum);
      setForecasts(fcasts);
      setPricingRecs(recs);
      setSupplierOrders(sOrders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllIntelligenceData();
  }, []);

  const handleRetrain = async () => {
    try {
      setRetraining(true);
      const res = await fetch("http://localhost:8000/api/forecast/retrain", { method: "POST" });
      const data = await res.json();
      setSuccessMessage("✅ " + data.message);
      await loadAllIntelligenceData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert("Error al reentrenar modelos: " + err.message);
    } finally {
      setRetraining(false);
    }
  };

  const handleApplySinglePrice = async (productId: number, newPrice: number) => {
    try {
      await api.applyPricing(productId, newPrice);
      setSuccessMessage("✅ Precio dinámico actualizado y propagado a todos los canales (Web, App, POS).");
      await loadAllIntelligenceData();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleApplyAllPricing = async () => {
    try {
      const res = await api.applyAllPricing();
      setSuccessMessage("⚡ " + res.message);
      await loadAllIntelligenceData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const handleGenerateReorder = async (productId: number) => {
    try {
      const res = await api.generateSupplierReorder(productId);
      setSuccessMessage(`📦 Orden de compra ${res.order_code} creada exitosamente por ${res.quantity_ordered} unidades.`);
      await loadAllIntelligenceData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert("Error al generar orden: " + err.message);
    }
  };

  const currentForecast = forecasts[selectedForecastIndex];

  // Preparar dataset combinado para Recharts (Histórico + Forecast)
  const chartData = currentForecast
    ? [
        ...currentForecast.historical_sales_last_14d.map((h) => ({
          date: h.day_name,
          ventasReales: h.actual_sales,
          demandaProyectadaML: null,
          tipo: "Histórico Real",
        })),
        ...currentForecast.forecast_curve_14d.map((f) => ({
          date: f.day_name,
          ventasReales: null,
          demandaProyectadaML: f.predicted_demand,
          tipo: "Forecast scikit-learn",
        })),
      ]
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      {/* Header Cerebro Digital */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-nacar-200 gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-nacar-900 text-amber-300">
              <Zap className="w-5 h-5" />
            </span>
            <h1 className="font-serif text-2xl md:text-3xl font-semibold text-nacar-900">
              Cerebro Digital MiPyME · Nácar
            </h1>
          </div>
          <p className="text-xs md:text-sm text-nacar-600 font-light">
            Infraestructura de E-Business: Predicción de Demanda con <strong>Machine Learning (scikit-learn)</strong> + Motor de <strong>Dynamic Pricing</strong> en Tiempo Real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRetrain}
            disabled={retraining}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-nacar-300 text-nacar-800 rounded-xl text-xs font-semibold hover:bg-nacar-100 transition shadow-sm disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${retraining ? "animate-spin" : ""}`} />
            <span>{retraining ? "Entrenando scikit-learn..." : "Reentrenar Modelo ML"}</span>
          </button>
          <button
            onClick={handleApplyAllPricing}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-semibold hover:bg-emerald-800 transition shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Aplicar Precios Dinámicos a Todos los Canales</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs rounded-xl flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-nacar-200 shadow-sm">
            <span className="text-xs text-nacar-500 font-medium block mb-1">Inventario Central Unificado</span>
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-3xl font-bold text-nacar-900">
                {summary.total_units_in_stock}
              </span>
              <span className="text-xs text-nacar-600">piezas en total</span>
            </div>
            <p className="text-[11px] text-nacar-500 mt-2 font-mono">
              Valoración: ${summary.inventory_valuation_retail.toLocaleString()} MXN
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-nacar-200 shadow-sm">
            <span className="text-xs text-nacar-500 font-medium block mb-1">Semáforo de Riesgo (ML)</span>
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-3xl font-bold text-amber-600">
                {summary.critical_stock_count}
              </span>
              <span className="text-xs text-amber-700 font-medium">SKUs en riesgo crítico</span>
            </div>
            <p className="text-[11px] text-rose-600 mt-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              <span>Agotamiento proyectado en &lt; 5 días</span>
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-nacar-200 shadow-sm">
            <span className="text-xs text-nacar-500 font-medium block mb-1">Algoritmo de Precios Activo</span>
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-3xl font-bold text-emerald-700">100%</span>
              <span className="text-xs text-emerald-800">Sincronizado</span>
            </div>
            <p className="text-[11px] text-nacar-500 mt-2">
              Propagación en vivo: Web, App y POS
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-nacar-200 shadow-sm">
            <span className="text-xs text-nacar-500 font-medium block mb-1">Ventas por Canal Omnicanal</span>
            <div className="space-y-1 mt-2 text-xs">
              <div className="flex justify-between text-nacar-700">
                <span>Web:</span>
                <span className="font-mono font-semibold">{summary.channel_distribution["WEB"]?.units || 0} u.</span>
              </div>
              <div className="flex justify-between text-nacar-700">
                <span>POS Mostrador:</span>
                <span className="font-mono font-semibold">{summary.channel_distribution["POS"]?.units || 0} u.</span>
              </div>
              <div className="flex justify-between text-nacar-700">
                <span>App Móvil:</span>
                <span className="font-mono font-semibold">{summary.channel_distribution["APP"]?.units || 0} u.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN 1: MACHINE LEARNING DEMAND FORECAST */}
      <div className="bg-white border border-nacar-200 rounded-2xl p-6 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-nacar-100 gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-nacar-100 text-nacar-800">
                <TrendingUp className="w-4 h-4 text-nacar-700" />
              </span>
              <h2 className="font-serif text-xl font-semibold text-nacar-900">
                1. Predicción de Demanda con Machine Learning (scikit-learn)
              </h2>
            </div>
            <p className="text-xs text-nacar-600 mt-0.5">
              Modelo Random Forest entrenado con variables de estacionalidad semanal, quincenas mexicanas y momentum de ventas.
            </p>
          </div>

          {/* SKU Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-nacar-600">Analizar SKU:</span>
            <select
              value={selectedForecastIndex}
              onChange={(e) => setSelectedForecastIndex(Number(e.target.value))}
              className="px-3 py-1.5 rounded-lg border border-nacar-200 bg-nacar-50 text-xs text-nacar-900 font-medium focus:outline-none"
            >
              {forecasts.map((f, idx) => (
                <option key={f.product_id} value={idx}>
                  {f.sku} - {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {currentForecast && (
          <div>
            {/* Forecast Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-nacar-50 mb-6 border border-nacar-200 text-xs">
              <div>
                <span className="text-nacar-500 block">Stock Central Actual:</span>
                <span className="font-serif text-xl font-bold text-nacar-900">
                  {currentForecast.stock_central} u.
                </span>
              </div>
              <div>
                <span className="text-nacar-500 block">Demanda Diaria Predicha:</span>
                <span className="font-serif text-xl font-bold text-emerald-800">
                  ~{currentForecast.avg_daily_demand_forecast} u./día
                </span>
              </div>
              <div>
                <span className="text-nacar-500 block">Fecha Agotamiento (Runout Date):</span>
                <span
                  className={`font-serif text-base font-bold ${
                    currentForecast.days_until_runout && currentForecast.days_until_runout <= currentForecast.lead_time_days
                      ? "text-rose-600"
                      : "text-nacar-900"
                  }`}
                >
                  {currentForecast.runout_date || "Cobertura amplia"}
                  <span className="block text-[10px] font-sans font-normal text-nacar-600">
                    ({currentForecast.days_until_runout} días restantes)
                  </span>
                </span>
              </div>
              <div>
                <span className="text-nacar-500 block">Reorden Sugerida por ML (ROP):</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-serif text-xl font-bold text-nacar-900">
                    {currentForecast.suggested_reorder_qty} u.
                  </span>
                  {currentForecast.suggested_reorder_qty > 0 && (
                    <button
                      onClick={() => handleGenerateReorder(currentForecast.product_id)}
                      className="px-2.5 py-1 bg-nacar-900 hover:bg-nacar-800 text-white rounded text-[11px] font-medium transition"
                    >
                      Generar Orden
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Recharts Chart */}
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e8ded6" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#7c5a47" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#7c5a47" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FAF7F5",
                      borderColor: "#DBC8BC",
                      borderRadius: "12px",
                      fontSize: "11px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  <Bar
                    dataKey="ventasReales"
                    fill="#C4A897"
                    name="Ventas Reales Históricas"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    type="monotone"
                    dataKey="demandaProyectadaML"
                    stroke="#2A9D8F"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#2A9D8F" }}
                    name="Proyección Machine Learning (14 días)"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-nacar-500 text-center mt-2 italic">
              Nótese el incremento proyectado por el modelo en los días correspondientes a quincena mexicana y fines de semana.
            </p>
          </div>
        )}
      </div>

      {/* SECCIÓN 2: DYNAMIC PRICING ENGINE */}
      <div className="bg-white border border-nacar-200 rounded-2xl p-6 shadow-sm mb-8">
        <div className="flex items-center justify-between pb-4 border-b border-nacar-100 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-100 text-amber-900">
                <Zap className="w-4 h-4 text-amber-700" />
              </span>
              <h2 className="font-serif text-xl font-semibold text-nacar-900">
                2. Motor de Dynamic Pricing en Tiempo Real
              </h2>
            </div>
            <p className="text-xs text-nacar-600 mt-0.5">
              Correlaciona la escasez de stock con la velocidad de demanda de ML. Eleva el margen en escasez y aplica descuento en sobreinventario.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-nacar-200 text-nacar-600 uppercase tracking-wider text-[10px] bg-nacar-50">
                <th className="py-3 px-3">Producto / SKU</th>
                <th className="py-3 px-3">Stock Central</th>
                <th className="py-3 px-3">Precio Base</th>
                <th className="py-3 px-3">Precio Actual</th>
                <th className="py-3 px-3 text-emerald-800">Sugerido por Algoritmo</th>
                <th className="py-3 px-3">Estrategia & Justificación ML</th>
                <th className="py-3 px-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-nacar-100">
              {pricingRecs.map((rec) => {
                const isPriceDifferent = Math.abs(rec.recommended_price - rec.current_price) > 0.5;
                const isDiscount = rec.recommended_price < rec.base_price;
                const isScarcity = rec.strategy_applied === "SCARCITY_PREMIUM";

                return (
                  <tr key={rec.product_id} className="hover:bg-nacar-50/50 transition">
                    <td className="py-3 px-3">
                      <div className="font-medium text-nacar-900">{rec.name}</div>
                      <span className="text-[10px] text-nacar-500 font-mono">{rec.sku}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`font-mono px-2 py-0.5 rounded text-[11px] font-semibold ${
                          rec.stock_current <= 10
                            ? "bg-rose-100 text-rose-800"
                            : rec.stock_current > 80
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-50 text-emerald-800"
                        }`}
                      >
                        {rec.stock_current} u.
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-nacar-500">
                      ${rec.base_price.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold text-nacar-900">
                      ${rec.current_price.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-800 text-sm">
                      ${rec.recommended_price.toFixed(2)}
                      {rec.price_change_percent !== 0 && (
                        <span
                          className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${
                            rec.price_change_percent > 0
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {rec.price_change_percent > 0 ? "+" : ""}
                          {rec.price_change_percent}%
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 max-w-xs">
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded uppercase mb-1 ${
                          isScarcity
                            ? "bg-amber-100 text-amber-800"
                            : isDiscount
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {rec.strategy_applied}
                      </span>
                      <p className="text-[11px] text-nacar-600 font-light leading-snug">
                        {rec.reason}
                      </p>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {isPriceDifferent ? (
                        <button
                          onClick={() => handleApplySinglePrice(rec.product_id, rec.recommended_price)}
                          className="px-3 py-1.5 bg-nacar-900 hover:bg-nacar-800 text-white rounded-lg text-[11px] font-semibold transition shadow-sm"
                        >
                          Aplicar ${rec.recommended_price}
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-700 font-medium flex items-center justify-end gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Óptimo
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECCIÓN 3: ÓRDENES A PROVEEDORES SUGERIDAS POR ML */}
      <div className="bg-white border border-nacar-200 rounded-2xl p-6 shadow-sm mb-8">
        <div className="flex items-center gap-2 pb-4 border-b border-nacar-100 mb-4">
          <Truck className="w-4 h-4 text-nacar-800" />
          <h2 className="font-serif text-lg font-semibold text-nacar-900">
            3. Órdenes de Compra a Proveedores Automatizadas por Machine Learning
          </h2>
        </div>

        {supplierOrders.length === 0 ? (
          <p className="text-xs text-nacar-500 py-4 text-center">
            No hay órdenes de compra generadas aún. Usa el botón "Generar Orden" arriba para emitir una con el modelo de ML.
          </p>
        ) : (
          <div className="divide-y divide-nacar-100">
            {supplierOrders.map((order) => (
              <div key={order.id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-nacar-900">{order.order_code}</span>
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-semibold">
                      {order.status}
                    </span>
                  </div>
                  <p className="text-nacar-700 mt-0.5">
                    Producto: <strong>{order.product_name}</strong> · Cantidad ordenada: <strong>{order.quantity_ordered} unidades</strong>
                  </p>
                  <p className="text-[11px] text-nacar-500 italic mt-0.5">
                    {order.ml_reason}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-serif font-bold text-sm text-nacar-900">
                    ${order.total_cost.toFixed(2)} MXN
                  </span>
                  <span className="block text-[10px] text-nacar-500">Costo proveedor</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

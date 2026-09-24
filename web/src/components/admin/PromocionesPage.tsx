"use client";

import React, { useState, useEffect } from "react";
import {
  Tag,
  Sparkles,
  Plus,
  Check,
  X,
  AlertCircle,
  Loader2,
  Clock,
  CheckCircle2,
  ShoppingBag,
  Percent,
} from "lucide-react";
import { NOMBRE_MARCA } from "@/lib/marca";

interface ReglaPromocion {
  clave: string;
  nombre: string;
  descripcion: string;
  tope_texto: string | null;
  activa: number;
}

interface DescuentoPendiente {
  id: number;
  producto_id: number;
  lote_id: number;
  nombre_lote: string;
  piezas: number;
  dias_restantes: number;
  descuento_porcentaje: number;
  estado: string;
  precio: number;
}

interface ProductoCatalog {
  id: number;
  nombre: string;
  sku: string;
  precio: number;
  precio_especial: number | null;
}

interface ComboItem {
  id: number;
  nombre: string;
  descuento_porcentaje: number;
  activo: number;
  productos: Array<{ producto_id: number; nombre: string; precio: number }>;
}

export default function PromocionesPage() {
  const [activeTab, setActiveTab] = useState<"reglas" | "combos" | "aprobar" | "historial">("reglas");
  const [reglas, setReglas] = useState<ReglaPromocion[]>([]);
  const [descuentosPendientes, setDescuentosPendientes] = useState<DescuentoPendiente[]>([]);
  const [combos, setCombos] = useState<ComboItem[]>([]);
  const [productosCatalog, setProductosCatalog] = useState<ProductoCatalog[]>([]);
  const [loading, setLoading] = useState(true);

  // Form de Nuevo Combo
  const [comboNombre, setComboNombre] = useState("Protección diaria");
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [descuentoPct, setDescuentoPct] = useState(10);
  const [fechaInicio, setFechaInicio] = useState("2026-09-23");
  const [fechaFin, setFechaFin] = useState("2026-10-15");
  const [canales, setCanales] = useState({
    tienda_web: true,
    app: true,
    pos_tienda: true,
    whatsapp: true,
  });

  const [operating, setOperating] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/promociones");
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          setReglas(data.reglas || []);
          setDescuentosPendientes(data.descuentosPendientes || []);
          setCombos(data.combos || []);
          setProductosCatalog(data.productosCatalog || []);

          if (data.productosCatalog?.length >= 2 && selectedProductIds.length === 0) {
            setSelectedProductIds([data.productosCatalog[0].id, data.productosCatalog[1].id]);
          }
        }
      }
    } catch (err) {
      console.error("Error al cargar promociones:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleRegla = async (clave: string, actualState: boolean) => {
    try {
      setReglas((prev) =>
        prev.map((r) => (r.clave === clave ? { ...r, activa: actualState ? 0 : 1 } : r))
      );

      await fetch("/api/admin/promociones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "toggle_regla",
          clave,
          activa: !actualState,
        }),
      });
    } catch (err) {
      loadData();
    }
  };

  const handleAprobarDescuento = async (id: number) => {
    setOperating(true);
    try {
      const res = await fetch("/api/admin/promociones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "aprobar_descuento", descuentoId: id }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setMsg({ type: "success", text: data.mensaje });
        loadData();
      } else {
        setMsg({ type: "error", text: data.error || "Error al aprobar" });
      }
    } catch {
      setMsg({ type: "error", text: "Error de conexión" });
    } finally {
      setOperating(false);
    }
  };

  const handleRechazarDescuento = async (id: number) => {
    setOperating(true);
    try {
      const res = await fetch("/api/admin/promociones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "rechazar_descuento", descuentoId: id }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setMsg({ type: "success", text: "Descuento rechazado." });
        loadData();
      }
    } catch {
      setMsg({ type: "error", text: "Error de conexión" });
    } finally {
      setOperating(false);
    }
  };

  const handlePublicarCombo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comboNombre.trim() || selectedProductIds.length === 0) {
      setMsg({ type: "error", text: "Proporciona un nombre y al menos un producto." });
      return;
    }

    setOperating(true);
    setMsg(null);

    try {
      const canalesActivos = Object.entries(canales)
        .filter(([_, val]) => val)
        .map(([key]) => key);

      const res = await fetch("/api/admin/promociones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "crear_combo",
          nombre: comboNombre,
          productos: selectedProductIds,
          descuentoPorcentaje: descuentoPct,
          fechaInicio,
          fechaFin,
          canales: canalesActivos,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setMsg({ type: "success", text: data.mensaje || "Combo publicado exitosamente." });
        loadData();
      } else {
        setMsg({ type: "error", text: data.error || "Error al publicar el combo." });
      }
    } catch {
      setMsg({ type: "error", text: "Error de conexión." });
    } finally {
      setOperating(false);
    }
  };

  const selectedProducts = productosCatalog.filter((p) => selectedProductIds.includes(p.id));
  const sumaPreciosOriginales = selectedProducts.reduce((sum, p) => sum + Number(p.precio), 0);
  const precioFinalCalculado = Math.round(sumaPreciosOriginales * (1 - descuentoPct / 100));

  return (
    <div className="space-y-6 pb-12">
      {/* Header Titular y Subtítulo */}
      <div>
        <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">
          Promociones y combos
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Reglas del motor de recomendaciones. Tú decides los topes y apruebas los descuentos.
        </p>
      </div>

      {msg && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
            msg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {msg.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Grid Principal: 2 columnas en desktop (Izquierda Reglas y Descuentos, Derecha Creador Nuevo Combo) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* PANEL IZQUIERDO: PESTAÑAS, REGLAS AUTOMÁTICAS Y DESCUENTOS POR APROBAR */}
        <div className="lg:col-span-7 space-y-6">
          {/* Píldoras de Filtro / Pestañas */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveTab("reglas")}
              className={`px-4 py-2 text-xs font-bold rounded-full transition-all shrink-0 ${
                activeTab === "reglas"
                  ? "bg-stone-900 text-white shadow-xs"
                  : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"
              }`}
            >
              Reglas automáticas
            </button>
            <button
              onClick={() => setActiveTab("combos")}
              className={`px-4 py-2 text-xs font-bold rounded-full transition-all shrink-0 ${
                activeTab === "combos"
                  ? "bg-stone-900 text-white shadow-xs"
                  : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"
              }`}
            >
              Combos activos ({combos.length})
            </button>
            <button
              onClick={() => setActiveTab("aprobar")}
              className={`px-4 py-2 text-xs font-bold rounded-full transition-all shrink-0 ${
                activeTab === "aprobar"
                  ? "bg-stone-900 text-white shadow-xs"
                  : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"
              }`}
            >
              Por aprobar - {descuentosPendientes.length}
            </button>
            <button
              onClick={() => setActiveTab("historial")}
              className={`px-4 py-2 text-xs font-bold rounded-full transition-all shrink-0 ${
                activeTab === "historial"
                  ? "bg-stone-900 text-white shadow-xs"
                  : "bg-white text-stone-700 hover:bg-stone-100 border border-stone-200"
              }`}
            >
              Historial
            </button>
          </div>

          {loading ? (
            <div className="py-16 flex justify-center text-stone-400">
              <Loader2 className="w-8 h-8 animate-spin text-[#5B122C]" />
            </div>
          ) : (
            <>
              {/* VISTA 1: REGLAS AUTOMÁTICAS */}
              {activeTab === "reglas" && (
                <div className="space-y-4">
                  {reglas.map((regla) => {
                    const isChecked = Boolean(regla.activa);
                    return (
                      <div
                        key={regla.clave}
                        className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-2xs space-y-2 relative"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <h3 className="font-bold text-stone-900 text-base">
                              {regla.nombre}
                            </h3>
                            <p className="text-xs text-stone-500 leading-relaxed max-w-md">
                              {regla.descripcion}
                            </p>
                          </div>

                          {/* Switch Toggle */}
                          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleRegla(regla.clave, isChecked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-700" />
                          </label>
                        </div>

                        {regla.tope_texto && (
                          <div className="pt-1">
                            <span className="inline-block bg-stone-100 text-stone-600 text-[11px] font-semibold px-3 py-1 rounded-full border border-stone-200">
                              {regla.tope_texto}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* SECCIÓN DE DESCUENTOS POR APROBAR ABAJO */}
                  <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-2xs space-y-4 mt-6">
                    <h3 className="font-bold text-stone-900 text-base">
                      Descuentos por aprobar
                    </h3>

                    {descuentosPendientes.length === 0 ? (
                      <p className="text-xs text-stone-500 py-4 text-center">
                        No hay solicitudes de descuento pendientes de aprobación en este momento.
                      </p>
                    ) : (
                      <div className="divide-y divide-stone-100">
                        {descuentosPendientes.map((item) => (
                          <div
                            key={item.id}
                            className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-0.5">
                              <p className="font-bold text-stone-900 text-xs sm:text-sm">
                                {item.nombre_lote}
                              </p>
                              <p className="text-[11px] text-stone-500">
                                {item.piezas} piezas · caduca en {item.dias_restantes} días
                              </p>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              {/* Badge rosa de porcentaje */}
                              <span className="px-2.5 py-1 bg-red-100 text-red-800 font-bold text-xs rounded-full">
                                -{item.descuento_porcentaje}%
                              </span>

                              <button
                                onClick={() => handleRechazarDescuento(item.id)}
                                disabled={operating}
                                className="px-4 py-1.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold text-xs rounded-full transition-colors"
                              >
                                Rechazar
                              </button>

                              <button
                                onClick={() => handleAprobarDescuento(item.id)}
                                disabled={operating}
                                className="px-5 py-1.5 bg-[#5B122C] hover:bg-[#430c20] text-white font-bold text-xs rounded-full transition-colors shadow-2xs"
                              >
                                Aprobar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* VISTA 2: COMBOS ACTIVOS */}
              {activeTab === "combos" && (
                <div className="space-y-4">
                  {combos.length === 0 ? (
                    <div className="bg-white p-8 rounded-2xl border border-stone-200/80 text-center text-stone-500 text-xs">
                      No hay combos activos en este momento. Crea uno desde el panel derecho.
                    </div>
                  ) : (
                    combos.map((c) => (
                      <div key={c.id} className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-2xs space-y-2">
                        <div className="flex justify-between items-center">
                          <h3 className="font-bold text-stone-900 text-base">{c.nombre}</h3>
                          <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                            -{c.descuento_porcentaje}% OFF
                          </span>
                        </div>
                        <p className="text-xs text-stone-500">
                          Incluye: {c.productos.map((p) => p.nombre).join(" + ")}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* VISTA 3: POR APROBAR */}
              {activeTab === "aprobar" && (
                <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-2xs space-y-4">
                  <h3 className="font-bold text-stone-900 text-base">Cola de Descuentos por Aprobar</h3>
                  {descuentosPendientes.length === 0 ? (
                    <p className="text-xs text-stone-500">No hay descuentos pendientes.</p>
                  ) : (
                    <div className="divide-y divide-stone-100">
                      {descuentosPendientes.map((item) => (
                        <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-stone-900">{item.nombre_lote}</p>
                            <p className="text-stone-500">{item.piezas} pzs · {item.dias_restantes} días rest.</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded-full">-{item.descuento_porcentaje}%</span>
                            <button onClick={() => handleRechazarDescuento(item.id)} className="px-3 py-1 bg-white border border-stone-300 rounded-full font-bold">Rechazar</button>
                            <button onClick={() => handleAprobarDescuento(item.id)} className="px-4 py-1 bg-[#5B122C] text-white rounded-full font-bold">Aprobar</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* VISTA 4: HISTORIAL */}
              {activeTab === "historial" && (
                <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-2xs text-stone-500 text-xs">
                  Historial de promociones y descuentos aplicados previamente.
                </div>
              )}
            </>
          )}
        </div>

        {/* PANEL DERECHO: EDITOR "NUEVO COMBO" (CALCADO EXACTO DEL MOCKUP) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs space-y-5">
          <h2 className="font-serif text-2xl font-bold text-stone-900">
            Nuevo combo
          </h2>

          <form onSubmit={handlePublicarCombo} className="space-y-4">
            {/* Nombre del combo */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Nombre del combo
              </label>
              <input
                type="text"
                required
                value={comboNombre}
                onChange={(e) => setComboNombre(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B122C] text-stone-900"
              />
            </div>

            {/* Productos incluidos */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Productos
              </label>

              {/* Pills de productos seleccionados */}
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedProducts.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-100 text-stone-800 text-xs font-medium rounded-full border border-stone-200"
                  >
                    <span>{p.nombre}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedProductIds(selectedProductIds.filter((id) => id !== p.id))
                      }
                      className="text-stone-400 hover:text-stone-700 font-bold"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>

              {/* Botón + Agregar producto */}
              <button
                type="button"
                onClick={() => setShowProductSelector(!showProductSelector)}
                className="text-xs text-[#5B122C] font-semibold hover:underline flex items-center gap-1"
              >
                <span>+ Agregar producto</span>
              </button>

              {/* Selector desplegable de catálogo */}
              {showProductSelector && (
                <div className="mt-2 p-2 bg-stone-50 border border-stone-200 rounded-xl max-h-40 overflow-y-auto space-y-1">
                  {productosCatalog.map((prod) => {
                    const isAdded = selectedProductIds.includes(prod.id);
                    return (
                      <div
                        key={prod.id}
                        onClick={() => {
                          if (isAdded) {
                            setSelectedProductIds(selectedProductIds.filter((id) => id !== prod.id));
                          } else {
                            setSelectedProductIds([...selectedProductIds, prod.id]);
                          }
                        }}
                        className={`p-2 rounded-lg text-xs cursor-pointer flex justify-between items-center ${
                          isAdded ? "bg-[#5B122C]/10 font-bold text-[#5B122C]" : "hover:bg-stone-100 text-stone-800"
                        }`}
                      >
                        <span>{prod.nombre}</span>
                        <span className="font-mono text-stone-500">${Number(prod.precio).toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Descuento y Precio Final en 2 columnas */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Descuento
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={descuentoPct}
                    onChange={(e) => setDescuentoPct(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-[#5B122C]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-bold">%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Precio final
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-bold">$</span>
                  <input
                    type="text"
                    readOnly
                    value={precioFinalCalculado}
                    className="w-full pl-7 pr-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-xl font-mono font-bold text-stone-900"
                  />
                </div>
              </div>
            </div>

            {/* Fechas Inicio y Fin */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Inicio
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B122C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Fin
                </label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B122C]"
                />
              </div>
            </div>

            {/* Publicar en: Checkboxes */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-semibold text-stone-700">
                Publicar en
              </label>

              <div className="space-y-2 text-xs text-stone-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canales.tienda_web}
                    onChange={(e) => setCanales({ ...canales, tienda_web: e.target.checked })}
                    className="rounded border-stone-300 text-[#5B122C] focus:ring-[#5B122C]"
                  />
                  <span>Tienda web</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canales.app}
                    onChange={(e) => setCanales({ ...canales, app: e.target.checked })}
                    className="rounded border-stone-300 text-[#5B122C] focus:ring-[#5B122C]"
                  />
                  <span>App</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canales.pos_tienda}
                    onChange={(e) => setCanales({ ...canales, pos_tienda: e.target.checked })}
                    className="rounded border-stone-300 text-[#5B122C] focus:ring-[#5B122C]"
                  />
                  <span>POS tienda</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={canales.whatsapp}
                    onChange={(e) => setCanales({ ...canales, whatsapp: e.target.checked })}
                    className="rounded border-stone-300 text-[#5B122C] focus:ring-[#5B122C]"
                  />
                  <span>WhatsApp</span>
                </label>
              </div>
            </div>

            {/* Banner Verde de Motivo Sugerido */}
            <div className="p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs text-emerald-900">
              <p className="leading-relaxed">
                Motivo sugerido: <strong>{selectedProducts[1]?.nombre || selectedProducts[0]?.nombre || "Bruma Hidratante"}</strong> tiene 41 piezas en sobrestock.
              </p>
            </div>

            {/* Botón Principal Publicar combo */}
            <button
              type="submit"
              disabled={operating}
              className="w-full py-3.5 bg-[#5B122C] hover:bg-[#430c20] text-white font-bold text-sm rounded-xl transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {operating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Publicando combo...</span>
                </>
              ) : (
                <span>Publicar combo</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

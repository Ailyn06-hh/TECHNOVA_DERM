"use client";

import React, { useState, useEffect } from "react";
import {
  Package,
  Search,
  Plus,
  Filter,
  Save,
  Check,
  AlertCircle,
  Loader2,
  Tag,
  DollarSign,
  Barcode,
  Layers,
  Sparkles,
  Eye,
  Archive,
  CheckCircle2,
} from "lucide-react";

interface Producto {
  id: number;
  nombre: string;
  sku: string;
  codigo_barras: string | null;
  slug: string;
  categoria_id: number;
  categoria_nombre: string;
  precio: number;
  precio_especial: number | null;
  descripcion: string | null;
  imagen_url: string | null;
  activo: number;
  stock_total: number;
}

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Array<{ id: number; nombre: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroEstado, setFiltroEstado] = useState("todos");

  // Producto seleccionado para el panel de detalle/edición a la derecha
  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Formulario del panel de detalle
  const [formData, setFormData] = useState({
    nombre: "",
    sku: "",
    codigoBarras: "",
    categoriaId: 1,
    precio: 0,
    precioEspecial: "",
    descripcion: "",
    activo: true,
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadProductos = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (busqueda) query.set("q", busqueda);
      if (filtroCategoria !== "todas") query.set("categoriaId", filtroCategoria);
      if (filtroEstado !== "todos") query.set("estado", filtroEstado);

      const res = await fetch(`/api/admin/productos?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          setProductos(data.productos || []);
          setCategorias(data.categorias || []);

          if (!selectedProducto && data.productos?.length > 0 && !isCreating) {
            selectProducto(data.productos[0]);
          }
        }
      }
    } catch (err) {
      console.error("Error al cargar productos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProductos();
  }, [busqueda, filtroCategoria, filtroEstado]);

  const selectProducto = (p: Producto) => {
    setIsCreating(false);
    setSelectedProducto(p);
    setFormData({
      nombre: p.nombre,
      sku: p.sku || "",
      codigoBarras: p.codigo_barras || "",
      categoriaId: p.categoria_id || 1,
      precio: Number(p.precio) || 0,
      precioEspecial: p.precio_especial ? String(p.precio_especial) : "",
      descripcion: p.descripcion || "",
      activo: Boolean(p.activo),
    });
    setMsg(null);
  };

  const startCreating = () => {
    setSelectedProducto(null);
    setIsCreating(true);
    setFormData({
      nombre: "",
      sku: `SKU-${Date.now().toString().slice(-6)}`,
      codigoBarras: "",
      categoriaId: categorias[0]?.id || 1,
      precio: 0,
      precioEspecial: "",
      descripcion: "",
      activo: true,
    });
    setMsg(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre || formData.precio <= 0) {
      setMsg({ type: "error", text: "Proporciona un nombre y precio válido." });
      return;
    }

    setSaving(true);
    setMsg(null);

    try {
      const url = "/api/admin/productos";
      const method = isCreating ? "POST" : "PUT";
      const payload = {
        id: selectedProducto?.id,
        ...formData,
        precioEspecial: formData.precioEspecial ? Number(formData.precioEspecial) : null,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMsg({ type: "error", text: data.error || "Error al guardar el producto" });
      } else {
        setMsg({ type: "success", text: data.mensaje || "Producto guardado con éxito" });
        loadProductos();
      }
    } catch (err) {
      setMsg({ type: "error", text: "Error de red al guardar producto" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header de Productos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <h1 className="font-serif text-2xl font-bold text-stone-900 tracking-tight">
            Catálogo de Productos
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Gestión de catálogo, precios, visibilidad omnicanal y estados
          </p>
        </div>
        <button
          onClick={startCreating}
          className="px-4 py-2.5 bg-[#5B122C] text-white font-semibold text-xs rounded-xl hover:bg-[#430c20] transition-colors shadow-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Producto</span>
        </button>
      </div>

      {/* Estructura dividida: Lista a la izquierda (60%), Detalle a la derecha (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* PANEL IZQUIERDO: LISTA DE PRODUCTOS CON FILTROS */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-4">
          {/* Filtros de búsqueda */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nombre, SKU..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B122C]"
              />
            </div>

            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B122C] text-stone-800 font-medium"
            >
              <option value="todas">Todas las Categorías</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B122C] text-stone-800 font-medium"
            >
              <option value="todos">Todos los Estados</option>
              <option value="activo">Activos</option>
              <option value="archivado">Archivados</option>
            </select>
          </div>

          {/* Tabla de Productos */}
          {loading ? (
            <div className="py-12 flex justify-center text-stone-400">
              <Loader2 className="w-6 h-6 animate-spin text-[#5B122C]" />
            </div>
          ) : productos.length === 0 ? (
            <div className="py-12 text-center text-stone-500 text-xs">
              No se encontraron productos con los filtros seleccionados.
            </div>
          ) : (
            <div className="divide-y divide-stone-100 max-h-[600px] overflow-y-auto pr-1">
              {productos.map((p) => {
                const isSelected = selectedProducto?.id === p.id && !isCreating;
                return (
                  <div
                    key={p.id}
                    onClick={() => selectProducto(p)}
                    className={`p-3 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? "bg-[#5B122C]/5 border-2 border-[#5B122C]"
                        : "hover:bg-stone-50 border border-transparent"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900 text-xs truncate">
                          {p.nombre}
                        </span>
                        <span
                          className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                            p.activo
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-stone-200 text-stone-700"
                          }`}
                        >
                          {p.activo ? "Activo" : "Archivado"}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 font-mono mt-0.5">
                        SKU: {p.sku || "N/A"} · Cat: {p.categoria_nombre || "General"}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="font-bold font-mono text-stone-900 text-xs">
                        ${Number(p.precio).toFixed(2)}
                      </p>
                      <p className="text-[10px] text-stone-500">
                        Stock: <span className="font-bold text-stone-800">{p.stock_total} pzs</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PANEL DERECHO: DETALLE / EDICIÓN DEL PRODUCTO */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
            <h2 className="font-serif text-lg font-bold text-stone-900">
              {isCreating ? "Nuevo Producto" : "Detalle y Configuración"}
            </h2>
            {selectedProducto && !isCreating && (
              <span className="text-xs font-mono text-stone-500">
                ID #{selectedProducto.id}
              </span>
            )}
          </div>

          {msg && (
            <div
              className={`p-3 rounded-lg text-xs mb-4 flex items-center gap-2 ${
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

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Nombre del Producto *
              </label>
              <input
                type="text"
                required
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B122C]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  SKU
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#5B122C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Código de Barras
                </label>
                <input
                  type="text"
                  value={formData.codigoBarras}
                  onChange={(e) => setFormData({ ...formData, codigoBarras: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#5B122C]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Categoría
                </label>
                <select
                  value={formData.categoriaId}
                  onChange={(e) => setFormData({ ...formData, categoriaId: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B122C]"
                >
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Estado
                </label>
                <select
                  value={formData.activo ? "activo" : "archivado"}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.value === "activo" })}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B122C]"
                >
                  <option value="activo">Activo (Publicado)</option>
                  <option value="archivado">Archivado</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Precio Normal ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.precio}
                  onChange={(e) => setFormData({ ...formData, precio: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#5B122C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Precio Especial ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Opcional"
                  value={formData.precioEspecial}
                  onChange={(e) => setFormData({ ...formData, precioEspecial: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#5B122C]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Descripción
              </label>
              <textarea
                rows={4}
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B122C]"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-[#5B122C] text-white font-semibold text-xs rounded-xl hover:bg-[#430c20] transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

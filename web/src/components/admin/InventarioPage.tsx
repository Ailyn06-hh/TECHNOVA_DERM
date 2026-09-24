"use client";

import React, { useState, useEffect } from "react";
import {
  Boxes,
  Truck,
  ArrowRightLeft,
  Calendar,
  Store,
  Plus,
  Check,
  AlertCircle,
  Loader2,
  Search,
  Filter,
} from "lucide-react";

interface ItemInventario {
  producto_id: number;
  producto_nombre: string;
  sku: string;
  sucursal_id: number;
  sucursal_nombre: string;
  existencias: number;
  actualizado_en: string;
}

interface Lote {
  id: number;
  producto_id: number;
  producto_nombre: string;
  sucursal_id: number;
  sucursal_nombre: string;
  codigo_lote: string;
  caduca_en: string;
  existencias: number;
}

export default function InventarioPage() {
  const [inventario, setInventario] = useState<ItemInventario[]>([]);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [sucursales, setSucursales] = useState<Array<{ id: number; nombre: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"existencias" | "lotes">("existencias");
  const [busqueda, setBusqueda] = useState("");

  // Modales de operación
  const [modalEntrada, setModalEntrada] = useState(false);
  const [modalTransferencia, setModalTransferencia] = useState(false);

  // Form Entrada Proveedor
  const [formEntrada, setFormEntrada] = useState({
    productoId: 1,
    sucursalId: 1,
    cantidad: 50,
    codigoLote: "",
    caducaEn: "",
  });

  // Form Transferencia
  const [formTrans, setFormTrans] = useState({
    productoId: 1,
    sucursalOrigenId: 1,
    sucursalDestinoId: 2,
    cantidad: 10,
  });

  const [operating, setOperating] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/inventario");
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          setInventario(data.inventario || []);
          setLotes(data.lotes || []);
          setSucursales(data.sucursales || []);
          if (data.inventario?.length > 0) {
            setFormEntrada((prev) => ({ ...prev, productoId: data.inventario[0].producto_id }));
            setFormTrans((prev) => ({ ...prev, productoId: data.inventario[0].producto_id }));
          }
        }
      }
    } catch (err) {
      console.error("Error al cargar inventario:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEntradaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOperating(true);
    setMsg(null);

    try {
      const res = await fetch("/api/admin/inventario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "entrada_proveedor",
          ...formEntrada,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMsg({ type: "error", text: data.error || "Error al registrar entrada" });
      } else {
        setMsg({ type: "success", text: data.mensaje || "Entrada registrada correctamente" });
        setModalEntrada(false);
        loadData();
      }
    } catch (err) {
      setMsg({ type: "error", text: "Error de conexión" });
    } finally {
      setOperating(false);
    }
  };

  const handleTransferenciaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOperating(true);
    setMsg(null);

    try {
      const res = await fetch("/api/admin/inventario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "transferencia_tiendas",
          ...formTrans,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMsg({ type: "error", text: data.error || "Error al realizar transferencia" });
      } else {
        setMsg({ type: "success", text: data.mensaje || "Transferencia completada" });
        setModalTransferencia(false);
        loadData();
      }
    } catch (err) {
      setMsg({ type: "error", text: "Error de conexión" });
    } finally {
      setOperating(false);
    }
  };

  const filteredInv = inventario.filter(
    (i) =>
      i.producto_nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      i.sku?.toLowerCase().includes(busqueda.toLowerCase()) ||
      i.sucursal_nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <h1 className="font-serif text-2xl font-bold text-stone-900 tracking-tight">
            Inventario y Lotes FEFO
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Existencias por sucursal, recepción de proveedores y transferencias entre tiendas
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setModalEntrada(true)}
            className="px-3.5 py-2 bg-[#5B122C] text-white font-semibold text-xs rounded-xl hover:bg-[#430c20] transition-colors shadow-sm flex items-center gap-2"
          >
            <Truck className="w-4 h-4" />
            <span>Entrada Proveedor</span>
          </button>

          <button
            onClick={() => setModalTransferencia(true)}
            className="px-3.5 py-2 bg-stone-900 text-white font-semibold text-xs rounded-xl hover:bg-stone-800 transition-colors shadow-sm flex items-center gap-2"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Transferir entre Tiendas</span>
          </button>
        </div>
      </div>

      {msg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            msg.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {msg.type === "success" ? (
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{msg.text}</span>
        </div>
      )}

      {/* Tabs y Búsqueda */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setTab("existencias")}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                tab === "existencias"
                  ? "bg-white text-stone-900 shadow-xs"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              Existencias por Sucursal ({inventario.length})
            </button>
            <button
              onClick={() => setTab("lotes")}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                tab === "lotes"
                  ? "bg-white text-stone-900 shadow-xs"
                  : "text-stone-500 hover:text-stone-900"
              }`}
            >
              Lotes FEFO ({lotes.length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrar por producto o tienda..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B122C]"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center text-stone-400">
            <Loader2 className="w-6 h-6 animate-spin text-[#5B122C]" />
          </div>
        ) : tab === "existencias" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Producto</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Sucursal</th>
                  <th className="py-3 px-4 text-right">Existencias</th>
                  <th className="py-3 px-4 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredInv.map((item, idx) => (
                  <tr key={`${item.producto_id}-${item.sucursal_id}-${idx}`} className="hover:bg-stone-50">
                    <td className="py-3 px-4 font-bold text-stone-900">{item.producto_nombre}</td>
                    <td className="py-3 px-4 font-mono text-stone-500">{item.sku || "N/A"}</td>
                    <td className="py-3 px-4 text-stone-700">{item.sucursal_nombre}</td>
                    <td className="py-3 px-4 font-bold text-right font-mono text-stone-900">
                      {item.existencias} pzs
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          item.existencias <= 10
                            ? "bg-red-100 text-red-800"
                            : item.existencias <= 25
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {item.existencias <= 10
                          ? "Crítico"
                          : item.existencias <= 25
                          ? "Bajo Stock"
                          : "Óptimo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Código Lote</th>
                  <th className="py-3 px-4">Producto</th>
                  <th className="py-3 px-4">Sucursal</th>
                  <th className="py-3 px-4">Caducidad</th>
                  <th className="py-3 px-4 text-right">Cantidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {lotes.map((lote) => (
                  <tr key={lote.id} className="hover:bg-stone-50">
                    <td className="py-3 px-4 font-mono font-bold text-[#5B122C]">{lote.codigo_lote}</td>
                    <td className="py-3 px-4 font-bold text-stone-900">{lote.producto_nombre}</td>
                    <td className="py-3 px-4 text-stone-700">{lote.sucursal_nombre}</td>
                    <td className="py-3 px-4 text-stone-600 font-mono">
                      {new Date(lote.caduca_en).toLocaleDateString("es-MX")}
                    </td>
                    <td className="py-3 px-4 font-bold text-right font-mono text-stone-900">
                      {lote.existencias} pzs
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL ENTRADA DE PROVEEDOR */}
      {modalEntrada && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-serif text-lg font-bold text-stone-900">Entrada de Proveedor</h3>
              <button onClick={() => setModalEntrada(false)} className="text-stone-400 hover:text-stone-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleEntradaSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Producto</label>
                <select
                  value={formEntrada.productoId}
                  onChange={(e) => setFormEntrada({ ...formEntrada, productoId: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#5B122C]"
                >
                  {Array.from(new Set(inventario.map((i) => i.producto_id))).map((pid) => {
                    const item = inventario.find((i) => i.producto_id === pid);
                    return (
                      <option key={pid} value={pid}>
                        {item?.producto_nombre}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Sucursal de Destino</label>
                <select
                  value={formEntrada.sucursalId}
                  onChange={(e) => setFormEntrada({ ...formEntrada, sucursalId: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#5B122C]"
                >
                  {sucursales.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Cantidad (Unidades)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formEntrada.cantidad}
                    onChange={(e) => setFormEntrada({ ...formEntrada, cantidad: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg font-mono focus:ring-2 focus:ring-[#5B122C]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Código de Lote</label>
                  <input
                    type="text"
                    placeholder="Auto si se omite"
                    value={formEntrada.codigoLote}
                    onChange={(e) => setFormEntrada({ ...formEntrada, codigoLote: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg font-mono focus:ring-2 focus:ring-[#5B122C]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={operating}
                className="w-full py-2.5 bg-[#5B122C] text-white font-semibold rounded-xl hover:bg-[#430c20] transition-colors flex items-center justify-center gap-2"
              >
                {operating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Recepción"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TRANSFERENCIA ENTRE TIENDAS */}
      {modalTransferencia && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-serif text-lg font-bold text-stone-900">Transferencia entre Tiendas</h3>
              <button onClick={() => setModalTransferencia(false)} className="text-stone-400 hover:text-stone-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleTransferenciaSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Producto</label>
                <select
                  value={formTrans.productoId}
                  onChange={(e) => setFormTrans({ ...formTrans, productoId: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#5B122C]"
                >
                  {Array.from(new Set(inventario.map((i) => i.producto_id))).map((pid) => {
                    const item = inventario.find((i) => i.producto_id === pid);
                    return (
                      <option key={pid} value={pid}>
                        {item?.producto_nombre}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Sucursal Origen</label>
                  <select
                    value={formTrans.sucursalOrigenId}
                    onChange={(e) => setFormTrans({ ...formTrans, sucursalOrigenId: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#5B122C]"
                  >
                    {sucursales.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Sucursal Destino</label>
                  <select
                    value={formTrans.sucursalDestinoId}
                    onChange={(e) => setFormTrans({ ...formTrans, sucursalDestinoId: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#5B122C]"
                  >
                    {sucursales.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Cantidad a Transferir</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formTrans.cantidad}
                  onChange={(e) => setFormTrans({ ...formTrans, cantidad: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg font-mono focus:ring-2 focus:ring-[#5B122C]"
                />
              </div>

              <button
                type="submit"
                disabled={operating}
                className="w-full py-2.5 bg-stone-900 text-white font-semibold rounded-xl hover:bg-stone-800 transition-colors flex items-center justify-center gap-2"
              >
                {operating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ejecutar Transferencia"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

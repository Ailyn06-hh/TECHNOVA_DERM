"use client";

import React, { useState, useEffect } from "react";
import {
  Truck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Building2,
  Check,
  PackageCheck,
  FileText,
  Send,
} from "lucide-react";
import { NOMBRE_MARCA } from "@/lib/marca";

interface Sugerencia {
  productoId: number;
  nombre: string;
  sku: string;
  precio: number;
  stock: number;
  ventaDiaria: number;
  diasRestantes: string;
  sugerido: string;
  sugeridoNum: number;
}

interface OrdenCompra {
  id: number;
  folio: string;
  proveedor: string;
  sucursal_destino_id: number;
  sucursal_nombre: string;
  costo_total: number;
  estado: string;
  llegada_estimada: string;
  fecha_deseada: string;
  creado_en: string;
}

interface Proveedor {
  id: number;
  nombre: string;
  especialidades: string;
  dias_entrega: number;
  correo: string;
}

export default function ReabastecimientoPage() {
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenCompra[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [sucursales, setSucursales] = useState<Array<{ id: number; nombre: string }>>([]);
  const [siguienteFolio, setSiguienteFolio] = useState("OC-119");
  const [loading, setLoading] = useState(true);

  // Ítems seleccionados por checkbox en la tabla central
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Form de Orden de Compra (Panel Derecho)
  const [selectedProveedor, setSelectedProveedor] = useState("Laboratorio Botánico MX");
  const [selectedSucursalId, setSelectedSucursalId] = useState<number>(3); // Bodega por defecto
  const [fechaDeseada, setFechaDeseada] = useState("2026-09-30");

  const [operating, setOperating] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reabastecimiento");
      if (res.ok) {
        const data = await res.json();
        if (data.ok) {
          setSugerencias(data.sugerencias || []);
          setOrdenes(data.ordenes || []);
          setProveedores(data.proveedores || []);
          setSucursales(data.sucursales || []);
          if (data.siguienteFolio) setSiguienteFolio(data.siguienteFolio);

          // Seleccionar por defecto los primeros 2 ítems en riesgo
          if (data.sugerencias?.length >= 2 && selectedIds.length === 0) {
            setSelectedIds([data.sugerencias[0].productoId, data.sugerencias[1].productoId]);
          }

          if (data.proveedores?.length > 0) {
            setSelectedProveedor(data.proveedores[0].nombre);
          }
          if (data.sucursales?.length > 0) {
            const bodega = data.sucursales.find((s: any) => s.nombre.toLowerCase().includes("bodega")) || data.sucursales[0];
            setSelectedSucursalId(bodega.id);
          }
        }
      }
    } catch (err) {
      console.error("Error al cargar reabastecimiento:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Calcular ítems de la O.C.
  const ocItems = sugerencias
    .filter((s) => selectedIds.includes(s.productoId))
    .map((s) => {
      const cantidad = s.sugeridoNum > 0 ? s.sugeridoNum : 12;
      const subtotal = cantidad * (s.precio * 0.6); // Precio de costo ~60% del precio de lista
      return {
        ...s,
        cantidad,
        subtotal: Math.round(subtotal),
      };
    });

  const costoTotalOC = ocItems.reduce((sum, item) => sum + item.subtotal, 0);

  const handleCrearOrden = async (estado: "Borrador" | "En camino") => {
    if (ocItems.length === 0) {
      setMsg({ type: "error", text: "Selecciona al menos un producto de la tabla para incluirlo en la orden." });
      return;
    }

    setOperating(true);
    setMsg(null);

    try {
      const payload = {
        accion: "crear_orden",
        folio: siguienteFolio,
        proveedor: selectedProveedor,
        sucursalDestinoId: selectedSucursalId,
        costoTotal: costoTotalOC,
        estado,
        fechaDeseada,
        items: ocItems.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad })),
      };

      const res = await fetch("/api/admin/reabastecimiento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setMsg({ type: "success", text: data.mensaje });
        loadData();
      } else {
        setMsg({ type: "error", text: data.error || "Error al crear la orden" });
      }
    } catch {
      setMsg({ type: "error", text: "Error de conexión" });
    } finally {
      setOperating(false);
    }
  };

  const handleRecibirOrden = async (ordenId: number) => {
    setOperating(true);
    setMsg(null);

    try {
      const res = await fetch("/api/admin/reabastecimiento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "recibir_orden", ordenId }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setMsg({ type: "success", text: data.mensaje });
        loadData();
      } else {
        setMsg({ type: "error", text: data.error || "Error al registrar la recepción" });
      }
    } catch {
      setMsg({ type: "error", text: "Error de conexión" });
    } finally {
      setOperating(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Titular y Subtítulo */}
      <div>
        <h1 className="font-serif text-3xl font-bold text-stone-900 tracking-tight">
          Reabastecimiento y proveedores
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Sugerencias del pronóstico de demanda para no quedarte sin productos clave
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

      {/* Grid Principal: 2 columnas (Izquierda: Pronóstico, Órdenes en Curso y Proveedores; Derecha: O.C.) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* PANEL IZQUIERDO: PRONÓSTICO, ÓRDENES EN CURSO Y CATÁLOGO PROVEEDORES */}
        <div className="lg:col-span-7 space-y-6">
          {/* TABLA DE SUGERENCIAS DEL PRONÓSTICO DE DEMANDA */}
          <div className="bg-[#FAF7F5] border border-stone-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200/80 text-stone-500 font-bold uppercase tracking-wider text-[10px] bg-stone-100/50">
                    <th className="py-3 px-4 w-10 text-center"></th>
                    <th className="py-3 px-4">PRODUCTO</th>
                    <th className="py-3 px-3 text-center">STOCK</th>
                    <th className="py-3 px-3 text-center">VENTA DIARIA</th>
                    <th className="py-3 px-3 text-center">DÍAS</th>
                    <th className="py-3 px-4 text-right">SUGERIDO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200/60 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-stone-400">
                        <Loader2 className="w-6 h-6 animate-spin text-[#5B122C] mx-auto" />
                      </td>
                    </tr>
                  ) : (
                    sugerencias.map((item) => {
                      const isSelected = selectedIds.includes(item.productoId);
                      return (
                        <tr
                          key={item.productoId}
                          onClick={() => toggleSelect(item.productoId)}
                          className={`cursor-pointer transition-all hover:bg-stone-50 ${
                            isSelected ? "bg-stone-50/80" : ""
                          }`}
                        >
                          <td className="py-3.5 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // Manejado por onClick de tr
                              className="w-4 h-4 rounded border-stone-300 text-[#5B122C] focus:ring-[#5B122C] cursor-pointer"
                            />
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-stone-900">
                            {item.nombre}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono font-medium text-stone-700">
                            {item.stock}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono text-stone-600">
                            {item.ventaDiaria}
                          </td>
                          <td className="py-3.5 px-3 text-center font-mono text-stone-600">
                            {item.diasRestantes}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold font-mono text-stone-900">
                            {item.sugerido}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECCIÓN: ÓRDENES EN CURSO */}
          <div className="space-y-3">
            <h3 className="font-bold text-stone-900 text-base">Órdenes en curso</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {ordenes.map((orden) => {
                const estadoClean = (orden.estado || "").toLowerCase();
                const esEnCamino = estadoClean === "en_transito" || estadoClean === "en camino";
                const esRecibida = estadoClean === "recibida";
                const estadoLabel = esEnCamino ? "En camino" : esRecibida ? "Recibida" : "Borrador";

                return (
                  <div
                    key={orden.id}
                    className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-2xs space-y-2 relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 text-sm">
                        {orden.folio}
                      </span>
                      <span
                        className={`px-3 py-0.5 text-[11px] font-bold rounded-full ${
                          esEnCamino
                            ? "bg-amber-100 text-amber-900 border border-amber-200"
                            : esRecibida
                            ? "bg-emerald-100 text-emerald-900 border border-emerald-200"
                            : "bg-stone-100 text-stone-700 border border-stone-200"
                        }`}
                      >
                        {estadoLabel}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-stone-700">{orden.proveedor}</p>

                    <p className="text-xs text-stone-500">
                      Llega el{" "}
                      {new Date(orden.llegada_estimada || orden.creado_en).toLocaleDateString("es-MX", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>

                    {esEnCamino && (
                      <div className="pt-2">
                        <button
                          onClick={() => handleRecibirOrden(orden.id)}
                          disabled={operating}
                          className="text-xs font-semibold text-[#5B122C] hover:underline flex items-center gap-1"
                        >
                          <span>Registrar recepción</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECCIÓN: PROVEEDORES */}
          <div className="space-y-3">
            <h3 className="font-bold text-stone-900 text-base">Proveedores</h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {proveedores.map((prov) => (
                <div
                  key={prov.id}
                  className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-2xs space-y-1"
                >
                  <h4 className="font-bold text-stone-900 text-xs truncate">
                    {prov.nombre}
                  </h4>
                  <p className="text-[11px] text-stone-500 leading-tight">
                    {prov.especialidades}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PANEL DERECHO: ORDEN DE COMPRA (CREADOR / DETALLE) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h2 className="font-serif text-2xl font-bold text-stone-900">
              Orden de compra {siguienteFolio}
            </h2>
            <span className="px-3 py-1 bg-stone-100 text-stone-600 font-bold text-xs rounded-full border border-stone-200">
              Borrador
            </span>
          </div>

          <div className="space-y-5">
            {/* Select Proveedor */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Proveedor
              </label>
              <select
                value={selectedProveedor}
                onChange={(e) => setSelectedProveedor(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B122C] text-stone-900 font-medium"
              >
                {proveedores.map((prov) => (
                  <option key={prov.id} value={prov.nombre}>
                    {prov.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Lista de ítems seleccionados para la O.C. */}
            <div className="space-y-2 py-1 border-t border-b border-stone-100">
              {ocItems.length === 0 ? (
                <p className="text-xs text-stone-400 py-3 text-center">
                  Selecciona productos de la tabla para agregarlos a la orden.
                </p>
              ) : (
                ocItems.map((item) => (
                  <div
                    key={item.productoId}
                    className="flex justify-between items-center text-xs py-1.5"
                  >
                    <span className="text-stone-800 font-medium">
                      {item.nombre} × {item.cantidad}
                    </span>
                    <span className="font-mono font-bold text-stone-900">
                      ${item.subtotal.toLocaleString("es-MX")}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Costo Total */}
            <div className="flex justify-between items-baseline pt-1">
              <span className="font-bold text-stone-900 text-base">Costo total</span>
              <span className="font-serif font-bold text-stone-900 text-2xl">
                ${costoTotalOC.toLocaleString("es-MX")}
              </span>
            </div>

            {/* Select Entregar en */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Entregar en
              </label>
              <select
                value={selectedSucursalId}
                onChange={(e) => setSelectedSucursalId(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B122C] text-stone-900 font-medium"
              >
                {sucursales.map((suc) => (
                  <option key={suc.id} value={suc.id}>
                    {suc.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha deseada */}
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Fecha deseada
              </label>
              <input
                type="date"
                value={fechaDeseada}
                onChange={(e) => setFechaDeseada(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5B122C] text-stone-900"
              />
            </div>

            {/* Acciones de la Orden */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => handleCrearOrden("En camino")}
                disabled={operating || ocItems.length === 0}
                className="w-full py-3.5 bg-[#5B122C] hover:bg-[#430c20] text-white font-bold text-sm rounded-xl transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {operating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando al proveedor...</span>
                  </>
                ) : (
                  <span>Enviar al proveedor</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleCrearOrden("Borrador")}
                disabled={operating || ocItems.length === 0}
                className="w-full py-3 bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 font-bold text-xs rounded-xl transition-colors shadow-2xs flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>Guardar borrador</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

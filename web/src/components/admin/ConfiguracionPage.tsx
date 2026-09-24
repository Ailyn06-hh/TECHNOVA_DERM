"use client";

import { useState, useEffect } from "react";
import {
  Store,
  Truck,
  CreditCard,
  MessageSquare,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  Loader2,
  Globe,
  Smartphone,
  ShoppingBag,
  X,
  Save,
  Check,
  Building2
} from "lucide-react";

interface Sucursal {
  id: number;
  nombre: string;
  direccion: string;
  ciudad: string;
  horario_texto: string;
  activa: number;
}

export default function ConfiguracionPage() {
  const [loading, setLoading] = useState(true);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [config, setConfig] = useState<Record<string, string>>({
    costo_envio_local: "99.00",
    tiempo_envio_local: "2 a 3 días",
    costo_envio_nacional: "149.00",
    tiempo_envio_nacional: "4 a 6 días",
    monto_envio_gratis: "1200.00",
    permitir_recoger_tienda: "1",
    mercadopago_conectado: "1",
    terminal_pos_conectado: "1",
    pago_en_tienda_conectado: "1",
    tienda_web_conectado: "1",
    app_movil_conectado: "1",
    whatsapp_conectado: "1",
    marketplace_conectado: "0",
    rfc_negocio: "TDE260101XYZ",
    regimen_fiscal: "601 - General de Ley Personas Morales",
    serie_facturas: "N",
    permitir_descargar_facturas: "1",
  });

  const [saving, setSaving] = useState(false);
  const [modalTienda, setModalTienda] = useState(false);
  const [formTienda, setFormTienda] = useState({
    nombre: "",
    direccion: "",
    ciudad: "Guadalajara",
    horario_texto: "Lun a sáb 10:00 a 20:00",
  });
  const [creandoTienda, setCreandoTienda] = useState(false);

  // Toast
  const [mensajeToast, setMensajeToast] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);

  const mostrarToast = (texto: string, tipo: "exito" | "error" = "exito") => {
    setMensajeToast({ texto, tipo });
    setTimeout(() => setMensajeToast(null), 3500);
  };

  const cargarConfiguracion = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/configuracion");
      const data = await res.json();
      if (data.ok) {
        setConfig((prev) => ({ ...prev, ...data.configuracion }));
        setSucursales(data.sucursales || []);
      } else {
        mostrarToast(data.error || "Error al cargar configuración", "error");
      }
    } catch (err) {
      console.error(err);
      mostrarToast("Error de conexión al cargar configuración", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const handleGuardarConfiguracion = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/admin/configuracion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "guardar_configuracion",
          valores: config,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        mostrarToast(data.mensaje);
      } else {
        mostrarToast(data.error || "Error al guardar", "error");
      }
    } catch (err) {
      mostrarToast("Error de red", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCanal = async (clave: string, estadoActual: boolean) => {
    const nuevoEstado = !estadoActual;
    try {
      setConfig((prev) => ({ ...prev, [clave]: nuevoEstado ? "1" : "0" }));
      const res = await fetch("/api/admin/configuracion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "toggle_canal",
          canalClave: clave,
          canalEstado: nuevoEstado,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        mostrarToast(data.mensaje);
      } else {
        mostrarToast(data.error || "Error al actualizar canal", "error");
      }
    } catch (err) {
      mostrarToast("Error de red", "error");
    }
  };

  const handleAgregarTienda = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreandoTienda(true);
      const res = await fetch("/api/admin/configuracion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "agregar_tienda",
          sucursal: formTienda,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        mostrarToast(data.mensaje);
        setModalTienda(false);
        setFormTienda({
          nombre: "",
          direccion: "",
          ciudad: "Guadalajara",
          horario_texto: "Lun a sáb 10:00 a 20:00",
        });
        cargarConfiguracion();
      } else {
        mostrarToast(data.error || "Error al crear tienda", "error");
      }
    } catch (err) {
      mostrarToast("Error de red", "error");
    } finally {
      setCreandoTienda(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {mensajeToast && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 text-sm font-medium transition-all ${
            mensajeToast.tipo === "exito" ? "bg-emerald-800 text-white" : "bg-red-800 text-white"
          }`}
        >
          {mensajeToast.tipo === "exito" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-300" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-300" />
          )}
          <span>{mensajeToast.texto}</span>
        </div>
      )}

      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h1 className="text-2xl font-serif text-[#5B122C]">Configuración</h1>
          <p className="text-sm text-stone-600 mt-1">Ajustes de la operación en todos los canales</p>
        </div>

        <button
          onClick={handleGuardarConfiguracion}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#5B122C] text-white text-xs font-semibold rounded-lg hover:bg-[#430d20] transition-colors shadow-xs self-start sm:self-auto"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Guardar cambios</span>
        </button>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-stone-400 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#5B122C]" />
          <p className="text-sm font-medium">Cargando configuración operacional...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Grid Principal 2x2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Tiendas y horarios */}
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-pink-100/70 text-[#5B122C] flex items-center justify-center shrink-0">
                    <Store className="w-5 h-5" />
                  </div>
                  <h2 className="text-base font-bold text-stone-900">Tiendas y horarios</h2>
                </div>

                <div className="divide-y divide-stone-100 text-xs">
                  {sucursales.map((s) => (
                    <div key={s.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-stone-900">
                          {s.nombre} · <span className="font-normal text-stone-600">{s.direccion}</span>
                        </div>
                        <div className="text-stone-500 text-[11px] mt-0.5">
                          {s.horario_texto} · recoger en tienda activo
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-semibold shrink-0">
                        Conectado
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-stone-100">
                <button
                  onClick={() => setModalTienda(true)}
                  className="text-xs font-bold text-[#5B122C] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Agregar tienda</span>
                </button>
              </div>
            </div>

            {/* Card 2: Envíos */}
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-pink-100/70 text-[#5B122C] flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-stone-900">Envíos</h2>
              </div>

              <div className="space-y-3 text-xs">
                {/* Zona Local */}
                <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                  <span className="text-stone-700 font-medium">Zona Aguascalientes capital / local</span>
                  <div className="flex items-center gap-1 font-mono font-bold text-stone-900">
                    <span>${config.costo_envio_local || "99"}</span>
                    <span className="font-normal font-sans text-stone-500 text-[11px]">
                      · {config.tiempo_envio_local || "2 a 3 días"}
                    </span>
                  </div>
                </div>

                {/* Resto del País */}
                <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                  <span className="text-stone-700 font-medium">Resto del país</span>
                  <div className="flex items-center gap-1 font-mono font-bold text-stone-900">
                    <span>${config.costo_envio_nacional || "149"}</span>
                    <span className="font-normal font-sans text-stone-500 text-[11px]">
                      · {config.tiempo_envio_nacional || "4 a 6 días"}
                    </span>
                  </div>
                </div>

                {/* Envío Gratis */}
                <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                  <span className="text-stone-700 font-medium">Envío gratis desde</span>
                  <span className="font-mono font-bold text-stone-900">
                    ${parseFloat(config.monto_envio_gratis || "1200").toLocaleString("es-MX")}
                  </span>
                </div>

                {/* Recoger en tienda gratis toggle */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-stone-700 font-medium">Recoger en tienda gratis</span>
                  <button
                    type="button"
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        permitir_recoger_tienda: prev.permitir_recoger_tienda === "1" ? "0" : "1",
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      config.permitir_recoger_tienda === "1" ? "bg-emerald-700" : "bg-stone-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        config.permitir_recoger_tienda === "1" ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Card 3: Pagos */}
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-pink-100/70 text-[#5B122C] flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-stone-900">Pagos</h2>
              </div>

              <div className="divide-y divide-stone-100 text-xs">
                {/* Mercado Pago */}
                <div className="py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-stone-900">Mercado Pago</div>
                    <div className="text-stone-500 text-[11px]">Tarjetas, transferencias y pagos en efectivo</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-semibold shrink-0">
                    Conectado
                  </span>
                </div>

                {/* Terminal Bancaria POS */}
                <div className="py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-stone-900">Terminal bancaria del POS</div>
                    <div className="text-stone-500 text-[11px]">Caja 1 y Caja 2</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-semibold shrink-0">
                    Conectado
                  </span>
                </div>

                {/* Pago en tienda al recoger */}
                <div className="py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-stone-900">Pago en tienda al recoger</div>
                    <div className="text-stone-500 text-[11px]">Se cobra en el POS</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-semibold shrink-0">
                    Conectado
                  </span>
                </div>
              </div>
            </div>

            {/* Card 4: Canales conectados */}
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-pink-100/70 text-[#5B122C] flex items-center justify-center shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-stone-900">Canales conectados</h2>
              </div>

              <div className="divide-y divide-stone-100 text-xs">
                {/* Tienda Web */}
                <div className="py-2 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-stone-900">Tienda web</div>
                    <div className="text-stone-500 text-[11px]">technovaderm.mx</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-semibold shrink-0">
                    Conectado
                  </span>
                </div>

                {/* App Móvil */}
                <div className="py-2 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-stone-900">App móvil</div>
                    <div className="text-stone-500 text-[11px]">iOS y Android</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-semibold shrink-0">
                    Conectado
                  </span>
                </div>

                {/* WhatsApp Business */}
                <div className="py-2 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-stone-900">WhatsApp Business</div>
                    <div className="text-stone-500 text-[11px]">Pedidos y avisos</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-semibold shrink-0">
                    Conectado
                  </span>
                </div>

                {/* Marketplace */}
                <div className="py-2 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-stone-900">Marketplace</div>
                    <div className="text-stone-500 text-[11px]">Publica tu catálogo con el mismo inventario</div>
                  </div>
                  {config.marketplace_conectado === "1" ? (
                    <button
                      onClick={() => handleToggleCanal("marketplace_conectado", true)}
                      className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-semibold shrink-0"
                    >
                      Conectado
                    </button>
                  ) : (
                    <button
                      onClick={() => handleToggleCanal("marketplace_conectado", false)}
                      className="px-4 py-1.5 rounded-full border border-stone-800 text-stone-900 font-semibold text-[11px] hover:bg-stone-50 transition-colors shrink-0"
                    >
                      Conectar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 5: Facturación (Ancho Completo Inferior) */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-pink-100/70 text-[#5B122C] flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <h2 className="text-base font-bold text-stone-900">Facturación</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              {/* RFC */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">RFC</label>
                <input
                  type="text"
                  placeholder="[RFC DEL NEGOCIO]"
                  value={config.rfc_negocio || ""}
                  onChange={(e) => setConfig({ ...config, rfc_negocio: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#5B122C]/30 focus:border-[#5B122C]"
                />
              </div>

              {/* Régimen Fiscal */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Régimen fiscal</label>
                <select
                  value={config.regimen_fiscal || "601 - General de Ley Personas Morales"}
                  onChange={(e) => setConfig({ ...config, regimen_fiscal: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#5B122C]/30 focus:border-[#5B122C]"
                >
                  <option value="601 - General de Ley Personas Morales">601 - General de Ley Personas Morales</option>
                  <option value="612 - Personas Físicas con Actividades Empresariales">
                    612 - Personas Físicas con Actividades Empresariales
                  </option>
                  <option value="626 - Régimen Simplificado de Confianza (RESICO)">
                    626 - Régimen Simplificado de Confianza (RESICO)
                  </option>
                </select>
              </div>

              {/* Serie de facturas */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Serie de facturas</label>
                <input
                  type="text"
                  placeholder="N"
                  value={config.serie_facturas || "N"}
                  onChange={(e) => setConfig({ ...config, serie_facturas: e.target.value })}
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-[#5B122C]/30 focus:border-[#5B122C]"
                />
              </div>
            </div>

            {/* Toggle Descarga de Facturas */}
            <div className="flex items-center justify-between pt-2 border-t border-stone-100">
              <span className="text-xs text-stone-700 font-medium">
                Permitir que las clientas descarguen su factura desde su cuenta
              </span>

              <button
                type="button"
                onClick={() =>
                  setConfig((prev) => ({
                    ...prev,
                    permitir_descargar_facturas: prev.permitir_descargar_facturas === "1" ? "0" : "1",
                  }))
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  config.permitir_descargar_facturas === "1" ? "bg-emerald-700" : "bg-stone-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    config.permitir_descargar_facturas === "1" ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Agregar Tienda */}
      {modalTienda && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 relative border border-stone-200">
            <button onClick={() => setModalTienda(false)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-600">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-serif font-bold text-[#5B122C]">Agregar nueva tienda</h3>
            <p className="text-xs text-stone-500">Registra una nueva sucursal física para ventas POS e inventarios.</p>

            <form onSubmit={handleAgregarTienda} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-stone-700 mb-1">Nombre de la Tienda</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Technova-Derm Sur"
                  value={formTienda.nombre}
                  onChange={(e) => setFormTienda({ ...formTienda, nombre: e.target.value })}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Dirección</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Av. Insurgentes Sur 1200, Col. del Valle"
                  value={formTienda.direccion}
                  onChange={(e) => setFormTienda({ ...formTienda, direccion: e.target.value })}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Ciudad</label>
                  <input
                    type="text"
                    required
                    placeholder="Guadalajara"
                    value={formTienda.ciudad}
                    onChange={(e) => setFormTienda({ ...formTienda, ciudad: e.target.value })}
                    className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Horario</label>
                  <input
                    type="text"
                    required
                    placeholder="Lun a sáb 10:00 a 20:00"
                    value={formTienda.horario_texto}
                    onChange={(e) => setFormTienda({ ...formTienda, horario_texto: e.target.value })}
                    className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalTienda(false)}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creandoTienda}
                  className="px-4 py-2 bg-[#5B122C] text-white font-semibold rounded-lg hover:bg-[#430d20] flex items-center gap-1.5"
                >
                  {creandoTienda && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Agregar tienda</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

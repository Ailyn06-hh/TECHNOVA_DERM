"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Search,
  Filter,
  Mail,
  Phone,
  Eye,
  EyeOff,
  Sparkles,
  ShoppingBag,
  Bell,
  CheckCircle2,
  AlertCircle,
  Calendar,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  Store,
  Tag,
  Loader2,
  Clock,
  HeartHandshake
} from "lucide-react";

interface Cliente {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  celular: string;
  acepta_promociones: number;
  fecha_registro: string;
  sucursal_preferida_id: number | null;
  sucursal_nombre: string | null;
  perfil_id: number | null;
  tipo_piel: string | null;
  presupuesto: string | null;
  total_compras: number;
  monto_total: number;
  ultima_compra_fecha: string | null;
  canales: string[];
  preocupaciones: string[];
}

interface Sucursal {
  id: number;
  nombre: string;
  ciudad: string;
}

interface PedidoHistorial {
  id: number;
  canal: string;
  estado: string;
  total: string;
  metodo_pago: string;
  creado_en: string;
  sucursal_nombre: string | null;
}

interface AlertaRecompra {
  producto_id: number;
  producto_nombre: string;
  sku: string;
  ultima_fecha_compra: string;
  dias_transcurridos: number;
  necesitaRecompra: boolean;
}

interface ClienteDetalle extends Cliente {
  pedidos: PedidoHistorial[];
  alertasRecompra: AlertaRecompra[];
}

export default function ClientesPage() {
  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [clienteDetalle, setClienteDetalle] = useState<ClienteDetalle | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  // Filtros
  const [searchQuery, setSearchQuery] = useState("");
  const [tipoPielFiltro, setTipoPielFiltro] = useState("");
  const [sucursalFiltro, setSucursalFiltro] = useState("");
  const [promocionesFiltro, setPromocionesFiltro] = useState("");
  const [canalFiltro, setCanalFiltro] = useState("");
  const [datosEnmascarados, setDatosEnmascarados] = useState(true);

  // Estados de acciones
  const [enviandoRecordatorio, setEnviandoRecordatorio] = useState<number | null>(null);
  const [actualizandoPromos, setActualizandoPromos] = useState(false);
  const [mensajeToast, setMensajeToast] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);

  const mostrarToast = (texto: string, tipo: "exito" | "error" = "exito") => {
    setMensajeToast({ texto, tipo });
    setTimeout(() => setMensajeToast(null), 3500);
  };

  const cargarClientes = async (targetId?: number | null) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (tipoPielFiltro) params.set("tipo_piel", tipoPielFiltro);
      if (sucursalFiltro) params.set("sucursal_id", sucursalFiltro);
      if (promocionesFiltro) params.set("promociones", promocionesFiltro);
      if (canalFiltro) params.set("canal", canalFiltro);
      if (targetId) params.set("cliente_id", String(targetId));

      const res = await fetch(`/api/admin/clientes?${params.toString()}`);
      const data = await res.json();

      if (data.ok) {
        setClientes(data.clientes || []);
        setSucursales(data.sucursales || []);
        if (data.clienteDetalle) {
          setClienteDetalle(data.clienteDetalle);
          setSelectedId(data.clienteDetalle.id);
        } else if (data.clientes && data.clientes.length > 0 && !targetId) {
          setSelectedId(data.clientes[0].id);
          cargarDetalleCliente(data.clientes[0].id);
        } else {
          setClienteDetalle(null);
        }
      } else {
        mostrarToast(data.error || "Error al cargar clientes", "error");
      }
    } catch (err) {
      console.error(err);
      mostrarToast("Error de conexión al cargar clientes", "error");
    } finally {
      setLoading(false);
    }
  };

  const cargarDetalleCliente = async (id: number) => {
    try {
      setLoadingDetalle(true);
      setSelectedId(id);
      const res = await fetch(`/api/admin/clientes?cliente_id=${id}`);
      const data = await res.json();
      if (data.ok && data.clienteDetalle) {
        setClienteDetalle(data.clienteDetalle);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetalle(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      cargarClientes(selectedId);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, tipoPielFiltro, sucursalFiltro, promocionesFiltro, canalFiltro]);

  const handleTogglePromociones = async () => {
    if (!clienteDetalle) return;
    const nuevoValor = clienteDetalle.acepta_promociones === 1 ? false : true;
    try {
      setActualizandoPromos(true);
      const res = await fetch("/api/admin/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "toggle_promociones",
          usuario_id: clienteDetalle.id,
          acepta_promociones: nuevoValor,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        mostrarToast(data.mensaje);
        setClienteDetalle({
          ...clienteDetalle,
          acepta_promociones: nuevoValor ? 1 : 0,
        });
        setClientes((prev) =>
          prev.map((c) => (c.id === clienteDetalle.id ? { ...c, acepta_promociones: nuevoValor ? 1 : 0 } : c))
        );
      } else {
        mostrarToast(data.error || "Error al actualizar", "error");
      }
    } catch (err) {
      mostrarToast("Error de red", "error");
    } finally {
      setActualizandoPromos(false);
    }
  };

  const handleEnviarRecordatorio = async (productoId: number, productoNombre: string) => {
    if (!clienteDetalle) return;
    try {
      setEnviandoRecordatorio(productoId);
      const res = await fetch("/api/admin/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "enviar_recordatorio",
          usuario_id: clienteDetalle.id,
          producto_id: productoId,
          producto_nombre: productoNombre,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        mostrarToast(`Recordatorio de ${productoNombre} enviado a ${clienteDetalle.nombre}`);
      } else {
        mostrarToast(data.error || "Error al enviar recordatorio", "error");
      }
    } catch (err) {
      mostrarToast("Error de red", "error");
    } finally {
      setEnviandoRecordatorio(null);
    }
  };

  const enmascararCorreo = (email: string) => {
    if (!datosEnmascarados) return email;
    const parts = email.split("@");
    if (parts.length < 2) return email;
    const name = parts[0];
    const maskedName = name.length > 2 ? name[0] + "***" + name[name.length - 1] : name[0] + "***";
    return `${maskedName}@${parts[1]}`;
  };

  const enmascararTelefono = (phone: string) => {
    if (!datosEnmascarados || !phone) return phone;
    if (phone.length < 7) return "***";
    return phone.slice(0, 3) + "****" + phone.slice(-3);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {mensajeToast && (
        <div
          className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 text-sm font-medium transition-all ${
            mensajeToast.tipo === "exito"
              ? "bg-emerald-800 text-white"
              : "bg-red-800 text-white"
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
          <h1 className="text-2xl font-serif text-[#5B122C]">Clientes y Perfiles de Piel</h1>
          <p className="text-sm text-stone-600 mt-1">
            Gestión de expedientes de clientas, historial omnicanal, diagnósticos dermatológicos y recordatorios.
          </p>
        </div>

        <button
          onClick={() => setDatosEnmascarados(!datosEnmascarados)}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
            datosEnmascarados
              ? "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
              : "bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200"
          }`}
        >
          {datosEnmascarados ? (
            <>
              <EyeOff className="w-4 h-4 text-amber-700" />
              <span>Datos Sensibles: Enmascarados</span>
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 text-stone-600" />
              <span>Datos Sensibles: Visibles</span>
            </>
          )}
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Búsqueda */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, correo o celular..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B122C]/30 focus:border-[#5B122C]"
            />
          </div>

          {/* Filtro Tipo Piel */}
          <div>
            <select
              value={tipoPielFiltro}
              onChange={(e) => setTipoPielFiltro(e.target.value)}
              className="w-full py-2 px-3 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B122C]/30 focus:border-[#5B122C]"
            >
              <option value="">Tipo de Piel: Todos</option>
              <option value="grasa">Grasa</option>
              <option value="seca">Seca</option>
              <option value="mixta">Mixta</option>
              <option value="sensible">Sensible</option>
              <option value="normal">Normal</option>
            </select>
          </div>

          {/* Filtro Sucursal */}
          <div>
            <select
              value={sucursalFiltro}
              onChange={(e) => setSucursalFiltro(e.target.value)}
              className="w-full py-2 px-3 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B122C]/30 focus:border-[#5B122C]"
            >
              <option value="">Sucursal: Todas</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Promociones */}
          <div>
            <select
              value={promocionesFiltro}
              onChange={(e) => setPromocionesFiltro(e.target.value)}
              className="w-full py-2 px-3 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B122C]/30 focus:border-[#5B122C]"
            >
              <option value="">Promociones: Todas</option>
              <option value="si">Acepta Promos</option>
              <option value="no">No Acepta Promos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid Principal: Lista + Detalle Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda: Lista de Clientes (5 columnas en pantallas grandes) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-stone-200 shadow-sm flex flex-col h-[700px] overflow-hidden">
          <div className="p-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Directorio de Clientes ({clientes.length})
            </span>
            {loading && <Loader2 className="w-4 h-4 text-[#5B122C] animate-spin" />}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
            {clientes.length === 0 ? (
              <div className="p-8 text-center text-stone-500 text-sm">
                No se encontraron clientes con los filtros aplicados.
              </div>
            ) : (
              clientes.map((c) => {
                const isSelected = selectedId === c.id;
                const inicial = c.nombre ? c.nombre[0].toUpperCase() : "C";
                const isVip = c.monto_total >= 1500;

                return (
                  <div
                    key={c.id}
                    onClick={() => cargarDetalleCliente(c.id)}
                    className={`p-4 cursor-pointer transition-colors hover:bg-stone-50 flex items-start gap-3 ${
                      isSelected ? "bg-amber-50/60 border-l-4 border-[#5B122C]" : ""
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-[#5B122C]/10 text-[#5B122C] flex items-center justify-center font-bold text-sm shrink-0">
                      {inicial}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="font-semibold text-stone-900 text-sm truncate">
                          {c.nombre} {c.apellido}
                        </h3>
                        {isVip && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-200">
                            VIP
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-stone-500 truncate mt-0.5">
                        {enmascararCorreo(c.correo)}
                      </div>

                      <div className="flex items-center gap-2 mt-2 text-[11px] text-stone-500">
                        {c.tipo_piel ? (
                          <span className="capitalize px-2 py-0.5 rounded-full bg-stone-100 border border-stone-200 font-medium text-stone-700">
                            Piel {c.tipo_piel}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-stone-50 border border-stone-200 text-stone-400 italic">
                            Sin diagnóstico
                          </span>
                        )}

                        <span className="font-medium text-stone-700">
                          {c.total_compras} {c.total_compras === 1 ? "pedido" : "pedidos"}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className={`w-4 h-4 mt-2 ${isSelected ? "text-[#5B122C]" : "text-stone-300"}`} />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Columna Derecha: Expediente del Cliente (7 columnas) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-stone-200 shadow-sm flex flex-col h-[700px] overflow-y-auto p-6 space-y-6">
          {loadingDetalle ? (
            <div className="flex-1 flex flex-col items-center justify-center text-stone-400 space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-[#5B122C]" />
              <p className="text-sm">Cargando expediente completo...</p>
            </div>
          ) : !clienteDetalle ? (
            <div className="flex-1 flex flex-col items-center justify-center text-stone-400 space-y-3">
              <Users className="w-12 h-12 text-stone-300" />
              <p className="text-sm font-medium text-stone-600">Selecciona una clienta para ver su expediente</p>
            </div>
          ) : (
            <>
              {/* Header Expediente */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-5">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-[#5B122C] text-white flex items-center justify-center font-serif text-2xl shadow-sm">
                    {clienteDetalle.nombre ? clienteDetalle.nombre[0].toUpperCase() : "C"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-stone-900">
                        {clienteDetalle.nombre} {clienteDetalle.apellido}
                      </h2>
                      {clienteDetalle.monto_total >= 1500 && (
                        <span className="bg-amber-100 text-amber-900 text-xs font-semibold px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-700" /> Cliente VIP
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 mt-1 flex items-center gap-2">
                      <span>Registrada: {new Date(clienteDetalle.fecha_registro).toLocaleDateString("es-MX")}</span>
                      <span>•</span>
                      <span>Sucursal: {clienteDetalle.sucursal_nombre || "E-Commerce"}</span>
                    </p>
                  </div>
                </div>

                {/* Switch Promociones */}
                <button
                  onClick={handleTogglePromociones}
                  disabled={actualizandoPromos}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-2 transition-all ${
                    clienteDetalle.acepta_promociones === 1
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                      : "bg-stone-100 text-stone-600 border-stone-300 hover:bg-stone-200"
                  }`}
                >
                  {actualizandoPromos ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Tag className="w-3.5 h-3.5" />
                  )}
                  <span>
                    Promociones: {clienteDetalle.acepta_promociones === 1 ? "ACTIVAS" : "INACTIVAS"}
                  </span>
                </button>
              </div>

              {/* Datos de Contacto y Métricas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-lg bg-stone-50 border border-stone-200 space-y-2 text-xs">
                  <div className="text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                    Contacto Directo
                  </div>
                  <div className="flex items-center gap-2 text-stone-700">
                    <Mail className="w-3.5 h-3.5 text-[#5B122C]" />
                    <span className="font-mono">{enmascararCorreo(clienteDetalle.correo)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-stone-700">
                    <Phone className="w-3.5 h-3.5 text-[#5B122C]" />
                    <span className="font-mono">{enmascararTelefono(clienteDetalle.celular)}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-stone-50 border border-stone-200 space-y-2 text-xs">
                  <div className="text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                    Valor de Vida (LTV)
                  </div>
                  <div className="text-lg font-bold text-[#5B122C]">
                    ${clienteDetalle.monto_total.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
                  </div>
                  <div className="text-stone-500 flex items-center justify-between">
                    <span>{clienteDetalle.total_compras} compras completadas</span>
                    {clienteDetalle.canales.length > 0 && (
                      <span className="capitalize bg-stone-200 px-1.5 py-0.5 rounded text-[10px] font-medium text-stone-700">
                        Canales: {clienteDetalle.canales.join(", ")}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Perfil Dermatológico */}
              <div className="border border-stone-200 rounded-lg p-4 bg-gradient-to-r from-stone-50 to-amber-50/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#5B122C] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" /> Perfil Dermatológico
                  </h3>
                  {clienteDetalle.tipo_piel && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-[#5B122C] text-white font-semibold capitalize">
                      Piel {clienteDetalle.tipo_piel}
                    </span>
                  )}
                </div>

                {clienteDetalle.tipo_piel ? (
                  <div className="space-y-2 text-xs">
                    {clienteDetalle.presupuesto && (
                      <div className="text-stone-600">
                        <span className="font-medium text-stone-900">Rango Presupuestal:</span> {clienteDetalle.presupuesto}
                      </div>
                    )}

                    <div>
                      <div className="text-stone-600 font-medium mb-1.5">Preocupaciones Principales:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {clienteDetalle.preocupaciones.length > 0 ? (
                          clienteDetalle.preocupaciones.map((p, idx) => (
                            <span
                              key={idx}
                              className="bg-white border border-stone-300 text-stone-800 px-2 py-0.5 rounded-md font-medium capitalize shadow-2xs"
                            >
                              {p.replace("_", " ")}
                            </span>
                          ))
                        ) : (
                          <span className="text-stone-400 italic">No especificó preocupaciones secundarias</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-stone-500 italic">
                    Esta clienta no ha completado la encuesta del Perfil de Piel en la plataforma.
                  </p>
                )}
              </div>

              {/* Alertas de Recompra Inteligente */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-700" /> Alertas de Recompra Inteligente
                </h3>

                {clienteDetalle.alertasRecompra.length === 0 ? (
                  <p className="text-xs text-stone-500 italic bg-stone-50 p-3 rounded-lg border border-stone-200">
                    No hay productos comprados registrados para alertas.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {clienteDetalle.alertasRecompra.map((item) => (
                      <div
                        key={item.producto_id}
                        className={`p-3 rounded-lg border flex items-center justify-between text-xs transition-colors ${
                          item.necesitaRecompra
                            ? "bg-amber-50/70 border-amber-300"
                            : "bg-stone-50 border-stone-200"
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-stone-900">{item.producto_nombre}</div>
                          <div className="text-stone-500 text-[11px] mt-0.5">
                            SKU: {item.sku} • Comprado hace {item.dias_transcurridos} días ({new Date(item.ultima_fecha_compra).toLocaleDateString("es-MX")})
                          </div>
                        </div>

                        <div>
                          {item.necesitaRecompra ? (
                            <button
                              onClick={() => handleEnviarRecordatorio(item.producto_id, item.producto_nombre)}
                              disabled={enviandoRecordatorio === item.producto_id}
                              className="px-2.5 py-1 rounded-md bg-[#5B122C] text-white font-medium hover:bg-[#430d20] flex items-center gap-1.5 shadow-2xs transition-colors"
                            >
                              {enviandoRecordatorio === item.producto_id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Bell className="w-3 h-3" />
                              )}
                              <span>Recordar</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-stone-500 bg-white border border-stone-200 px-2 py-0.5 rounded font-medium">
                              Stock reciente
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Historial de Pedidos */}
              <div className="space-y-3 pt-2 border-t border-stone-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-[#5B122C]" /> Historial de Pedidos ({clienteDetalle.pedidos.length})
                </h3>

                {clienteDetalle.pedidos.length === 0 ? (
                  <p className="text-xs text-stone-500 italic bg-stone-50 p-3 rounded-lg border border-stone-200">
                    Aún no ha realizado pedidos registrados.
                  </p>
                ) : (
                  <div className="border border-stone-200 rounded-lg overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-stone-100 text-stone-600 font-semibold border-b border-stone-200 text-[11px]">
                        <tr>
                          <th className="p-2.5">ID Pedido</th>
                          <th className="p-2.5">Fecha</th>
                          <th className="p-2.5">Canal</th>
                          <th className="p-2.5">Estado</th>
                          <th className="p-2.5 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 text-stone-700">
                        {clienteDetalle.pedidos.map((p) => (
                          <tr key={p.id} className="hover:bg-stone-50">
                            <td className="p-2.5 font-mono font-semibold text-stone-900">#{p.id}</td>
                            <td className="p-2.5">{new Date(p.creado_en).toLocaleDateString("es-MX")}</td>
                            <td className="p-2.5">
                              <span className="capitalize px-2 py-0.5 rounded bg-stone-100 text-stone-700 font-medium text-[11px]">
                                {p.canal || "web"}
                              </span>
                            </td>
                            <td className="p-2.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  p.estado === "entregado" || p.estado === "completado"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : p.estado === "cancelado"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {p.estado}
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-bold text-stone-900">
                              ${parseFloat(p.total).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

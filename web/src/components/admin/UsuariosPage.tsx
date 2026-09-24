"use client";

import { useState, useEffect } from "react";
import {
  UserPlus,
  Check,
  Minus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Store,
  ShieldCheck,
  User,
  Mail,
  X,
  RefreshCw
} from "lucide-react";

interface UsuarioItem {
  key: string;
  id: number;
  tipo: "admin" | "empleado";
  nombre: string;
  apellido: string;
  correo: string;
  rol: string;
  rol_etiqueta: string;
  tienda_nombre: string;
  tienda_ids: number[];
  activo: boolean;
  estado: string;
  estado_etiqueta: string;
  creado_en: string;
  ultima_actividad: string;
}

interface Sucursal {
  id: number;
  nombre: string;
  ciudad: string;
}

interface PermisoFila {
  permiso: string;
  cajera: boolean;
  gerente: boolean;
  admin: boolean;
}

export default function UsuariosPage() {
  const [loading, setLoading] = useState(true);
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [matrizPermisos, setMatrizPermisos] = useState<PermisoFila[]>([]);
  const [selectedUser, setSelectedUser] = useState<UsuarioItem | null>(null);

  // Estados del editor (panel derecho)
  const [editRol, setEditRol] = useState("");
  const [editTiendaId, setEditTiendaId] = useState<number>(0);
  const [editPinPos, setEditPinPos] = useState("");
  const [editActivo, setEditActivo] = useState(true);
  const [savingChanges, setSavingChanges] = useState(false);

  // Modal de Invitación
  const [modalAbierto, setModalAbierto] = useState(false);
  const [formInvitar, setFormInvitar] = useState({
    nombre: "",
    apellido: "",
    correo: "",
    rol: "cajera",
    sucursal_id: 1,
    pin_pos: "1234",
  });
  const [enviandoInvitacion, setEnviandoInvitacion] = useState(false);

  // Toast
  const [mensajeToast, setMensajeToast] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);

  const mostrarToast = (texto: string, tipo: "exito" | "error" = "exito") => {
    setMensajeToast({ texto, tipo });
    setTimeout(() => setMensajeToast(null), 3500);
  };

  const cargarUsuarios = async (selectKey?: string) => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/usuarios");
      const data = await res.json();
      if (data.ok) {
        setUsuarios(data.usuarios || []);
        setSucursales(data.sucursales || []);
        setMatrizPermisos(data.matrizPermisos || []);

        if (data.usuarios && data.usuarios.length > 0) {
          const target = selectKey
            ? data.usuarios.find((u: UsuarioItem) => u.key === selectKey) || data.usuarios[0]
            : data.usuarios[0];

          selectUsuario(target);
        }
      } else {
        mostrarToast(data.error || "Error al cargar usuarios", "error");
      }
    } catch (err) {
      console.error(err);
      mostrarToast("Error de conexión con el servidor", "error");
    } finally {
      setLoading(false);
    }
  };

  const selectUsuario = (u: UsuarioItem) => {
    setSelectedUser(u);
    setEditRol(u.rol);
    setEditTiendaId(u.tienda_ids.length > 0 ? u.tienda_ids[0] : 0);
    setEditActivo(u.activo);
    setEditPinPos("");
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const handleGuardarCambios = async () => {
    if (!selectedUser) return;
    try {
      setSavingChanges(true);
      const res = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "actualizar_usuario",
          id: selectedUser.id,
          tipo: selectedUser.tipo,
          rol: editRol,
          sucursal_id: editTiendaId,
          pin_pos: editPinPos,
          activo: editActivo,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        mostrarToast(data.mensaje);
        cargarUsuarios(selectedUser.key);
      } else {
        mostrarToast(data.error || "Error al guardar cambios", "error");
      }
    } catch (err) {
      mostrarToast("Error de red al guardar cambios", "error");
    } finally {
      setSavingChanges(false);
    }
  };

  const handleToggleActivo = async () => {
    if (!selectedUser) return;
    try {
      setSavingChanges(true);
      const nuevoActivo = !editActivo;
      const res = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "toggle_activo",
          id: selectedUser.id,
          tipo: selectedUser.tipo,
          activo: nuevoActivo,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        mostrarToast(data.mensaje);
        setEditActivo(nuevoActivo);
        cargarUsuarios(selectedUser.key);
      } else {
        mostrarToast(data.error || "Error al cambiar estado de acceso", "error");
      }
    } catch (err) {
      mostrarToast("Error de red", "error");
    } finally {
      setSavingChanges(false);
    }
  };

  const handleInvitarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setEnviandoInvitacion(true);
      const res = await fetch("/api/admin/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "invitar_usuario",
          ...formInvitar,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        mostrarToast(data.mensaje);
        setModalAbierto(false);
        setFormInvitar({
          nombre: "",
          apellido: "",
          correo: "",
          rol: "cajera",
          sucursal_id: 1,
          pin_pos: "1234",
        });
        cargarUsuarios();
      } else {
        mostrarToast(data.error || "Error al enviar invitación", "error");
      }
    } catch (err) {
      mostrarToast("Error de conexión", "error");
    } finally {
      setEnviandoInvitacion(false);
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

      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <h1 className="text-2xl font-serif text-[#5B122C]">Usuarios y roles</h1>
          <p className="text-sm text-stone-600 mt-1">
            Cada persona entra con su propia cuenta y ve solo lo que su rol permite.
          </p>
        </div>

        <button
          onClick={() => setModalAbierto(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#5B122C] text-white text-sm font-semibold rounded-lg hover:bg-[#430d20] transition-colors shadow-sm self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invitar usuario</span>
        </button>
      </div>

      {/* Layout Split: Tablas Principales (Izquierda) + Editor Panel (Derecha) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Columna Izquierda (7 columnas) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Tabla de Usuarios */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-600">
                Personal Registrado ({usuarios.length})
              </span>
              {loading && <Loader2 className="w-4 h-4 text-[#5B122C] animate-spin" />}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-100 text-stone-600 font-semibold border-b border-stone-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Persona</th>
                    <th className="p-3">Rol</th>
                    <th className="p-3">Tienda</th>
                    <th className="p-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700 font-medium">
                  {usuarios.map((u) => {
                    const isSelected = selectedUser?.key === u.key;

                    let rolBadgeClass = "bg-stone-100 text-stone-700 border-stone-200";
                    if (u.rol === "admin") rolBadgeClass = "bg-pink-100 text-pink-900 border-pink-200";
                    else if (u.rol === "gerente") rolBadgeClass = "bg-purple-100 text-purple-900 border-purple-200";

                    let estadoBadgeClass = "bg-emerald-100 text-emerald-800 border-emerald-200";
                    if (u.estado === "invitacion_enviada") estadoBadgeClass = "bg-amber-100 text-amber-900 border-amber-200";
                    else if (u.estado === "inactiva") estadoBadgeClass = "bg-stone-100 text-stone-500 border-stone-200";

                    return (
                      <tr
                        key={u.key}
                        onClick={() => selectUsuario(u)}
                        className={`cursor-pointer transition-colors hover:bg-stone-50 ${
                          isSelected ? "bg-amber-50/70 border-l-4 border-[#5B122C]" : ""
                        }`}
                      >
                        <td className="p-3">
                          <div className="font-semibold text-stone-900">
                            {u.nombre} {u.apellido}
                          </div>
                          <div className="text-[11px] text-stone-500 font-mono mt-0.5">{u.correo}</div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold ${rolBadgeClass}`}>
                            {u.rol_etiqueta}
                          </span>
                        </td>
                        <td className="p-3 text-stone-600">{u.tienda_nombre}</td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold ${estadoBadgeClass}`}>
                            {u.estado_etiqueta}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 2: Permisos por rol */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-bold text-stone-900">Permisos por rol</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold text-[11px]">
                  <tr>
                    <th className="p-2.5">Permiso</th>
                    <th className="p-2.5 text-center">Cajera</th>
                    <th className="p-2.5 text-center">Gerente</th>
                    <th className="p-2.5 text-center">Administradora</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700">
                  {matrizPermisos.map((p, idx) => (
                    <tr key={idx} className="hover:bg-stone-50/50">
                      <td className="p-2.5 font-medium">{p.permiso}</td>
                      <td className="p-2.5 text-center">
                        {p.cajera ? (
                          <Check className="w-4 h-4 text-emerald-600 inline" />
                        ) : (
                          <Minus className="w-4 h-4 text-stone-300 inline" />
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        {p.gerente ? (
                          <Check className="w-4 h-4 text-emerald-600 inline" />
                        ) : (
                          <Minus className="w-4 h-4 text-stone-300 inline" />
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        {p.admin ? (
                          <Check className="w-4 h-4 text-emerald-600 inline" />
                        ) : (
                          <Minus className="w-4 h-4 text-stone-300 inline" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Panel de Edición de Usuario (5 columnas) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-stone-200 shadow-sm p-6 flex flex-col h-fit space-y-6">
          {!selectedUser ? (
            <div className="py-12 text-center text-stone-400 text-sm">
              Selecciona una persona para editar su rol y accesos
            </div>
          ) : (
            <>
              {/* Header Editor */}
              <div className="border-b border-stone-200 pb-4">
                <h2 className="text-xl font-serif text-stone-900">
                  {selectedUser.nombre} {selectedUser.apellido}
                </h2>
                <p className="text-xs text-stone-500 font-mono mt-1">
                  {selectedUser.correo} • desde {new Date(selectedUser.creado_en).toLocaleDateString("es-MX", { month: "short", year: "numeric" })}
                </p>
              </div>

              {/* Formulario */}
              <div className="space-y-4 text-xs">
                {/* Selector de Rol */}
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Rol</label>
                  <select
                    value={editRol}
                    onChange={(e) => setEditRol(e.target.value)}
                    className="w-full py-2 px-3 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#5B122C]/30 focus:border-[#5B122C]"
                  >
                    <option value="cajera">Cajera</option>
                    <option value="supervisora">Supervisora</option>
                    <option value="gerente">Gerente de tienda</option>
                    <option value="admin">Administradora</option>
                  </select>
                </div>

                {/* Selector de Tienda */}
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Tienda / Sucursal</label>
                  <select
                    value={editTiendaId}
                    onChange={(e) => setEditTiendaId(Number(e.target.value))}
                    className="w-full py-2 px-3 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#5B122C]/30 focus:border-[#5B122C]"
                  >
                    <option value={0}>Todas (Acceso Global)</option>
                    {sucursales.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre} ({s.ciudad})
                      </option>
                    ))}
                  </select>
                </div>

                {/* PIN del POS */}
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">PIN del POS</label>
                  <input
                    type="password"
                    placeholder="•••• (Dejar en blanco para no cambiar)"
                    maxLength={6}
                    value={editPinPos}
                    onChange={(e) => setEditPinPos(e.target.value)}
                    className="w-full py-2 px-3 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-[#5B122C]/30 focus:border-[#5B122C]"
                  />
                  <p className="text-[11px] text-stone-400 mt-1">Permite iniciar sesión rápido en la caja POS.</p>
                </div>

                {/* Toggle Acceso Activo */}
                <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                  <div>
                    <span className="font-semibold text-stone-800">Acceso activo</span>
                    <p className="text-[11px] text-stone-500">Habilita o revoca la entrada al sistema</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setEditActivo(!editActivo)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      editActivo ? "bg-emerald-700" : "bg-stone-300"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        editActivo ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Última actividad */}
                <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 text-stone-600 text-[11px] italic">
                  {selectedUser.ultima_actividad}
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="pt-4 space-y-2 border-t border-stone-200">
                <button
                  onClick={handleGuardarCambios}
                  disabled={savingChanges}
                  className="w-full py-2.5 bg-[#5B122C] text-white font-semibold text-xs rounded-lg hover:bg-[#430d20] transition-colors flex items-center justify-center gap-2 shadow-xs"
                >
                  {savingChanges ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Guardar cambios</span>
                </button>

                <button
                  onClick={handleToggleActivo}
                  disabled={savingChanges}
                  className="w-full py-2.5 bg-white text-stone-700 border border-stone-300 font-semibold text-xs rounded-lg hover:bg-stone-50 transition-colors"
                >
                  {editActivo ? "Desactivar acceso" : "Activar acceso"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal de Invitación de Usuario */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 relative border border-stone-200">
            <button
              onClick={() => setModalAbierto(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-serif font-bold text-[#5B122C]">Invitar nuevo usuario</h3>
            <p className="text-xs text-stone-500">
              Registra un nuevo miembro del equipo. Se enviará una invitación a su correo corporativo.
            </p>

            <form onSubmit={handleInvitarUsuario} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Andrea"
                    value={formInvitar.nombre}
                    onChange={(e) => setFormInvitar({ ...formInvitar, nombre: e.target.value })}
                    className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Apellido</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Pérez"
                    value={formInvitar.apellido}
                    onChange={(e) => setFormInvitar({ ...formInvitar, apellido: e.target.value })}
                    className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  placeholder="andrea@technovaderm.mx"
                  value={formInvitar.correo}
                  onChange={(e) => setFormInvitar({ ...formInvitar, correo: e.target.value })}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Rol</label>
                  <select
                    value={formInvitar.rol}
                    onChange={(e) => setFormInvitar({ ...formInvitar, rol: e.target.value })}
                    className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg"
                  >
                    <option value="cajera">Cajera</option>
                    <option value="supervisora">Supervisora</option>
                    <option value="gerente">Gerente de tienda</option>
                    <option value="admin">Administradora</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Tienda / Sucursal</label>
                  <select
                    value={formInvitar.sucursal_id}
                    onChange={(e) => setFormInvitar({ ...formInvitar, sucursal_id: Number(e.target.value) })}
                    className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg"
                  >
                    <option value={0}>Todas</option>
                    {sucursales.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">PIN Inicial POS</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="1234"
                  value={formInvitar.pin_pos}
                  onChange={(e) => setFormInvitar({ ...formInvitar, pin_pos: e.target.value })}
                  className="w-full p-2 bg-stone-50 border border-stone-300 rounded-lg font-mono"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-stone-700 hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={enviandoInvitacion}
                  className="px-4 py-2 bg-[#5B122C] text-white font-semibold rounded-lg hover:bg-[#430d20] flex items-center gap-1.5"
                >
                  {enviandoInvitacion && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Enviar invitación</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { AlertCircle, Loader2, Store, Truck, Check } from "lucide-react";

export interface EligibleOrderItem {
  id: number;
  pedido_item_id?: number;
  producto_id?: number;
  nombre: string;
  imagen?: string;
  cantidad: number;
  precio_unitario?: number;
  disponibleDevolucion?: number;
}

export interface EligibleOrder {
  id: number;
  folio: string;
  label: string;
  fecha?: string;
  fechaTexto?: string;
  items: EligibleOrderItem[];
}

export const MOTIVOS_DEVOLUCION = [
  { clave: "danado", label: "Producto dañado o defectuoso" },
  { clave: "reaccion", label: "Reacción alérgica o irritación en la piel" },
  { clave: "no_esperado", label: "No era el producto que esperaba" },
  { clave: "equivocado", label: "Recibí un producto equivocado" },
  { clave: "otro", label: "Otro motivo" },
];

export interface ReturnRequestFormProps {
  pedidosElegibles?: EligibleOrder[];
  pedidoPreseleccionado?: {
    folio: string;
    items: EligibleOrderItem[];
  };
  variant?: "inline" | "modal";
  onSuccess?: (data: any) => void;
  onCancel?: () => void;
  showToast?: (opts: { message: string; type: "success" | "error" | "info" }) => void;
}

export default function ReturnRequestForm({
  pedidosElegibles = [],
  pedidoPreseleccionado,
  variant = "inline",
  onSuccess,
  onCancel,
  showToast,
}: ReturnRequestFormProps) {
  // Folio seleccionado
  const [selectedFolio, setSelectedFolio] = useState<string>(
    pedidoPreseleccionado?.folio || (pedidosElegibles.length > 0 ? pedidosElegibles[0].folio : "")
  );

  // Items del pedido activo
  const activeItems: EligibleOrderItem[] = React.useMemo(() => {
    if (pedidoPreseleccionado) {
      return pedidoPreseleccionado.items;
    }
    const found = pedidosElegibles.find((p) => p.folio === selectedFolio);
    return found ? found.items : [];
  }, [pedidoPreseleccionado, pedidosElegibles, selectedFolio]);

  // Selección de items y cantidades
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>({});
  const [motivo, setMotivo] = useState("danado");
  const [comentario, setComentario] = useState("");
  const [metodo, setMetodo] = useState<"tienda" | "recoleccion">("tienda");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exitoMsg, setExitoMsg] = useState<string | null>(null);

  // Inicializar o resetear selección al cambiar de pedido o items
  useEffect(() => {
    if (!pedidoPreseleccionado && pedidosElegibles.length > 0 && !selectedFolio) {
      setSelectedFolio(pedidosElegibles[0].folio);
    }
  }, [pedidoPreseleccionado, pedidosElegibles, selectedFolio]);

  useEffect(() => {
    if (activeItems.length > 0) {
      // Seleccionar el primer producto disponible por omisión
      const initialMap: Record<number, number> = {};
      const firstAvailable = activeItems.find(
        (it) => (it.disponibleDevolucion !== undefined ? it.disponibleDevolucion : it.cantidad) > 0
      );
      if (firstAvailable) {
        initialMap[firstAvailable.id] = 1;
      }
      setSelectedItems(initialMap);
      setErrorMsg(null);
      setExitoMsg(null);
    } else {
      setSelectedItems({});
    }
  }, [selectedFolio, activeItems]);

  const handleToggleItem = (itemId: number) => {
    setSelectedItems((prev) => {
      const copy = { ...prev };
      if (copy[itemId]) {
        delete copy[itemId];
      } else {
        copy[itemId] = 1;
      }
      return copy;
    });
  };

  const handleQuantityChange = (itemId: number, qty: number, maxAvailable: number) => {
    const safeQty = Math.max(1, Math.min(qty, maxAvailable));
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: safeQty,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setExitoMsg(null);

    if (!selectedFolio) {
      setErrorMsg("Por favor selecciona un pedido.");
      return;
    }

    const itemsArray = Object.entries(selectedItems)
      .map(([id, cant]) => ({
        pedido_item_id: Number(id),
        cantidad: Number(cant),
      }))
      .filter((it) => it.cantidad > 0);

    if (itemsArray.length === 0) {
      setErrorMsg("Debes seleccionar al menos un producto para devolver.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(
        `/api/cuenta/pedidos/${encodeURIComponent(selectedFolio)}/devolucion`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: itemsArray,
            motivo,
            comentario: comentario.trim(),
            metodo,
          }),
        }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        const errorText = data?.error || "Error al procesar la devolución.";
        setErrorMsg(errorText);
        showToast?.({ message: errorText, type: "error" });
        return;
      }

      const mensajeExito = `Solicitud ${data.devolucion?.folio || ""} recibida. Revisaremos tu caso en 48 horas.`;
      setExitoMsg(mensajeExito);
      showToast?.({ message: mensajeExito, type: "success" });

      onSuccess?.(data);

      if (variant === "inline") {
        // Limpiar formulario tras éxito en vista inline
        setSelectedItems({});
        setComentario("");
      }
    } catch (err: any) {
      console.error("[RETURN REQUEST ERROR]:", err);
      const errTxt = "Error de conexión al enviar la solicitud.";
      setErrorMsg(errTxt);
      showToast?.({ message: errTxt, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const availableItems = activeItems.filter(
    (it) => (it.disponibleDevolucion !== undefined ? it.disponibleDevolucion : it.cantidad) > 0
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      {errorMsg && (
        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {exitoMsg && (
        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-2">
          <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
          <span>{exitoMsg}</span>
        </div>
      )}

      {/* Selector de Pedido (solo si no viene predeterminado por el modal) */}
      {!pedidoPreseleccionado && (
        <div>
          <label htmlFor="pedido-select" className="block text-xs font-semibold text-stone-700 mb-1.5">
            Pedido
          </label>
          {pedidosElegibles.length === 0 ? (
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-stone-500 text-[11px]">
              No tienes pedidos recientes elegibles para devolución (dentro de los 30 días de garantía).
            </div>
          ) : (
            <select
              id="pedido-select"
              value={selectedFolio}
              onChange={(e) => setSelectedFolio(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs text-stone-800 focus:border-[#5B122C] focus:ring-1 focus:ring-[#5B122C] outline-none bg-white font-medium"
            >
              {pedidosElegibles.map((ped) => (
                <option key={ped.folio} value={ped.folio}>
                  {ped.label}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Lista de Productos del Pedido */}
      <div>
        <label className="block text-xs font-semibold text-stone-700 mb-1.5">
          Producto{availableItems.length > 1 ? "s" : ""}
        </label>

        {availableItems.length === 0 ? (
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-stone-400 text-center text-[11px]">
            {selectedFolio
              ? "Este pedido no cuenta con piezas disponibles para devolver."
              : "Selecciona un pedido para ver los productos."}
          </div>
        ) : (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {availableItems.map((it) => {
              const isSelected = Boolean(selectedItems[it.id]);
              const currentQty = selectedItems[it.id] || 1;
              const maxQty = it.disponibleDevolucion !== undefined ? it.disponibleDevolucion : it.cantidad;

              return (
                <div
                  key={it.id}
                  className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2.5 ${
                    isSelected
                      ? "border-[#5B122C] bg-[#FAF3F6]/50"
                      : "border-stone-200 bg-white hover:border-stone-300"
                  }`}
                >
                  <label className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1 select-none">
                    {/* Checkbox estilizado con vino */}
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0 ${
                        isSelected
                          ? "bg-[#5B122C] border-[#5B122C] text-white"
                          : "border-stone-300 bg-white"
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        handleToggleItem(it.id);
                      }}
                    >
                      {isSelected ? (
                        <Check className="w-3 h-3 stroke-[3]" />
                      ) : (
                        <div className="w-1.5 h-0.5 bg-stone-300 rounded-full" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <span className="font-medium text-stone-900 block truncate text-xs">
                        {it.nombre}
                      </span>
                      <span className="text-[10px] text-stone-500">
                        {maxQty} {maxQty === 1 ? "pieza disponible" : "piezas disponibles"}
                      </span>
                    </div>
                  </label>

                  {isSelected && maxQty > 1 && (
                    <div className="flex items-center gap-1 shrink-0 bg-white px-1.5 py-0.5 rounded-lg border border-stone-200">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(it.id, currentQty - 1, maxQty)}
                        disabled={currentQty <= 1}
                        className="w-5 h-5 rounded-sm text-stone-700 hover:bg-stone-100 disabled:opacity-30 font-bold"
                        aria-label="Disminuir"
                      >
                        -
                      </button>
                      <span className="w-4 text-center font-mono font-semibold text-stone-900 text-xs">
                        {currentQty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(it.id, currentQty + 1, maxQty)}
                        disabled={currentQty >= maxQty}
                        className="w-5 h-5 rounded-sm text-stone-700 hover:bg-stone-100 disabled:opacity-30 font-bold"
                        aria-label="Aumentar"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Motivo */}
      <div>
        <label htmlFor="motivo-select" className="block text-xs font-semibold text-stone-700 mb-1.5">
          Motivo
        </label>
        <select
          id="motivo-select"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs text-stone-800 focus:border-[#5B122C] focus:ring-1 focus:ring-[#5B122C] outline-none bg-white"
        >
          {MOTIVOS_DEVOLUCION.map((m) => (
            <option key={m.clave} value={m.clave}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Método de entrega (sucursal o recolección) */}
      <div>
        <label className="block text-xs font-semibold text-stone-700 mb-1.5">
          Forma de entrega
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label
            className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-center text-center ${
              metodo === "tienda"
                ? "border-[#5B122C] bg-[#FAF3F6]/50 font-medium text-[#5B122C]"
                : "border-stone-200 text-stone-600 hover:border-stone-300"
            }`}
          >
            <input
              type="radio"
              name="metodo_entrega"
              value="tienda"
              checked={metodo === "tienda"}
              onChange={() => setMetodo("tienda")}
              className="sr-only"
            />
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <Store className="w-3.5 h-3.5" />
              <span className="text-xs">En sucursal</span>
            </div>
            <span className="text-[10px] text-stone-400">Sin costo · Inmediato</span>
          </label>

          <label
            className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-center text-center ${
              metodo === "recoleccion"
                ? "border-[#5B122C] bg-[#FAF3F6]/50 font-medium text-[#5B122C]"
                : "border-stone-200 text-stone-600 hover:border-stone-300"
            }`}
          >
            <input
              type="radio"
              name="metodo_entrega"
              value="recoleccion"
              checked={metodo === "recoleccion"}
              onChange={() => setMetodo("recoleccion")}
              className="sr-only"
            />
            <div className="flex items-center justify-center gap-1.5 mb-0.5">
              <Truck className="w-3.5 h-3.5" />
              <span className="text-xs">Por paquetería</span>
            </div>
            <span className="text-[10px] text-stone-400">Guía a domicilio</span>
          </label>
        </div>
      </div>

      {/* Comentario adicional opcional */}
      {variant === "modal" && (
        <div>
          <div className="flex justify-between items-center mb-1">
            <label htmlFor="comentario-input" className="block text-xs font-semibold text-stone-700">
              Comentarios adicionales (opcional)
            </label>
            <span className="text-[10px] text-stone-400">{comentario.length}/500</span>
          </div>
          <textarea
            id="comentario-input"
            rows={2}
            maxLength={500}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Detalles sobre el estado del producto..."
            className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs focus:border-[#5B122C] focus:ring-1 focus:ring-[#5B122C] outline-none resize-none"
          />
        </div>
      )}

      {/* Botones de acción */}
      <div className="pt-2">
        {variant === "modal" ? (
          <div className="flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-full text-xs font-semibold text-stone-600 hover:bg-stone-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || availableItems.length === 0}
              className="px-6 py-2.5 rounded-full text-xs font-semibold text-white bg-[#5B122C] hover:bg-[#4A0E17] active:scale-[0.98] transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <span>Confirmar solicitud</span>
              )}
            </button>
          </div>
        ) : (
          <div>
            <button
              type="submit"
              disabled={isLoading || availableItems.length === 0 || !selectedFolio}
              className="w-full py-3 rounded-xl text-xs font-semibold text-white bg-[#1A1715] hover:bg-black active:scale-[0.99] transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Enviando solicitud...</span>
                </>
              ) : (
                <span>Enviar solicitud</span>
              )}
            </button>
            <p className="text-[11px] text-stone-400 text-center mt-2.5">
              Revisamos tu solicitud en 48 horas.
            </p>
          </div>
        )}
      </div>
    </form>
  );
}

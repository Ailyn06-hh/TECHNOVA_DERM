/**
 * Catálogos y reglas de negocio para el Perfil de Piel (Onboarding)
 * Compartido entre Frontend y Backend (Single Source of Truth)
 */

export interface OptionCatalogItem {
  id: string;
  label: string;
}

export interface BudgetCatalogItem extends OptionCatalogItem {
  id: "bajo" | "medio" | "alto";
  minPrice: number;
  maxPrice: number | null; // null significa sin tope superior
}

// 1. Tipos de Piel (Selección Única)
export const TIPOS_PIEL = [
  { id: "seca", label: "Seca" },
  { id: "grasa", label: "Grasa" },
  { id: "mixta", label: "Mixta" },
  { id: "normal", label: "Normal" },
  { id: "sensible", label: "Sensible" },
] as const;

export type TipoPielKey = (typeof TIPOS_PIEL)[number]["id"];

// 2. Preocupaciones de la Piel (Selección Múltiple)
export const PREOCUPACIONES = [
  { id: "hidratacion", label: "Hidratación" },
  { id: "manchas", label: "Manchas" },
  { id: "poros", label: "Poros" },
  { id: "proteccion_solar", label: "Protección solar" },
  { id: "anti_edad", label: "Anti-edad" },
] as const;

export type PreocupacionKey = (typeof PREOCUPACIONES)[number]["id"];

// 3. Rangos de Presupuesto por Producto (Selección Única)
export const PRESUPUESTOS: readonly BudgetCatalogItem[] = [
  { id: "bajo", label: "Hasta $250", minPrice: 0, maxPrice: 250 },
  { id: "medio", label: "$250 a $450", minPrice: 250, maxPrice: 450 },
  { id: "alto", label: "Más de $450", minPrice: 450, maxPrice: null },
] as const;

export type PresupuestoKey = (typeof PRESUPUESTOS)[number]["id"];

// Funciones de validación para APIs del servidor
export function isValidTipoPiel(val: any): val is TipoPielKey {
  return TIPOS_PIEL.some((t) => t.id === val);
}

export function isValidPreocupacion(val: any): val is PreocupacionKey {
  return PREOCUPACIONES.some((p) => p.id === val);
}

export function isValidPresupuesto(val: any): val is PresupuestoKey {
  return PRESUPUESTOS.some((b) => b.id === val);
}

/**
 * Shipping options — F3.1
 * Flat config table. No dynamic quoting for F3.1.
 * Cost is in CLP integer (not cents — matches Chilean pricing convention).
 */

export interface ShippingOption {
  id: string;
  label: string;
  description: string;
  cost: number; // CLP
  estimatedDays: number;
}

const SHIPPING_OPTIONS: readonly ShippingOption[] = [
  {
    id: "standard",
    label: "Despacho estándar",
    description: "Entrega en 3-5 días hábiles",
    cost: 3990,
    estimatedDays: 5,
  },
  {
    id: "express",
    label: "Despacho express",
    description: "Entrega en 1-2 días hábiles",
    cost: 6990,
    estimatedDays: 2,
  },
  {
    id: "same_day",
    label: "Despacho el mismo día",
    description: "Entrega hoy (pedidos antes de las 14:00)",
    cost: 9990,
    estimatedDays: 0,
  },
];

const COST_MAP = new Map<string, number>(
  SHIPPING_OPTIONS.map((o) => [o.id, o.cost]),
);

export function getShippingOptions(): readonly ShippingOption[] {
  return SHIPPING_OPTIONS;
}

export function getShippingCost(optionId: string): number | null {
  return COST_MAP.get(optionId) ?? null;
}

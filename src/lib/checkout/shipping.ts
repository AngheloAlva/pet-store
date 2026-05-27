/**
 * Shipping options — F3.1/F3.3
 * Static options for F3.1 compatibility; carrier-aware getOptionsForCommune for F3.3.
 * Cost is in CLP integer (not cents — matches Chilean pricing convention).
 */
import type { AppSettings } from "@/app/actions/admin/settings";
import { isCovered } from "./communes";
import { propio } from "@/lib/carriers/propio";
import { mockChilexpress, mockStarken } from "@/lib/carriers/mock-courier";

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

/**
 * F3.3 — Returns carrier options for a commune, taking settings into account.
 * - Covered commune → propio option included
 * - Always includes mock_chilexpress + mock_starken
 * - orderTotal used for propio free-shipping threshold
 */
export async function getOptionsForCommune(
  commune: string,
  settings: Pick<AppSettings, "coveredCommunes" | "freeShippingThreshold">,
  orderTotal = 0,
  regionKey = "RM",
): Promise<ShippingOption[]> {
  const covered = isCovered(commune, settings);
  const options: ShippingOption[] = [];

  if (covered) {
    const propioResult = await propio.quote({
      items: [],
      commune,
      orderTotal,
      freeShippingThreshold: settings.freeShippingThreshold ?? 20000,
    });
    if (propioResult) {
      options.push({
        id: "propio",
        label: propio.label,
        description: propioResult.cost === 0 ? "Despacho gratuito" : "Entrega en 3-5 días hábiles",
        cost: propioResult.cost,
        estimatedDays: propioResult.estimatedDays,
      });
    }
  }

  const items = [{ variantId: "", productId: "", sku: "", name: "", quantity: 1, unitPrice: 0, lineTotal: 0 }];
  const chileResult = await mockChilexpress.quote({ items, commune, regionKey });
  const starkenResult = await mockStarken.quote({ items, commune, regionKey });

  if (chileResult) {
    options.push({
      id: "mock_chilexpress",
      label: mockChilexpress.label,
      description: `Entrega en ${chileResult.estimatedDays} días`,
      cost: chileResult.cost,
      estimatedDays: chileResult.estimatedDays,
    });
  }

  if (starkenResult) {
    options.push({
      id: "mock_starken",
      label: mockStarken.label,
      description: `Entrega en ${starkenResult.estimatedDays} días`,
      cost: starkenResult.cost,
      estimatedDays: starkenResult.estimatedDays,
    });
  }

  return options;
}

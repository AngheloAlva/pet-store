/**
 * Carrier registry — F3.3
 * Mirrors payments/registry.ts pattern.
 */
import type { CarrierId } from "@/lib/shipping/types";

export interface CartLine {
  variantId: string;
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Carrier {
  id: CarrierId | string; // allow test carriers with arbitrary ids
  label: string;
  quote(args: {
    items: CartLine[];
    commune: string;
    storeId?: string;
    orderTotal?: number;
  }): Promise<{ cost: number; estimatedDays: number }> | null;
  generateTrackingNumber?(): string;
}

const registry = new Map<string, Carrier>();

export function registerCarrier(carrier: Carrier): void {
  registry.set(carrier.id, carrier);
}

export function getCarrier(id: string): Carrier {
  const carrier = registry.get(id);
  if (!carrier) {
    throw new Error(`Carrier not registered: ${id}`);
  }
  return carrier;
}

export function getAllCarriers(): Carrier[] {
  return Array.from(registry.values());
}

export function getRegisteredCarrierIds(): string[] {
  return Array.from(registry.keys());
}

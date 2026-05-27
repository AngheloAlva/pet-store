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

// Extended args — carriers may use a subset; extra fields are ignored
export interface CarrierQuoteArgs {
  items: CartLine[];
  commune: string;
  storeId?: string;
  orderTotal?: number;
  freeShippingThreshold?: number;
  regionKey?: string;
  [key: string]: unknown; // allow carrier-specific extensions
}

export interface Carrier {
  id: CarrierId | string; // allow test carriers with arbitrary ids
  label: string;
  quote(args: CarrierQuoteArgs): Promise<{ cost: number; estimatedDays: number }> | null;
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

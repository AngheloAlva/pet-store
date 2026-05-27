/**
 * requiresAddress — F3.3
 * Pure predicate: returns true when the delivery type requires a shipping address.
 */
import type { DeliveryType } from "@/db/schema";

export function requiresAddress(deliveryType: DeliveryType | null | undefined): boolean {
  if (!deliveryType) return false;
  return deliveryType === "despacho" || deliveryType === "courier";
}

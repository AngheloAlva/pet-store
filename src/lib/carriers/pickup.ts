/**
 * Pickup (retiro en tienda) provider — F3.3
 * Cost always 0. storeId flows through metadata only.
 */
import type { Carrier } from "./registry";

export const pickup: Carrier = {
  id: "pickup",
  label: "Retiro en tienda",
  async quote() {
    return { cost: 0, estimatedDays: 0 };
  },
  // no generateTrackingNumber — pickup has no tracking number
};

/**
 * Despacho Propio provider — F3.3
 * Cost is 0 above freeShippingThreshold; FLAT_RATE below.
 */
import type { Carrier, CarrierQuoteArgs } from "./registry";

const FLAT_RATE = 3990; // CLP
const DEFAULT_ESTIMATED_DAYS = 3;

export const propio: Carrier = {
  id: "propio",
  label: "Despacho Propio",
  async quote(args: CarrierQuoteArgs) {
    const orderTotal = (args.orderTotal as number | undefined) ?? 0;
    const freeShippingThreshold = (args.freeShippingThreshold as number | undefined) ?? 20000;
    const cost = orderTotal >= freeShippingThreshold ? 0 : FLAT_RATE;
    return { cost, estimatedDays: DEFAULT_ESTIMATED_DAYS };
  },
};

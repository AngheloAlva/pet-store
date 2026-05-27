/**
 * Despacho Propio provider — F3.3
 * Cost is 0 above freeShippingThreshold; FLAT_RATE below.
 */
import type { Carrier, CartLine } from "./registry";

const FLAT_RATE = 3990; // CLP
const DEFAULT_ESTIMATED_DAYS = 3;

export interface PropioQuoteArgs {
  items: CartLine[];
  commune: string;
  storeId?: string;
  orderTotal?: number;
  freeShippingThreshold?: number;
}

export const propio: Carrier & {
  quote(args: PropioQuoteArgs): Promise<{ cost: number; estimatedDays: number }>;
} = {
  id: "propio",
  label: "Despacho Propio",
  async quote({ orderTotal = 0, freeShippingThreshold = 20000 }) {
    const cost = orderTotal >= freeShippingThreshold ? 0 : FLAT_RATE;
    return { cost, estimatedDays: DEFAULT_ESTIMATED_DAYS };
  },
};

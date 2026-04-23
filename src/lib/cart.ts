import type { CartItem } from "@/stores/cart";

export const MAX_PER_LINE = 99;

export function clampItemQuantity(requested: number, totalStock: number): number {
  if (totalStock <= 0) return 0;
  if (requested <= 0) return 0;
  return Math.min(Math.floor(requested), totalStock, MAX_PER_LINE);
}

export type CartTotals = {
  subtotal: number;
  shippingLabel: string;
  total: number;
  itemCount: number;
};

export const SHIPPING_LABEL = "Se calcula en el checkout";

export function computeCartTotals(items: CartItem[]): CartTotals {
  const subtotal = items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0);
  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);
  return {
    subtotal,
    shippingLabel: SHIPPING_LABEL,
    total: subtotal,
    itemCount,
  };
}

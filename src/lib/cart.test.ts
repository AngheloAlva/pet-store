import { describe, expect, it } from "vitest";
import { clampItemQuantity, computeCartTotals, SHIPPING_LABEL } from "./cart";
import type { CartItem } from "@/stores/cart";

const line = (overrides: Partial<CartItem> = {}): CartItem => ({
  productId: "p1",
  variantId: "v1",
  name: "Prod",
  variantName: "Var",
  image: "",
  unitPrice: 1000,
  quantity: 1,
  slug: "prod",
  ...overrides,
});

describe("clampItemQuantity", () => {
  it("returns 0 when totalStock is 0", () => {
    expect(clampItemQuantity(5, 0)).toBe(0);
  });

  it("returns 0 when totalStock is negative", () => {
    expect(clampItemQuantity(5, -3)).toBe(0);
  });

  it("returns the requested amount when below both caps", () => {
    expect(clampItemQuantity(3, 10)).toBe(3);
  });

  it("caps at totalStock when requested exceeds stock", () => {
    expect(clampItemQuantity(10, 5)).toBe(5);
  });

  it("caps at 99 when stock is abundant", () => {
    expect(clampItemQuantity(500, 9999)).toBe(99);
  });

  it("caps at totalStock when stock is the tighter limit below 99", () => {
    expect(clampItemQuantity(50, 12)).toBe(12);
  });

  it("clamps negative requested to 0", () => {
    expect(clampItemQuantity(-5, 10)).toBe(0);
  });
});

describe("computeCartTotals", () => {
  it("returns zero totals for an empty cart with the shipping label", () => {
    expect(computeCartTotals([])).toEqual({
      subtotal: 0,
      shippingLabel: SHIPPING_LABEL,
      total: 0,
      itemCount: 0,
    });
  });

  it("sums a single line price*qty", () => {
    const totals = computeCartTotals([line({ unitPrice: 4990, quantity: 2 })]);
    expect(totals.subtotal).toBe(9980);
    expect(totals.total).toBe(9980);
    expect(totals.itemCount).toBe(2);
  });

  it("sums multiple lines and counts items", () => {
    const totals = computeCartTotals([
      line({ variantId: "v1", unitPrice: 1000, quantity: 2 }),
      line({ variantId: "v2", unitPrice: 3500, quantity: 3 }),
    ]);
    expect(totals.subtotal).toBe(2000 + 10500);
    expect(totals.total).toBe(totals.subtotal);
    expect(totals.itemCount).toBe(5);
  });

  it("uses the static shipping label", () => {
    expect(computeCartTotals([]).shippingLabel).toBe("Se calcula en el checkout");
  });
});

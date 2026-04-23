import { describe, expect, it } from "vitest";
import {
  calculateDiscountPercent,
  canAddToCart,
  clampQuantity,
  findVariantById,
} from "./pdp";
import { getProductBySlug } from "./catalog";

const rcProduct = () => getProductBySlug("royal-canin-medium-adult")!;

describe("findVariantById", () => {
  it("returns the matching variant", () => {
    const p = rcProduct();
    const v = findVariantById(p, "rc-ma-8");
    expect(v.sku).toBe("RC-MA-8KG");
  });

  it("throws when variant not found", () => {
    const p = rcProduct();
    expect(() => findVariantById(p, "nope")).toThrowError(/not found/i);
  });
});

describe("calculateDiscountPercent", () => {
  it("returns null when there is no compareAtPrice", () => {
    const p = rcProduct();
    const variant = findVariantById(p, "rc-ma-3");
    expect(calculateDiscountPercent(variant)).toBeNull();
  });

  it("returns a rounded integer percentage when compareAtPrice exists", () => {
    const p = rcProduct();
    // rc-ma-15: price 79990, compareAtPrice 89990 → (89990-79990)/89990 ≈ 11.11% → 11
    const variant = findVariantById(p, "rc-ma-15");
    expect(calculateDiscountPercent(variant)).toBe(11);
  });

  it("returns null when compareAtPrice is not strictly greater than price", () => {
    const fakeVariant = {
      id: "x",
      sku: "x",
      name: "x",
      quantity: { value: 1, unit: "kg" as const },
      price: { amount: 1000, currency: "CLP" as const },
      compareAtPrice: { amount: 1000, currency: "CLP" as const },
    };
    expect(calculateDiscountPercent(fakeVariant)).toBeNull();
  });
});

describe("clampQuantity", () => {
  it("clamps below 1 to 1", () => {
    expect(clampQuantity(0)).toBe(1);
    expect(clampQuantity(-5)).toBe(1);
  });

  it("clamps above 99 to 99", () => {
    expect(clampQuantity(100)).toBe(99);
    expect(clampQuantity(1000)).toBe(99);
  });

  it("floors decimals", () => {
    expect(clampQuantity(3.7)).toBe(3);
  });

  it("returns integer value within bounds unchanged", () => {
    expect(clampQuantity(1)).toBe(1);
    expect(clampQuantity(50)).toBe(50);
    expect(clampQuantity(99)).toBe(99);
  });
});

describe("canAddToCart", () => {
  it("returns true when variant has stock in at least one store", () => {
    expect(canAddToCart("rc-ma-3")).toBe(true);
  });

  it("returns true for variant OOS in some but not all stores", () => {
    expect(canAddToCart("rc-ma-15")).toBe(true);
  });
});

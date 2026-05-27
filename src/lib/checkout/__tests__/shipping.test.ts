/**
 * Task 3.3 RED — Shipping options helper test.
 */
import { describe, it, expect } from "vitest";

describe("shipping helpers", () => {
  it("getShippingOptions returns a flat list of options", async () => {
    const { getShippingOptions } = await import("@/lib/checkout/shipping");
    const options = getShippingOptions();
    expect(Array.isArray(options)).toBe(true);
    expect(options.length).toBeGreaterThan(0);
    expect(options[0]).toHaveProperty("id");
    expect(options[0]).toHaveProperty("label");
    expect(options[0]).toHaveProperty("cost");
  });

  it("getShippingCost returns correct fee for known option", async () => {
    const { getShippingOptions, getShippingCost } = await import("@/lib/checkout/shipping");
    const options = getShippingOptions();
    const firstOption = options[0];
    const cost = getShippingCost(firstOption.id);
    expect(cost).toBe(firstOption.cost);
  });

  it("getShippingCost returns null for unknown option", async () => {
    const { getShippingCost } = await import("@/lib/checkout/shipping");
    expect(getShippingCost("nonexistent-option")).toBeNull();
  });
});

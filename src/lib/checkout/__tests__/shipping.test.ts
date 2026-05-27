/**
 * Task 3.3 RED — Shipping options helper test.
 * DC-2a/2b: getOptionsForCommune free-shipping threshold assertions.
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

describe("getOptionsForCommune — DC-2a/2b: free-shipping threshold", () => {
  const coveredSettings = {
    coveredCommunes: ["Providencia", "Las Condes", "Santiago"],
    freeShippingThreshold: 20000,
  };

  it("DC-2a: order above threshold → propio cost is 0", async () => {
    const { getOptionsForCommune } = await import("@/lib/checkout/shipping");
    const options = await getOptionsForCommune(
      "Providencia",
      coveredSettings,
      25000,
      "RM",
    );
    const propioOption = options.find((o) => o.id === "propio");
    expect(propioOption).toBeDefined();
    expect(propioOption!.cost).toBe(0);
  });

  it("DC-2b: order below threshold → propio cost is greater than 0", async () => {
    const { getOptionsForCommune } = await import("@/lib/checkout/shipping");
    const options = await getOptionsForCommune(
      "Providencia",
      coveredSettings,
      15000,
      "RM",
    );
    const propioOption = options.find((o) => o.id === "propio");
    expect(propioOption).toBeDefined();
    expect(propioOption!.cost).toBeGreaterThan(0);
  });

  it("DC-2a (boundary): order exactly at threshold → propio cost is 0", async () => {
    const { getOptionsForCommune } = await import("@/lib/checkout/shipping");
    const options = await getOptionsForCommune(
      "Providencia",
      coveredSettings,
      20000,
      "RM",
    );
    const propioOption = options.find((o) => o.id === "propio");
    expect(propioOption).toBeDefined();
    expect(propioOption!.cost).toBe(0);
  });

  it("non-covered commune → no propio option", async () => {
    const { getOptionsForCommune } = await import("@/lib/checkout/shipping");
    const options = await getOptionsForCommune(
      "Temuco",
      coveredSettings,
      25000,
      "IX",
    );
    const propioOption = options.find((o) => o.id === "propio");
    expect(propioOption).toBeUndefined();
  });
});

/**
 * Task 1.3 RED — PropioProvider tests
 * quote returns {cost:0} above freeShippingThreshold; returns positive cost below threshold.
 */
import { describe, it, expect } from "vitest";

describe("PropioProvider", () => {
  it("returns cost:0 when orderTotal >= freeShippingThreshold", async () => {
    const { propio } = await import("./propio");

    const result = await propio.quote({
      items: [],
      commune: "Santiago",
      orderTotal: 25000,
      freeShippingThreshold: 20000,
    });

    expect(result).not.toBeNull();
    expect(result!.cost).toBe(0);
  });

  it("returns positive cost when orderTotal < freeShippingThreshold", async () => {
    const { propio } = await import("./propio");

    const result = await propio.quote({
      items: [],
      commune: "Santiago",
      orderTotal: 10000,
      freeShippingThreshold: 20000,
    });

    expect(result).not.toBeNull();
    expect(result!.cost).toBeGreaterThan(0);
  });

  it("returns cost:0 when orderTotal equals freeShippingThreshold", async () => {
    const { propio } = await import("./propio");

    const result = await propio.quote({
      items: [],
      commune: "Providencia",
      orderTotal: 20000,
      freeShippingThreshold: 20000,
    });

    expect(result).not.toBeNull();
    expect(result!.cost).toBe(0);
  });

  it("has id = propio", async () => {
    const { propio } = await import("./propio");
    expect(propio.id).toBe("propio");
  });

  it("does not have generateTrackingNumber", async () => {
    const { propio } = await import("./propio");
    expect(propio.generateTrackingNumber).toBeUndefined();
  });
});

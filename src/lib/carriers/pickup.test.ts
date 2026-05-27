/**
 * Task 1.7 RED — PickupProvider tests
 */
import { describe, it, expect } from "vitest";

describe("PickupProvider", () => {
  it("quote returns cost:0", async () => {
    const { pickup } = await import("./pickup");

    const result = await pickup.quote({
      items: [],
      commune: "Santiago",
      storeId: "store-1",
    });

    expect(result).not.toBeNull();
    expect(result!.cost).toBe(0);
  });

  it("does not have generateTrackingNumber", async () => {
    const { pickup } = await import("./pickup");
    expect(pickup.generateTrackingNumber).toBeUndefined();
  });

  it("has id = pickup", async () => {
    const { pickup } = await import("./pickup");
    expect(pickup.id).toBe("pickup");
  });
});

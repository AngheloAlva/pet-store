/**
 * Task 1.1 RED — CarrierRegistry tests
 */
import { describe, it, expect, beforeEach } from "vitest";
import type { Carrier } from "./registry";

describe("CarrierRegistry", () => {
  // We import fresh modules per test via dynamic import — avoids module-level state leak
  beforeEach(async () => {
    // Reset registry by re-importing with vi.resetModules not needed since we test the exported API
  });

  it("registers and retrieves a carrier by id", async () => {
    const { registerCarrier, getCarrier } = await import("./registry");

    const mockCarrier: Carrier = {
      id: "test_carrier_a",
      label: "Test Carrier A",
      quote: async () => ({ cost: 1000, estimatedDays: 3 }),
    };

    registerCarrier(mockCarrier);
    const retrieved = getCarrier("test_carrier_a");
    expect(retrieved).toBe(mockCarrier);
  });

  it("throws when retrieving an unregistered carrier", async () => {
    const { getCarrier } = await import("./registry");

    expect(() => getCarrier("nonexistent_carrier_xyz")).toThrow(
      /not registered/i,
    );
  });

  it("getAllCarriers returns all registered carriers", async () => {
    const { registerCarrier, getAllCarriers } = await import("./registry");

    const carrierB: Carrier = {
      id: "test_carrier_b",
      label: "Test Carrier B",
      quote: async () => ({ cost: 500, estimatedDays: 5 }),
    };

    registerCarrier(carrierB);
    const all = getAllCarriers();
    const ids = all.map((c) => c.id);
    expect(ids).toContain("test_carrier_b");
  });
});

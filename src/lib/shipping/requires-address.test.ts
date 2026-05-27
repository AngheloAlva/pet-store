/**
 * Task 2.3 RED — requiresAddress predicate tests
 */
import { describe, it, expect } from "vitest";

describe("requiresAddress", () => {
  it("returns true for despacho", async () => {
    const { requiresAddress } = await import("./requires-address");
    expect(requiresAddress("despacho")).toBe(true);
  });

  it("returns false for pickup", async () => {
    const { requiresAddress } = await import("./requires-address");
    expect(requiresAddress("pickup")).toBe(false);
  });

  it("returns true for courier", async () => {
    const { requiresAddress } = await import("./requires-address");
    expect(requiresAddress("courier")).toBe(true);
  });

  it("returns false when deliveryType is null/undefined", async () => {
    const { requiresAddress } = await import("./requires-address");
    expect(requiresAddress(null)).toBe(false);
    expect(requiresAddress(undefined)).toBe(false);
  });
});

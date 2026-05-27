/**
 * Task 3.1 RED — communes coverage helper test.
 */
import { describe, it, expect } from "vitest";

describe("isCovered", () => {
  it("returns true for Santiago", async () => {
    const { isCovered } = await import("@/lib/checkout/communes");
    expect(isCovered("Santiago")).toBe(true);
  });

  it("returns false for unknown commune", async () => {
    const { isCovered } = await import("@/lib/checkout/communes");
    expect(isCovered("Antártica Chilena")).toBe(false);
  });

  it("is case-insensitive", async () => {
    const { isCovered } = await import("@/lib/checkout/communes");
    expect(isCovered("SANTIAGO")).toBe(true);
    expect(isCovered("santiago")).toBe(true);
  });

  it("returns true for Providencia", async () => {
    const { isCovered } = await import("@/lib/checkout/communes");
    expect(isCovered("Providencia")).toBe(true);
  });
});

/**
 * T-03 [RED] → T-05 [GREEN] — computeIva unit tests
 * Spec: F-3, INV-2
 * net + taxAmount must equal total exactly (no rounding drift).
 */
import { describe, it, expect } from "vitest";
import { computeIva } from "@/lib/dte/iva";

describe("computeIva", () => {
  it("known value: computeIva(11900) → net=10000, taxAmount=1900", () => {
    const result = computeIva(11900);
    expect(result.net).toBe(10000);
    expect(result.taxAmount).toBe(1900);
  });

  it("invariant: net + taxAmount === total for 11900", () => {
    const { net, taxAmount } = computeIva(11900);
    expect(net + taxAmount).toBe(11900);
  });

  it("invariant: net + taxAmount === total for non-round 9999", () => {
    const { net, taxAmount } = computeIva(9999);
    expect(net + taxAmount).toBe(9999);
  });

  it("invariant holds for arbitrary CLP totals", () => {
    const totals = [1000, 2500, 7350, 19900, 50000, 99999, 1];
    for (const total of totals) {
      const { net, taxAmount } = computeIva(total);
      expect(net + taxAmount).toBe(total);
    }
  });

  it("deterministic: multiple calls with same input return same result", () => {
    const a = computeIva(11900);
    const b = computeIva(11900);
    expect(a).toEqual(b);
  });
});

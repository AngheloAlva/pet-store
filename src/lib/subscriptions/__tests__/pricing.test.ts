/**
 * T-06 [DOMAIN] pricing.ts — applySubscriptionDiscount
 * SP-S7, SP-7
 */
import { describe, it, expect } from "vitest";
import { applySubscriptionDiscount } from "../pricing";

describe("applySubscriptionDiscount (T-06, SP-S7)", () => {
  it("0% discount returns the original price", () => {
    expect(applySubscriptionDiscount(10000, 0)).toBe(10000);
  });

  it("5% discount on 10000 returns 9500", () => {
    expect(applySubscriptionDiscount(10000, 5)).toBe(9500);
  });

  it("10% discount on 10000 returns 9000", () => {
    expect(applySubscriptionDiscount(10000, 10)).toBe(9000);
  });

  it("10% discount on 15000 returns 13500", () => {
    expect(applySubscriptionDiscount(15000, 10)).toBe(13500);
  });

  it("5% discount on 15000 returns 14250", () => {
    expect(applySubscriptionDiscount(15000, 5)).toBe(14250);
  });

  it("floor rounding: 10% on 9999 = floor(9999*0.9) = floor(8999.1) = 8999", () => {
    expect(applySubscriptionDiscount(9999, 10)).toBe(8999);
  });

  it("0% on 0 returns 0", () => {
    expect(applySubscriptionDiscount(0, 0)).toBe(0);
  });
});

/**
 * T-07 [DOMAIN] frequency.ts — isValidFrequency, computeNextChargeAt
 * CF-4, SM-6
 */
import { describe, it, expect } from "vitest";
import { isValidFrequency, computeNextChargeAt } from "../frequency";

describe("isValidFrequency (T-07)", () => {
  it("returns false when frequency is not in the allowed list", () => {
    expect(isValidFrequency([30, 60], 45)).toBe(false);
  });

  it("returns true when frequency is in the allowed list", () => {
    expect(isValidFrequency([30, 60], 60)).toBe(true);
  });

  it("returns true for 30 in [30]", () => {
    expect(isValidFrequency([30], 30)).toBe(true);
  });

  it("returns false for empty list", () => {
    expect(isValidFrequency([], 30)).toBe(false);
  });

  it("returns false when value is 0", () => {
    expect(isValidFrequency([15, 30, 45, 60], 0)).toBe(false);
  });
});

describe("computeNextChargeAt (T-07)", () => {
  it("adds frequencyDays days to the given date", () => {
    const base = new Date("2026-01-01T00:00:00Z");
    const result = computeNextChargeAt(base, 30);
    const expected = new Date("2026-01-31T00:00:00Z");
    expect(result.getTime()).toBe(expected.getTime());
  });

  it("works for 60-day frequency", () => {
    const base = new Date("2026-01-01T00:00:00Z");
    const result = computeNextChargeAt(base, 60);
    const expected = new Date("2026-03-02T00:00:00Z");
    expect(result.getTime()).toBe(expected.getTime());
  });
});

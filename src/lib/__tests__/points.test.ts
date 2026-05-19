import { describe, it, expect } from "vitest";
import {
  computeBalance,
  filterPetsBornInMonth,
  isFirstPurchase,
} from "@/lib/points";

describe("computeBalance", () => {
  it("returns 0 for empty array", () => {
    expect(computeBalance([])).toBe(0);
  });

  it("sums sequential deltas correctly: +500 +350 -200 = 650", () => {
    const txs = [
      { deltaPoints: 500 },
      { deltaPoints: 350 },
      { deltaPoints: -200 },
    ];
    expect(computeBalance(txs)).toBe(650);
  });

  it("handles single positive delta", () => {
    expect(computeBalance([{ deltaPoints: 100 }])).toBe(100);
  });

  it("handles all negative deltas", () => {
    expect(computeBalance([{ deltaPoints: -50 }, { deltaPoints: -25 }])).toBe(-75);
  });
});

describe("filterPetsBornInMonth", () => {
  const pets = [
    { id: "p1", birthDate: "2021-03-12", name: "Tobi" },
    { id: "p2", birthDate: "2020-06-01", name: "Luna" },
    { id: "p3", birthDate: null, name: "Unknown" },
    { id: "p4", birthDate: "2019-03-25", name: "Max" },
  ];

  it("returns pets born in March (month=3)", () => {
    const result = filterPetsBornInMonth(pets, 3);
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.id)).toContain("p1");
    expect(result.map((p) => p.id)).toContain("p4");
  });

  it("returns pets born in June (month=6)", () => {
    const result = filterPetsBornInMonth(pets, 6);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("p2");
  });

  it("excludes pets with null birthDate", () => {
    const result = filterPetsBornInMonth(pets, 3);
    expect(result.map((p) => p.id)).not.toContain("p3");
  });

  it("returns empty array when no pets match", () => {
    const result = filterPetsBornInMonth(pets, 12);
    expect(result).toHaveLength(0);
  });
});

describe("isFirstPurchase", () => {
  it("returns true when prior transactions are empty", () => {
    expect(isFirstPurchase([])).toBe(true);
  });

  it("returns false when a purchase transaction exists", () => {
    const prior = [{ kind: "purchase" }];
    expect(isFirstPurchase(prior)).toBe(false);
  });

  it("returns false when a first_purchase_bonus transaction exists", () => {
    const prior = [{ kind: "first_purchase_bonus" }];
    expect(isFirstPurchase(prior)).toBe(false);
  });

  it("returns true when only non-purchase transactions exist", () => {
    const prior = [{ kind: "manual_adjustment" }, { kind: "pet_birthday_bonus" }];
    expect(isFirstPurchase(prior)).toBe(true);
  });
});

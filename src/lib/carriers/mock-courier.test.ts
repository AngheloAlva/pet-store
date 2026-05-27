/**
 * Task 1.5 RED — Mock couriers tests
 * mock_chilexpress and mock_starken as distinct entries.
 */
import { describe, it, expect } from "vitest";

describe("mockChilexpress", () => {
  it("has id = mock_chilexpress", async () => {
    const { mockChilexpress } = await import("./mock-courier");
    expect(mockChilexpress.id).toBe("mock_chilexpress");
  });

  it("quote returns cost from RATE_TABLE for RM", async () => {
    const { mockChilexpress } = await import("./mock-courier");
    const result = await mockChilexpress.quote({
      items: [{ variantId: "v1", productId: "p1", sku: "S1", name: "Item", quantity: 2, unitPrice: 1000, lineTotal: 2000 }],
      commune: "Santiago",
      regionKey: "RM",
    } as Parameters<typeof mockChilexpress.quote>[0]);

    expect(result).not.toBeNull();
    expect(result!.cost).toBeGreaterThan(0);
  });

  it("generateTrackingNumber matches /^MOCK-[A-Z0-9]{8}$/", async () => {
    const { mockChilexpress } = await import("./mock-courier");
    const tn = mockChilexpress.generateTrackingNumber!();
    expect(tn).toMatch(/^MOCK-[A-Z0-9]{8}$/);
  });
});

describe("mockStarken", () => {
  it("has id = mock_starken", async () => {
    const { mockStarken } = await import("./mock-courier");
    expect(mockStarken.id).toBe("mock_starken");
  });

  it("quote returns cost distinct from chilexpress for same region", async () => {
    const { mockChilexpress, mockStarken } = await import("./mock-courier");
    const chileArgs = {
      items: [{ variantId: "v1", productId: "p1", sku: "S1", name: "Item", quantity: 1, unitPrice: 1000, lineTotal: 1000 }],
      commune: "Temuco",
      regionKey: "IX",
    } as Parameters<typeof mockChilexpress.quote>[0];

    const starkenArgs = { ...chileArgs };

    const chileResult = await mockChilexpress.quote(chileArgs);
    const starkenResult = await mockStarken.quote(starkenArgs);

    // Both return a valid cost
    expect(chileResult!.cost).toBeGreaterThan(0);
    expect(starkenResult!.cost).toBeGreaterThan(0);
    // Distinct rates
    expect(chileResult!.cost).not.toBe(starkenResult!.cost);
  });

  it("generateTrackingNumber matches /^MOCK-[A-Z0-9]{8}$/", async () => {
    const { mockStarken } = await import("./mock-courier");
    const tn = mockStarken.generateTrackingNumber!();
    expect(tn).toMatch(/^MOCK-[A-Z0-9]{8}$/);
  });
});

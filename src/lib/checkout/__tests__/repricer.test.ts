/**
 * Task 3.5 RED — repricer test.
 * Server-priced lines override client prices.
 * Out-of-range or inactive variant returns price_changed error.
 */
import { describe, it, expect, vi } from "vitest";

describe("repricer", () => {
  it("server-priced lines override client prices", async () => {
    const { reprice } = await import("@/lib/checkout/repricer");

    const cartLines = [
      { variantId: "var-1", quantity: 2, clientUnitPrice: 999 }, // client tampered
    ];

    const mockTx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                variantId: "var-1",
                productId: "prod-1",
                sku: "SKU-001",
                name: "Premium Dog Food",
                unitPrice: 5000, // server price
                isActive: true,
              },
            ]),
          }),
        }),
      }),
    };

    const result = await reprice(cartLines, mockTx as never);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.lines[0].unitPrice).toBe(5000); // server overrides 999
      expect(result.lines[0].lineTotal).toBe(10000); // 5000 * 2
    }
  });

  it("returns price_changed error for inactive variant", async () => {
    const { reprice } = await import("@/lib/checkout/repricer");

    const cartLines = [
      { variantId: "var-inactive", quantity: 1, clientUnitPrice: 3000 },
    ];

    const mockTx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]), // no result = not found / inactive
          }),
        }),
      }),
    };

    const result = await reprice(cartLines, mockTx as never);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("price_changed");
    }
  });
});

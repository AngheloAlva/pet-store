/**
 * Task 3.7 RED — Stock validator test.
 * Sufficient stock → ok, insufficient → OUT_OF_STOCK with product name.
 */
import { describe, it, expect, vi } from "vitest";

describe("stock validator", () => {
  it("returns ok when all items have sufficient stock", async () => {
    const { validateStock } = await import("@/lib/checkout/stock-validator");

    const lines = [
      { variantId: "var-1", productName: "Dog Food", quantity: 2 },
    ];

    // Mock tx: returns a stock row with status 'in_stock'
    const mockTx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { variantId: "var-1", status: "in_stock" },
          ]),
        }),
      }),
    };

    const result = await validateStock(lines, mockTx as never);
    expect(result.ok).toBe(true);
  });

  it("returns OUT_OF_STOCK with product name for insufficient stock", async () => {
    const { validateStock } = await import("@/lib/checkout/stock-validator");

    const lines = [
      { variantId: "var-1", productName: "Dog Food", quantity: 2 },
    ];

    // Mock tx: returns out_of_stock
    const mockTx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { variantId: "var-1", status: "out_of_stock" },
          ]),
        }),
      }),
    };

    const result = await validateStock(lines, mockTx as never);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("OUT_OF_STOCK");
      expect(result.productName).toBe("Dog Food");
    }
  });

  it("returns OUT_OF_STOCK when stock row is missing (variant not in stock_levels)", async () => {
    const { validateStock } = await import("@/lib/checkout/stock-validator");

    const lines = [
      { variantId: "var-missing", productName: "Cat Food", quantity: 1 },
    ];

    const mockTx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]), // no rows
        }),
      }),
    };

    const result = await validateStock(lines, mockTx as never);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("OUT_OF_STOCK");
      expect(result.productName).toBe("Cat Food");
    }
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getProductStockMatrix,
  isVariantGloballyOutOfStock,
} from "./stock";
import { stores } from "@/data";
import * as stockData from "@/data/stock";

describe("getProductStockMatrix", () => {
  it("returns one row per store", () => {
    const rows = getProductStockMatrix("rc-ma-3");
    expect(rows).toHaveLength(stores.length);
    for (const row of rows) {
      expect(stores.find((s) => s.id === row.store.id)).toBeDefined();
    }
  });

  it("defaults to in_stock when no exception exists", () => {
    const rows = getProductStockMatrix("rc-ma-3");
    for (const row of rows) {
      expect(row.status).toBe("in_stock");
    }
  });

  it("reflects exception status for a known variant/store", () => {
    // rc-ma-15 is out_of_stock in maipu per src/data/stock.ts
    const rows = getProductStockMatrix("rc-ma-15");
    const maipu = rows.find((r) => r.store.id === "maipu");
    expect(maipu?.status).toBe("out_of_stock");
    const nunoa = rows.find((r) => r.store.id === "nunoa");
    expect(nunoa?.status).toBe("low_stock");
  });
});

describe("isVariantGloballyOutOfStock", () => {
  it("returns false when at least one store is in_stock", () => {
    expect(isVariantGloballyOutOfStock("rc-ma-15")).toBe(false);
  });

  it("returns false when all stores are in_stock", () => {
    expect(isVariantGloballyOutOfStock("rc-ma-3")).toBe(false);
  });

  describe("true branch (synthetic: every store out_of_stock)", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("returns true when every store reports out_of_stock", () => {
      vi.spyOn(stockData, "getStockLevel").mockImplementation(
        (variantId, storeId) => ({
          variantId,
          storeId,
          status: "out_of_stock",
        }),
      );
      expect(isVariantGloballyOutOfStock("synthetic-oos")).toBe(true);
    });

    it("returns false when at least one store is not out_of_stock", () => {
      vi.spyOn(stockData, "getStockLevel").mockImplementation(
        (variantId, storeId) => ({
          variantId,
          storeId,
          status: storeId === stores[0].id ? "in_stock" : "out_of_stock",
        }),
      );
      expect(isVariantGloballyOutOfStock("synthetic-mixed")).toBe(false);
    });
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getProductStockMatrix,
  getProductStockMatrixAsync,
  getVariantTotalStock,
  getVariantTotalStockAsync,
  isVariantGloballyOutOfStock,
  isVariantGloballyOutOfStockAsync,
} from "./stock";
import { stores } from "@/data";
import * as stockData from "@/data/stock";

describe("getProductStockMatrix (sync)", () => {
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
    const rows = getProductStockMatrix("rc-ma-15");
    const maipu = rows.find((r) => r.store.id === "maipu");
    expect(maipu?.status).toBe("out_of_stock");
    const nunoa = rows.find((r) => r.store.id === "nunoa");
    expect(nunoa?.status).toBe("low_stock");
  });
});

describe("getProductStockMatrixAsync", () => {
  it("resolves to the same result as the sync version", async () => {
    const sync = getProductStockMatrix("rc-ma-15");
    const async_ = await getProductStockMatrixAsync("rc-ma-15");
    expect(async_).toEqual(sync);
  });

  it("returns one row per store", async () => {
    const rows = await getProductStockMatrixAsync("rc-ma-3");
    expect(rows).toHaveLength(stores.length);
  });
});

describe("isVariantGloballyOutOfStock (sync)", () => {
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

describe("isVariantGloballyOutOfStockAsync", () => {
  it("returns false for a variant available in some stores", async () => {
    expect(await isVariantGloballyOutOfStockAsync("rc-ma-15")).toBe(false);
  });

  it("returns false when all stores are in_stock", async () => {
    expect(await isVariantGloballyOutOfStockAsync("rc-ma-3")).toBe(false);
  });
});

describe("getVariantTotalStock (sync)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns stores.length * 99 when every store is in_stock", () => {
    expect(getVariantTotalStock("rc-ma-3")).toBe(stores.length * 99);
  });

  it("sums synthetic units for mixed statuses (in_stock=99, low_stock=3, out_of_stock=0)", () => {
    // rc-ma-15: maipu=out_of_stock (0), nunoa=low_stock (3), other two in_stock (99 each)
    const expected = 99 + 3 + 0 + 99;
    expect(getVariantTotalStock("rc-ma-15")).toBe(expected);
  });

  it("returns 0 when every store is out_of_stock", () => {
    vi.spyOn(stockData, "getStockLevel").mockImplementation(
      (variantId, storeId) => ({ variantId, storeId, status: "out_of_stock" }),
    );
    expect(getVariantTotalStock("synthetic-oos")).toBe(0);
  });
});

describe("getVariantTotalStockAsync", () => {
  it("returns the same total as the sync version", async () => {
    const sync = getVariantTotalStock("rc-ma-15");
    const async_ = await getVariantTotalStockAsync("rc-ma-15");
    expect(async_).toBe(sync);
  });

  it("returns stores.length * 99 for fully in_stock variant", async () => {
    expect(await getVariantTotalStockAsync("rc-ma-3")).toBe(stores.length * 99);
  });
});

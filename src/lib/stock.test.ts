import { afterEach, describe, expect, it, vi } from "vitest";
import { stores, getStockLevel } from "@/test/fixtures";
import type { Store, StockLevel } from "@/types";

// Build stock level rows from fixture helper (mirrors seed logic).
function makeStockLevels(variantId: string): (StockLevel & { store: Store })[] {
  return stores.map((store) => ({
    ...getStockLevel(variantId, store.id),
    store,
  }));
}

// Build a full cache: all variants x all stores used in tests.
const fixtureStockLevels = [
  ...makeStockLevels("rc-ma-3"),
  ...makeStockLevels("rc-ma-15"),
];

// Mock @/db/loaders — getCachedStockLevels returns fixture data by default.
vi.mock("@/db/loaders", () => {
  const fixtureStockLevelsRef: (StockLevel & { store: Store })[] = [];
  return {
    loadAllStockLevels: vi.fn(async () => fixtureStockLevelsRef),
    loadAllProducts: vi.fn(async () => []),
    loadAllBrands: vi.fn(async () => []),
    loadAllCategories: vi.fn(async () => []),
    loadAllStores: vi.fn(async () => []),
    getCachedStockLevels: vi.fn(() => fixtureStockLevelsRef),
    getCachedProducts: vi.fn(() => []),
    getCachedBrands: vi.fn(() => []),
    getCachedCategories: vi.fn(() => []),
    getCachedStores: vi.fn(() => []),
    initSyncCache: vi.fn(async () => {}),
  };
});

import * as loadersMock from "@/db/loaders";
import {
  getProductStockMatrix,
  getProductStockMatrixAsync,
  getVariantTotalStock,
  getVariantTotalStockAsync,
  isVariantGloballyOutOfStock,
  isVariantGloballyOutOfStockAsync,
} from "./stock";

// Helper: set what getCachedStockLevels and loadAllStockLevels return.
function setStockLevels(levels: (StockLevel & { store: Store })[]) {
  vi.mocked(loadersMock.getCachedStockLevels).mockReturnValue(levels);
  vi.mocked(loadersMock.loadAllStockLevels).mockResolvedValue(levels);
}

afterEach(() => {
  vi.restoreAllMocks();
  setStockLevels(fixtureStockLevels);
});

// Set fixture data before each test group.
setStockLevels(fixtureStockLevels);

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
      setStockLevels(fixtureStockLevels);
    });

    it("returns true when every store reports out_of_stock", () => {
      setStockLevels(
        stores.map((store) => ({
          variantId: "synthetic-oos",
          storeId: store.id,
          status: "out_of_stock" as const,
          store,
        })),
      );
      expect(isVariantGloballyOutOfStock("synthetic-oos")).toBe(true);
    });

    it("returns false when at least one store is not out_of_stock", () => {
      setStockLevels(
        stores.map((store, i) => ({
          variantId: "synthetic-mixed",
          storeId: store.id,
          status: (i === 0 ? "in_stock" : "out_of_stock") as "in_stock" | "out_of_stock",
          store,
        })),
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
    setStockLevels(fixtureStockLevels);
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
    setStockLevels(
      stores.map((store) => ({
        variantId: "synthetic-oos",
        storeId: store.id,
        status: "out_of_stock" as const,
        store,
      })),
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

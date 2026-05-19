import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// ---------------------------------------------------------------------------
// Global mocks — prevent real DB/network access during tests.
// ---------------------------------------------------------------------------

// Mock @/db so the Neon connection is never initialised.
vi.mock("@/db", () => ({
  db: {
    query: {
      products: { findMany: vi.fn(async () => []), findFirst: vi.fn(async () => undefined) },
      brands: { findMany: vi.fn(async () => []), findFirst: vi.fn(async () => undefined) },
      categories: { findMany: vi.fn(async () => []), findFirst: vi.fn(async () => undefined) },
      stores: { findMany: vi.fn(async () => []), findFirst: vi.fn(async () => undefined) },
      stockLevels: { findMany: vi.fn(async () => []), findFirst: vi.fn(async () => undefined) },
      productVariants: { findMany: vi.fn(async () => []), findFirst: vi.fn(async () => undefined) },
      productImages: { findMany: vi.fn(async () => []), findFirst: vi.fn(async () => undefined) },
      users: { findMany: vi.fn(async () => []), findFirst: vi.fn(async () => undefined) },
    },
    insert: vi.fn(() => ({ values: vi.fn(async () => ({})) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => ({})) })) })),
    delete: vi.fn(() => ({ where: vi.fn(async () => ({})) })),
    transaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb({
      insert: vi.fn(() => ({ values: vi.fn(async () => ({})) })),
      update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => ({})) })) })),
      delete: vi.fn(() => ({ where: vi.fn(async () => ({})) })),
    })),
  },
}));

// Mock @/db/loaders with fixture data so all sync lib helpers work without a DB.
// Tests that need specific data can override individual functions via vi.mocked().
vi.mock("@/db/loaders", async () => {
  const { products, brands, categories, stores, getStockLevel } = await import(
    "@/test/fixtures/index"
  );
  const stockLevels = stores.flatMap((store) =>
    products.flatMap((product) =>
      product.variants.map((variant) => ({
        ...getStockLevel(variant.id, store.id),
        store,
      })),
    ),
  );
  return {
    loadAllProducts: vi.fn(async () => products),
    loadAllBrands: vi.fn(async () => brands),
    loadAllCategories: vi.fn(async () => categories),
    loadAllStores: vi.fn(async () => stores),
    loadAllStockLevels: vi.fn(async () => stockLevels),
    getCachedProducts: vi.fn(() => products),
    getCachedBrands: vi.fn(() => brands),
    getCachedCategories: vi.fn(() => categories),
    getCachedStores: vi.fn(() => stores),
    getCachedStockLevels: vi.fn(() => stockLevels),
    initSyncCache: vi.fn(async () => {}),
  };
});

// Mock @/db/sync-cache with fixture data.
// The getCached* getters were moved here from @/db/loaders (slice-9 refactor).
// This mock must mirror the @/db/loaders mock so lib helpers that import from
// @/db/sync-cache directly also receive correct fixture data.
vi.mock("@/db/sync-cache", async () => {
  const { products, brands, categories, stores, getStockLevel } = await import(
    "@/test/fixtures/index"
  );
  const stockLevels = stores.flatMap((store) =>
    products.flatMap((product) =>
      product.variants.map((variant) => ({
        ...getStockLevel(variant.id, store.id),
        store,
      })),
    ),
  );
  return {
    getCachedProducts: vi.fn(() => products),
    getCachedBrands: vi.fn(() => brands),
    getCachedCategories: vi.fn(() => categories),
    getCachedStores: vi.fn(() => stores),
    getCachedStockLevels: vi.fn(() => stockLevels),
    setSyncCache: vi.fn(),
    isInitialized: vi.fn(() => true),
  };
});

// ---------------------------------------------------------------------------
// jsdom polyfills
// ---------------------------------------------------------------------------

if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function () {};
}

if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

afterEach(() => {
  cleanup();
});

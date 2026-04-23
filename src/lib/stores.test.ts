import { describe, expect, it, vi } from "vitest";
import { stores } from "@/test/fixtures";

// Mock @/db/loaders so loaders and sync cache getters return fixture data without a DB.
vi.mock("@/db/loaders", () => ({
  loadAllStores: vi.fn(async () => stores),
  loadAllProducts: vi.fn(async () => []),
  loadAllBrands: vi.fn(async () => []),
  loadAllCategories: vi.fn(async () => []),
  loadAllStockLevels: vi.fn(async () => []),
  getCachedStores: vi.fn(() => stores),
  getCachedProducts: vi.fn(() => []),
  getCachedBrands: vi.fn(() => []),
  getCachedCategories: vi.fn(() => []),
  getCachedStockLevels: vi.fn(() => []),
  initSyncCache: vi.fn(async () => {}),
}));

import {
  DEFAULT_MAP_VIEWPORT,
  getAllStores,
  getStoreBySlug,
  getStoreBySlugAsync,
  getStoresByService,
  getStoresCommuneSummary,
  STORE_SERVICE_META,
} from "./stores";

describe("getAllStores", () => {
  it("returns a Promise resolving to all 4 stores", async () => {
    const result = await getAllStores();
    expect(result).toHaveLength(stores.length);
    expect(result.map((s) => s.slug)).toEqual(stores.map((s) => s.slug));
  });

  it("each store has coordinates with lat and lng", async () => {
    const result = await getAllStores();
    for (const s of result) {
      expect(typeof s.coordinates.lat).toBe("number");
      expect(typeof s.coordinates.lng).toBe("number");
    }
  });
});

describe("getStoreBySlugAsync", () => {
  it("returns the store for an existing slug", async () => {
    const s = await getStoreBySlugAsync("maipu");
    expect(s?.slug).toBe("maipu");
    expect(s?.commune).toBe("Maipú");
  });

  it("returns undefined for a missing slug", async () => {
    expect(await getStoreBySlugAsync("no-existe")).toBeUndefined();
  });

  it("returns undefined for null or undefined", async () => {
    expect(await getStoreBySlugAsync(null)).toBeUndefined();
    expect(await getStoreBySlugAsync(undefined)).toBeUndefined();
    expect(await getStoreBySlugAsync("")).toBeUndefined();
  });
});

describe("getStoreBySlug (sync)", () => {
  it("returns the store for an existing slug", () => {
    const s = getStoreBySlug("maipu");
    expect(s?.slug).toBe("maipu");
    expect(s?.commune).toBe("Maipú");
  });

  it("returns undefined for a missing slug", () => {
    expect(getStoreBySlug("no-existe")).toBeUndefined();
  });

  it("returns undefined for null or undefined", () => {
    expect(getStoreBySlug(null)).toBeUndefined();
    expect(getStoreBySlug(undefined)).toBeUndefined();
    expect(getStoreBySlug("")).toBeUndefined();
  });
});

describe("DEFAULT_MAP_VIEWPORT", () => {
  it("centers over Santiago at zoom 10", () => {
    expect(DEFAULT_MAP_VIEWPORT.center).toEqual([-70.65, -33.45]);
    expect(DEFAULT_MAP_VIEWPORT.zoom).toBe(10);
  });
});

describe("getStoresCommuneSummary", () => {
  it("joins all commune names with commas", () => {
    const summary = getStoresCommuneSummary();
    for (const store of stores) {
      expect(summary).toContain(store.commune);
    }
    expect(summary).toContain(",");
  });
});

describe("getStoresByService", () => {
  it("returns only stores that offer the pharmacy service", () => {
    const result = getStoresByService("pharmacy");
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("las-condes");
  });

  it("returns all stores that offer the shop service", () => {
    const result = getStoresByService("shop");
    expect(result.length).toBe(stores.length);
  });

  it("preserves seed order", () => {
    const result = getStoresByService("shop");
    expect(result.map((s) => s.slug)).toEqual(stores.map((s) => s.slug));
  });
});

describe("STORE_SERVICE_META", () => {
  it("maps every service to a Spanish label and a component icon", () => {
    const keys = ["shop", "vet", "grooming", "pharmacy"] as const;
    for (const k of keys) {
      expect(STORE_SERVICE_META[k].label).toMatch(/^[A-ZÁÉÍÓÚÜÑ]/);
      expect(typeof STORE_SERVICE_META[k].Icon).toBe("object");
    }
    expect(STORE_SERVICE_META.shop.label).toBe("Tienda");
    expect(STORE_SERVICE_META.vet.label).toBe("Veterinaria");
    expect(STORE_SERVICE_META.grooming.label).toBe("Peluquería");
    expect(STORE_SERVICE_META.pharmacy.label).toBe("Farmacia");
  });
});

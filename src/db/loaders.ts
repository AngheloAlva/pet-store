/**
 * loaders.ts — Drizzle async loaders + sync-backing module cache.
 *
 * ASYNC LOADERS: wrapped in react `cache()` for per-request dedup in RSC.
 * SYNC CACHE: module-level maps populated by `initSyncCache()`, called once
 *   from the root layout RSC before any client code runs.
 *   The actual cache state lives in src/db/sync-cache.ts (no DB imports) so
 *   that lib/stock.ts can read it without pulling the DB driver into client bundles.
 */
import { cache } from "react";
import { db, dbReady } from "@/db";
import {
  mapBrand,
  mapCategory,
  mapProduct,
  mapStore,
  mapStockLevel,
} from "@/db/mappers";
import type { Brand, Category, Product, Store, StockLevel } from "@/types";
import {
  setSyncCache,
  isInitialized,
  getCachedProducts,
  getCachedBrands,
  getCachedCategories,
  getCachedStores,
  getCachedStockLevels,
} from "@/db/sync-cache";

// Re-export sync getters so existing imports from "@/db/loaders" still work.
export {
  getCachedProducts,
  getCachedBrands,
  getCachedCategories,
  getCachedStores,
  getCachedStockLevels,
};

// ---------------------------------------------------------------------------
// Async loaders (react cache — deduplicated per request)
// ---------------------------------------------------------------------------

export const loadAllBrands = cache(async (): Promise<Brand[]> => {
  await dbReady;
  const rows = await db.query.brands.findMany();
  return rows.map(mapBrand);
});

export const loadAllCategories = cache(async (): Promise<Category[]> => {
  await dbReady;
  const rows = await db.query.categories.findMany();
  return rows.map(mapCategory);
});

export const loadAllProducts = cache(async (): Promise<Product[]> => {
  await dbReady;
  const rows = await db.query.products.findMany({
    with: {
      variants: true,
      images: true,
      productCategories: true,
    },
  });
  return rows.map(mapProduct);
});

export const loadAllStores = cache(async (): Promise<Store[]> => {
  await dbReady;
  const rows = await db.query.stores.findMany();
  return rows.map(mapStore);
});

export const loadAllStockLevels = cache(async (): Promise<(StockLevel & { store: Store })[]> => {
  await dbReady;
  const rows = await db.query.stockLevels.findMany({
    with: { store: true },
  });
  return rows.map(mapStockLevel);
});

// ---------------------------------------------------------------------------
// Sync cache population
// ---------------------------------------------------------------------------

/**
 * Populate the sync-backing maps.
 * Must be awaited from an RSC (e.g. root layout) before any sync helper runs.
 */
export async function initSyncCache(): Promise<void> {
  if (isInitialized()) return;
  // dbReady is awaited inside each loader — no need to await it separately here.
  const [products, brands, categories, stores, stockLevels] = await Promise.all([
    loadAllProducts(),
    loadAllBrands(),
    loadAllCategories(),
    loadAllStores(),
    loadAllStockLevels(),
  ]);
  setSyncCache({ products, brands, categories, stores, stockLevels });
}

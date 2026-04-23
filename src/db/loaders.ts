/**
 * loaders.ts — Drizzle async loaders + sync-backing module cache.
 *
 * ASYNC LOADERS: wrapped in react `cache()` for per-request dedup in RSC.
 * SYNC CACHE: module-level maps populated by `initSyncCache()`, called once
 *   from the root layout RSC before any client code runs.
 */
import { cache } from "react";
import { db } from "@/db";
import {
  mapBrand,
  mapCategory,
  mapProduct,
  mapStore,
  mapStockLevel,
} from "@/db/mappers";
import type { Brand, Category, Product, Store, StockLevel } from "@/types";

// ---------------------------------------------------------------------------
// Async loaders (react cache — deduplicated per request)
// ---------------------------------------------------------------------------

export const loadAllBrands = cache(async (): Promise<Brand[]> => {
  const rows = await db.query.brands.findMany();
  return rows.map(mapBrand);
});

export const loadAllCategories = cache(async (): Promise<Category[]> => {
  const rows = await db.query.categories.findMany();
  return rows.map(mapCategory);
});

export const loadAllProducts = cache(async (): Promise<Product[]> => {
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
  const rows = await db.query.stores.findMany();
  return rows.map(mapStore);
});

export const loadAllStockLevels = cache(async (): Promise<(StockLevel & { store: Store })[]> => {
  const rows = await db.query.stockLevels.findMany({
    with: { store: true },
  });
  return rows.map(mapStockLevel);
});

// ---------------------------------------------------------------------------
// Module-level sync cache (populated by initSyncCache)
// ---------------------------------------------------------------------------

let _products: Product[] = [];
let _brands: Brand[] = [];
let _categories: Category[] = [];
let _stores: Store[] = [];
let _stockLevels: (StockLevel & { store: Store })[] = [];

let _initialized = false;

/**
 * Populate the sync-backing maps.
 * Must be awaited from an RSC (e.g. root layout) before any sync helper runs.
 */
export async function initSyncCache(): Promise<void> {
  if (_initialized) return;
  const [products, brands, categories, stores, stockLevels] = await Promise.all([
    loadAllProducts(),
    loadAllBrands(),
    loadAllCategories(),
    loadAllStores(),
    loadAllStockLevels(),
  ]);
  _products = products;
  _brands = brands;
  _categories = categories;
  _stores = stores;
  _stockLevels = stockLevels;
  _initialized = true;
}

// ---------------------------------------------------------------------------
// Sync getters (used by sync lib helpers and Zustand cart store)
// ---------------------------------------------------------------------------

export function getCachedProducts(): Product[] {
  return _products;
}

export function getCachedBrands(): Brand[] {
  return _brands;
}

export function getCachedCategories(): Category[] {
  return _categories;
}

export function getCachedStores(): Store[] {
  return _stores;
}

export function getCachedStockLevels(): (StockLevel & { store: Store })[] {
  return _stockLevels;
}

/**
 * sync-cache.ts — Shared module-level sync cache for DB query results.
 *
 * Written by initSyncCache() in loaders.ts (server-side, once per isolate).
 * Read by lib/stock.ts sync helpers (called from both server RSC and client components).
 *
 * NO database imports — this file is safe for client bundles.
 */
import type { Brand, Category, Product, Store, StockLevel } from "@/types";

export type CachedStockLevel = StockLevel & { store: Store };

let _products: Product[] = [];
let _brands: Brand[] = [];
let _categories: Category[] = [];
let _stores: Store[] = [];
let _stockLevels: CachedStockLevel[] = [];
let _initialized = false;

export function setSyncCache(data: {
  products: Product[];
  brands: Brand[];
  categories: Category[];
  stores: Store[];
  stockLevels: CachedStockLevel[];
}): void {
  _products = data.products;
  _brands = data.brands;
  _categories = data.categories;
  _stores = data.stores;
  _stockLevels = data.stockLevels;
  _initialized = true;
}

export function isInitialized(): boolean {
  return _initialized;
}

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

export function getCachedStockLevels(): CachedStockLevel[] {
  return _stockLevels;
}

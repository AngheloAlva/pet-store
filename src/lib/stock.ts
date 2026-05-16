/**
 * stock.ts — sync stock helpers backed by the module-level sync cache.
 *
 * Sync helpers use getCachedStockLevels() / getCachedStores() from @/db/sync-cache
 * (pre-populated by initSyncCache in root layout RSC).
 *
 * This file is safe to import from client components: it has NO imports from
 * @/db or @/db/loaders, so PGlite never leaks into the client bundle.
 *
 * IMPORTANT: getVariantTotalStock / isVariantGloballyOutOfStock / getProductStockMatrix
 * remain synchronous because src/stores/cart.ts (Zustand) calls them sync.
 */
import type { StockStatus, Store } from "@/types";
import { getCachedStockLevels, getCachedStores } from "@/db/sync-cache";

export type StockRow = {
  store: Store;
  status: StockStatus;
};

export const STATUS_TO_UNITS: Record<StockStatus, number> = {
  in_stock: 99,
  low_stock: 3,
  out_of_stock: 0,
};

// ---------------------------------------------------------------------------
// Sync helpers (backed by sync module-level cache — populated by initSyncCache)
// ---------------------------------------------------------------------------

export function getProductStockMatrix(variantId: string): StockRow[] {
  const levels = getCachedStockLevels().filter((sl) => sl.variantId === variantId);
  if (levels.length > 0) {
    return levels.map((sl) => ({ store: sl.store, status: sl.status }));
  }
  // No stock records found — fall back to in_stock across all cached stores.
  // Preserves legacy behaviour: any unknown variantId is considered in_stock everywhere.
  return getCachedStores().map((store) => ({ store, status: "in_stock" as const }));
}

export function isVariantGloballyOutOfStock(variantId: string): boolean {
  const rows = getProductStockMatrix(variantId);
  if (rows.length === 0) return false;
  return rows.every((row) => row.status === "out_of_stock");
}

export function getVariantTotalStock(variantId: string): number {
  return getProductStockMatrix(variantId).reduce(
    (acc, row) => acc + STATUS_TO_UNITS[row.status],
    0,
  );
}

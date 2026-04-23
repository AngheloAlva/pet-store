/**
 * stock.ts — lib layer backed by Drizzle (DB is source of truth).
 *
 * Async helpers use loadAllStockLevels() from @/db/loaders.
 * Sync helpers use getCachedStockLevels() (pre-populated by initSyncCache in root layout).
 * Public signatures are unchanged — no call-site modifications needed.
 *
 * IMPORTANT: getVariantTotalStock / isVariantGloballyOutOfStock / getProductStockMatrix
 * remain synchronous because src/stores/cart.ts (Zustand) calls them sync.
 */
import type { StockStatus, Store } from "@/types";
import { loadAllStockLevels, loadAllStores, getCachedStockLevels, getCachedStores } from "@/db/loaders";

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
// Async helpers (final API signatures)
// ---------------------------------------------------------------------------

export async function getProductStockMatrixAsync(variantId: string): Promise<StockRow[]> {
  const stockLevels = await loadAllStockLevels();
  const levels = stockLevels.filter((sl) => sl.variantId === variantId);
  if (levels.length > 0) {
    return levels.map((sl) => ({ store: sl.store, status: sl.status }));
  }
  // Fall back to in_stock across all stores when no DB records exist for variantId.
  const allStores = await loadAllStores();
  return allStores.map((store) => ({ store, status: "in_stock" as const }));
}

export async function isVariantGloballyOutOfStockAsync(variantId: string): Promise<boolean> {
  const rows = await getProductStockMatrixAsync(variantId);
  if (rows.length === 0) return false;
  return rows.every((row) => row.status === "out_of_stock");
}

export async function getVariantTotalStockAsync(variantId: string): Promise<number> {
  const rows = await getProductStockMatrixAsync(variantId);
  return rows.reduce((acc, row) => acc + STATUS_TO_UNITS[row.status], 0);
}

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

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
import { loadAllStockLevels, getCachedStockLevels } from "@/db/loaders";

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
  return stockLevels
    .filter((sl) => sl.variantId === variantId)
    .map((sl) => ({ store: sl.store, status: sl.status }));
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
  return getCachedStockLevels()
    .filter((sl) => sl.variantId === variantId)
    .map((sl) => ({ store: sl.store, status: sl.status }));
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

/**
 * stock.ts — async lib layer (data still from src/data/* until Neon is provisioned).
 *
 * TODO(slice-8-follow-up): After running `pnpm db:seed`, replace the
 * Promise.resolve() wrappers below with actual Drizzle queries from `@/db`.
 */
import { stores } from "@/data";
import { getStockLevel } from "@/data/stock";
import type { StockStatus, Store } from "@/types";

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
  return Promise.resolve(getProductStockMatrix(variantId));
}

export async function isVariantGloballyOutOfStockAsync(variantId: string): Promise<boolean> {
  return Promise.resolve(isVariantGloballyOutOfStock(variantId));
}

export async function getVariantTotalStockAsync(variantId: string): Promise<number> {
  return Promise.resolve(getVariantTotalStock(variantId));
}

// ---------------------------------------------------------------------------
// Sync helpers (unchanged — kept for callers that are not async)
// ---------------------------------------------------------------------------

export function getProductStockMatrix(variantId: string): StockRow[] {
  return stores.map((store) => ({
    store,
    status: getStockLevel(variantId, store.id).status,
  }));
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

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

import { stores } from "@/data";
import { getStockLevel } from "@/data/stock";
import type { StockStatus, Store } from "@/types";

export type StockRow = {
  store: Store;
  status: StockStatus;
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

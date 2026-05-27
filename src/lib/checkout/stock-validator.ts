/**
 * Stock validator — F3.1
 * Performs live Drizzle query inside confirmOrder tx.
 * MUST NOT use sync-cache. Uses a store-agnostic check
 * (any store having the variant in stock is sufficient for delivery orders).
 */
import { eq } from "drizzle-orm";
import { stockLevels } from "@/db/schema";

export interface StockLine {
  variantId: string;
  productName: string;
  quantity: number;
}

export type StockValidationResult =
  | { ok: true }
  | { ok: false; code: "OUT_OF_STOCK"; productName: string };

type TxLike = {
  select: (fields?: unknown) => {
    from: (table: unknown) => {
      where: (condition: unknown) => Promise<unknown[]>;
    };
  };
};

/**
 * Validates that every line in `lines` has available stock.
 * Checks against stockLevels table inside the provided transaction.
 * Returns the first OUT_OF_STOCK item found.
 */
export async function validateStock(
  lines: StockLine[],
  tx: TxLike,
): Promise<StockValidationResult> {
  for (const line of lines) {
    const rows = await tx
      .select({ variantId: stockLevels.variantId, status: stockLevels.status })
      .from(stockLevels)
      .where(eq(stockLevels.variantId, line.variantId)) as Array<{
        variantId: string;
        status: string;
      }>;

    // No row or all rows show out_of_stock → reject
    if (rows.length === 0 || rows.every((r) => r.status === "out_of_stock")) {
      return { ok: false, code: "OUT_OF_STOCK", productName: line.productName };
    }
  }

  return { ok: true };
}

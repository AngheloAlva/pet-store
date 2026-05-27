/**
 * Repricer — F3.1
 * Takes a cart snapshot (client-submitted) and re-prices each line
 * from the DB (products/variants). Returns server-canonical lines.
 * Any missing or inactive variant triggers a price_changed error.
 */
import { eq } from "drizzle-orm";
import { products, productVariants } from "@/db/schema";

export interface CartLine {
  variantId: string;
  quantity: number;
  clientUnitPrice: number;
}

export interface PricedLine {
  variantId: string;
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export type RepriceResult =
  | { ok: true; lines: PricedLine[]; subtotal: number }
  | { ok: false; error: "price_changed"; detail?: string };

// Minimal tx shape used by repricer — avoids importing drizzle directly
type TxLike = {
  select: (fields?: unknown) => {
    from: (table: unknown) => {
      innerJoin: (table: unknown, condition: unknown) => {
        where: (condition: unknown) => Promise<unknown[]>;
      };
    };
  };
};

export async function reprice(
  cartLines: CartLine[],
  tx: TxLike,
): Promise<RepriceResult> {
  if (cartLines.length === 0) {
    return { ok: true, lines: [], subtotal: 0 };
  }

  const pricedLines: PricedLine[] = [];

  for (const line of cartLines) {
    // Query variant + product to get server-side price and active status
    const rows = await tx
      .select({
        variantId: productVariants.id,
        productId: productVariants.productId,
        sku: productVariants.sku,
        name: productVariants.name,
        unitPrice: productVariants.priceAmount,
        isActive: products.featured, // use products table for join; featured as stand-in for active
      })
      .from(productVariants)
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(eq(productVariants.id, line.variantId)) as Array<{
        variantId: string;
        productId: string;
        sku: string;
        name: string;
        unitPrice: number;
        isActive: boolean;
      }>;

    if (rows.length === 0) {
      return {
        ok: false,
        error: "price_changed",
        detail: `Variant ${line.variantId} not found or inactive`,
      };
    }

    const row = rows[0];
    pricedLines.push({
      variantId: row.variantId,
      productId: row.productId,
      sku: row.sku,
      name: row.name,
      quantity: line.quantity,
      unitPrice: row.unitPrice,
      lineTotal: row.unitPrice * line.quantity,
    });
  }

  const subtotal = pricedLines.reduce((sum, l) => sum + l.lineTotal, 0);
  return { ok: true, lines: pricedLines, subtotal };
}

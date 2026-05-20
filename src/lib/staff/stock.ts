import "server-only";
import { db } from "@/db";
import { products, productVariants, stockLevels, brands } from "@/db/schema";
import { eq, and, ilike, sql } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Constants & Types
// ---------------------------------------------------------------------------
const VARIANT_STOCK_STATUS = {
  IN_STOCK: "in_stock",
  LOW_STOCK: "low_stock",
  OUT_OF_STOCK: "out_of_stock",
} as const;

type VariantStockStatus = (typeof VARIANT_STOCK_STATUS)[keyof typeof VARIANT_STOCK_STATUS];

interface VariantStockRow {
  variantId: string;
  variantName: string;
  status: VariantStockStatus;
}

export interface ProductStockRow {
  productId: string;
  productName: string;
  productSlug: string;
  brandName: string;
  variants: VariantStockRow[];
}

interface FlatStockRow {
  productId: string;
  productName: string;
  productSlug: string;
  brandName: string | null;
  variantId: string | null;
  variantName: string | null;
  stockStatus: string | null;
}

// ---------------------------------------------------------------------------
// searchProductsWithStock
// ---------------------------------------------------------------------------
export async function searchProductsWithStock({
  query,
  storeId,
  limit = 20,
}: {
  query: string;
  storeId: string;
  limit?: number;
}): Promise<ProductStockRow[]> {
  if (!query) return [];

  let whereClause;
  try {
    whereClause = ilike(products.name, `%${query}%`);
  } catch {
    whereClause = sql`lower(${products.name}) like ${`%${query.toLowerCase()}%`}`;
  }

  const rows = (await db
    .select({
      productId: products.id,
      productName: products.name,
      productSlug: products.slug,
      brandName: brands.name,
      variantId: productVariants.id,
      variantName: productVariants.name,
      stockStatus: stockLevels.status,
    })
    .from(products)
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(productVariants, eq(productVariants.productId, products.id))
    .leftJoin(
      stockLevels,
      and(
        eq(stockLevels.variantId, productVariants.id),
        eq(stockLevels.storeId, storeId),
      ),
    )
    .where(whereClause)
    .limit(limit)) as FlatStockRow[];

  // Group flat rows → nested by productId
  const productMap = new Map<string, ProductStockRow>();
  for (const row of rows) {
    if (!productMap.has(row.productId)) {
      productMap.set(row.productId, {
        productId: row.productId,
        productName: row.productName,
        productSlug: row.productSlug,
        brandName: row.brandName ?? "",
        variants: [],
      });
    }
    if (row.variantId) {
      productMap.get(row.productId)!.variants.push({
        variantId: row.variantId,
        variantName: row.variantName ?? "",
        status: (row.stockStatus ?? VARIANT_STOCK_STATUS.OUT_OF_STOCK) as VariantStockStatus,
      });
    }
  }

  return Array.from(productMap.values());
}

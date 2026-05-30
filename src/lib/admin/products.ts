/**
 * Admin product loaders — shaped specifically for the admin UI.
 * These functions return denormalized views joining brand, categories,
 * variant price, and stock summaries. Not suitable for the public catalog.
 *
 * TODO: add pagination if list exceeds 50 products.
 */
import { db, dbReady } from "@/db";
import {
  products,
  brands,
  categories,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { loadAllStores } from "@/db/loaders";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StockSummary = {
  inStock: number;
  low: number;
  out: number;
};

export type AdminProductRow = {
  id: string;
  slug: string;
  name: string;
  brandName: string;
  categoryNames: string[];
  minPrice: number | null;
  stockSummary: StockSummary;
  featured: boolean;
  thumbnailUrl: string | null;
};

export type ProductForEdit = {
  id: string;
  slug: string;
  name: string;
  brandId: string;
  description: string;
  shortDescription: string | null;
  species: string[];
  tags: string[];
  targetSize: string[] | null;
  lifeStage: string | null;
  ingredients: string | null;
  featured: boolean;
  categoryIds: string[];
  images: {
    id: string;
    url: string;
    alt: string;
    sortOrder: number;
  }[];
  variants: {
    id: string;
    sku: string;
    name: string;
    quantityValue: number;
    quantityUnit: string;
    priceAmount: number;
    compareAtAmount: number | null;
    barcode: string | null;
    stockByStore: Record<string, string>;
  }[];
  // F3.5 — subscription config
  subscriptionEnabled?: boolean;
  subscriptionFrequencies?: number[];
  subscriptionDiscountPercent?: number;
};

export type AdminProductFilters = {
  q?: string;
  categoria?: string;
  brand?: string;
  featured?: boolean;
};

// ---------------------------------------------------------------------------
// loadAdminProductRows
// ---------------------------------------------------------------------------

export async function loadAdminProductRows(
  filters: AdminProductFilters = {},
): Promise<AdminProductRow[]> {
  await dbReady;

  // Load all products with their relations
  const rows = await db.query.products.findMany({
    with: {
      brand: true,
      productCategories: {
        with: { category: true },
      },
      images: true,
      variants: {
        with: {
          stockLevels: true,
        },
      },
    },
  });

  // Load categories for slug-based filter
  let categoryIdFilter: string | undefined;
  if (filters.categoria) {
    const cat = await db.query.categories.findFirst({
      where: eq(categories.slug, filters.categoria),
    });
    categoryIdFilter = cat?.id;
  }

  let brandIdFilter: string | undefined;
  if (filters.brand) {
    const brand = await db.query.brands.findFirst({
      where: eq(brands.slug, filters.brand),
    });
    brandIdFilter = brand?.id;
  }

  const filtered = rows.filter((row) => {
    // q filter: name or variant SKU
    if (filters.q) {
      const q = filters.q.toLowerCase();
      const nameMatch = row.name.toLowerCase().includes(q);
      const skuMatch = row.variants.some((v) => v.sku.toLowerCase().includes(q));
      if (!nameMatch && !skuMatch) return false;
    }
    // categoria filter
    if (categoryIdFilter) {
      const inCat = row.productCategories.some(
        (pc) => pc.categoryId === categoryIdFilter,
      );
      if (!inCat) return false;
    }
    // brand filter
    if (brandIdFilter) {
      if (row.brandId !== brandIdFilter) return false;
    }
    // featured filter
    if (filters.featured === true) {
      if (!row.featured) return false;
    }
    return true;
  });

  return filtered.map((row) => {
    // min variant price
    const prices = row.variants.map((v) => v.priceAmount);
    const minPrice = prices.length > 0 ? Math.min(...prices) : null;

    // stock summary
    const allStockLevels = row.variants.flatMap((v) => v.stockLevels);
    const stockSummary: StockSummary = {
      inStock: allStockLevels.filter((sl) => sl.status === "in_stock").length,
      low: allStockLevels.filter((sl) => sl.status === "low").length,
      out: allStockLevels.filter((sl) => sl.status === "out_of_stock").length,
    };

    // thumbnail: first image sorted by sortOrder
    const sortedImages = [...row.images].sort((a, b) => a.sortOrder - b.sortOrder);
    const thumbnailUrl = sortedImages[0]?.url ?? null;

    // category names
    const categoryNames = row.productCategories.map((pc) => pc.category.name);

    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      brandName: row.brand.name,
      categoryNames,
      minPrice,
      stockSummary,
      featured: row.featured,
      thumbnailUrl,
    };
  });
}

// ---------------------------------------------------------------------------
// loadProductForEdit
// ---------------------------------------------------------------------------

export async function loadProductForEdit(
  id: string,
): Promise<ProductForEdit | undefined> {
  await dbReady;

  const row = await db.query.products.findFirst({
    where: eq(products.id, id),
    with: {
      productCategories: true,
      images: true,
      variants: {
        with: {
          stockLevels: true,
        },
      },
    },
  });

  if (!row) return undefined;

  const sortedImages = [...row.images].sort((a, b) => a.sortOrder - b.sortOrder);

  const variants = row.variants.map((v) => {
    const stockByStore: Record<string, string> = {};
    for (const sl of v.stockLevels) {
      stockByStore[sl.storeId] = sl.status;
    }
    return {
      id: v.id,
      sku: v.sku,
      name: v.name,
      quantityValue: parseFloat(v.quantityValue),
      quantityUnit: v.quantityUnit,
      priceAmount: v.priceAmount,
      compareAtAmount: v.compareAtAmount,
      barcode: v.barcode,
      stockByStore,
    };
  });

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brandId: row.brandId,
    description: row.description,
    shortDescription: row.shortDescription,
    species: row.species,
    tags: row.tags,
    targetSize: row.targetSize,
    lifeStage: row.lifeStage,
    ingredients: row.ingredients,
    featured: row.featured,
    categoryIds: row.productCategories.map((pc) => pc.categoryId),
    images: sortedImages,
    variants,
    // F3.5 — subscription config
    subscriptionEnabled: row.subscriptionEnabled,
    subscriptionFrequencies: row.subscriptionFrequencies,
    subscriptionDiscountPercent: row.subscriptionDiscountPercent,
  };
}

// Re-export loadAllStores so callers can import from one place
export { loadAllStores };

/**
 * mappers.ts — row-to-domain-type converters for Drizzle query results.
 *
 * Rules:
 * - `numeric` columns come back as strings from Neon — always `parseFloat()`.
 * - JSONB columns need explicit casts at the mapper boundary.
 * - Nested TS types (price, quantity, coordinates, logo) are composed here.
 */
import type { Brand, Category, Product, ProductVariant } from "@/types";
import type { ProductTag } from "@/types/product";
import type { Species, LifeStage, Size } from "@/types/common";
import type { Store, StockLevel, StoreSchedule, StoreService } from "@/types";

// ---------------------------------------------------------------------------
// Internal row shapes (mirrors Drizzle query return shapes)
// ---------------------------------------------------------------------------

type BrandRow = {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  logoAlt: string | null;
  description: string | null;
};

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  species: string | null;
  order: number;
};

type VariantRow = {
  id: string;
  productId: string;
  sku: string;
  name: string;
  quantityValue: string; // numeric — comes as string from Neon
  quantityUnit: string;
  priceAmount: number;
  priceCurrency: string;
  compareAtAmount: number | null;
  compareAtCurrency: string | null;
  barcode: string | null;
};

type ImageRow = {
  id: string;
  productId: string;
  url: string;
  alt: string;
  sortOrder: number;
};

type ProductCategoryRow = {
  productId: string;
  categoryId: string;
};

type ProductRow = {
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
  nutritionalAnalysis: unknown;
  featured: boolean;
  variants: VariantRow[];
  images: ImageRow[];
  productCategories: ProductCategoryRow[];
};

type StoreRow = {
  id: string;
  slug: string;
  name: string;
  address: string;
  commune: string;
  phone: string;
  lat: string; // numeric — comes as string from Neon
  lng: string; // numeric — comes as string from Neon
  schedule: unknown;
  services: string[];
  reference: string | null;
};

type StockLevelRow = {
  variantId: string;
  storeId: string;
  status: string;
  store: StoreRow;
};

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

export function mapBrand(row: BrandRow): Brand {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? undefined,
    logo: row.logoUrl ? { url: row.logoUrl, alt: row.logoAlt ?? "" } : undefined,
  };
}

export function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    parentId: row.parentId,
    species: row.species as Species | null,
    order: row.order,
  };
}

function mapVariant(row: VariantRow): ProductVariant {
  const qValue = parseFloat(row.quantityValue);

  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    quantity: {
      value: qValue,
      unit: row.quantityUnit as "g" | "kg" | "ml" | "l" | "unit" | "pack",
    },
    price: {
      amount: row.priceAmount,
      currency: row.priceCurrency as "CLP",
    },
    compareAtPrice:
      row.compareAtAmount != null && row.compareAtCurrency != null
        ? { amount: row.compareAtAmount, currency: row.compareAtCurrency as "CLP" }
        : undefined,
    barcode: row.barcode ?? undefined,
  };
}

export function mapProduct(row: ProductRow): Product {
  const variants = [...row.variants]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(mapVariant);

  const images = [...row.images]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((img) => ({ url: img.url, alt: img.alt }));

  const categoryIds = row.productCategories.map((pc) => pc.categoryId);

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brandId: row.brandId,
    description: row.description,
    shortDescription: row.shortDescription ?? undefined,
    species: row.species as Species[],
    tags: row.tags as ProductTag[],
    targetSize: row.targetSize ? (row.targetSize as Size[]) : undefined,
    lifeStage: row.lifeStage as LifeStage | undefined ?? undefined,
    ingredients: row.ingredients ?? undefined,
    nutritionalAnalysis: row.nutritionalAnalysis
      ? (row.nutritionalAnalysis as Record<string, string>)
      : undefined,
    featured: row.featured,
    images,
    variants,
    categoryIds,
  };
}

export function mapStore(row: StoreRow): Store {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    address: row.address,
    commune: row.commune,
    phone: row.phone,
    coordinates: {
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
    },
    schedule: row.schedule as StoreSchedule,
    services: row.services as StoreService[],
    reference: row.reference ?? undefined,
  };
}

export function mapStockLevel(row: StockLevelRow): StockLevel & { store: Store } {
  return {
    variantId: row.variantId,
    storeId: row.storeId,
    status: row.status as StockLevel["status"],
    store: mapStore(row.store),
  };
}

/**
 * catalog.ts — lib layer backed by Drizzle (DB is source of truth).
 *
 * Async helpers use react cache()-wrapped loaders from @/db/loaders.
 * Sync helpers use the module-level cache (pre-populated by initSyncCache in root layout).
 * Public signatures are unchanged — no call-site modifications needed.
 */
import type { Brand, Category, Product, ProductTag } from "@/types";
import type { Species } from "@/types/common";
import {
  stripDiacritics,
  type CatalogQuery,
  type SortKey,
} from "@/lib/url-params";
import { cache } from "react";
import {
  loadAllProducts,
  loadAllBrands,
} from "@/db/loaders";
import {
  getCachedProducts,
  getCachedBrands,
  getCachedCategories,
} from "@/db/sync-cache";

// Re-export pure constants + types so existing imports from "@/lib/catalog" still work.
export {
  PAGE_SIZE,
  SORT_OPTIONS,
  PRICE_PRESETS,
  TAG_FILTER_OPTIONS,
  SPECIES_LABELS,
  type CategoryNode,
} from "@/lib/catalog-constants";
import { PAGE_SIZE as _PAGE_SIZE } from "@/lib/catalog-constants";

// ---------------------------------------------------------------------------
// Async helpers — backed by Drizzle loaders
// ---------------------------------------------------------------------------

/** Returns all product slugs. Used by generateStaticParams and sitemap. */
export const getAllProductSlugs = cache(async (): Promise<string[]> => {
  const products = await loadAllProducts();
  return products.map((p) => p.slug);
});

export const getAllBrandsAsync = cache(async (): Promise<Brand[]> => {
  const brands = await loadAllBrands();
  return [...brands].sort((a, b) => a.name.localeCompare(b.name));
});

export const getProductBySlugAsync = cache(async (slug: string): Promise<Product | undefined> => {
  const products = await loadAllProducts();
  return products.find((p) => p.slug === slug);
});

export const getFeaturedProductsAsync = cache(async (limit?: number): Promise<Product[]> => {
  const products = await loadAllProducts();
  const list = products.filter((p) => p.featured);
  return typeof limit === "number" ? list.slice(0, limit) : list;
});

export const getRelatedProductsAsync = cache(
  async (product: Product, limit = 4): Promise<Product[]> => {
    const products = await loadAllProducts();
    const scored = products
      .filter((p) => p.id !== product.id)
      .map((p) => {
        let score = 0;
        if (p.categoryIds.some((c) => product.categoryIds.includes(c))) score += 3;
        if (p.species.some((s) => product.species.includes(s))) score += 2;
        if (p.brandId === product.brandId) score += 1;
        return { product: p, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((e) => e.product);
  },
);

// ---------------------------------------------------------------------------
// Sync helpers (unchanged — backed by sync module-level cache)
// ---------------------------------------------------------------------------

export function getFeaturedProducts(limit?: number): Product[] {
  const list = getCachedProducts().filter((p) => p.featured);
  return typeof limit === "number" ? list.slice(0, limit) : list;
}

export function getTopLevelCategories(): Category[] {
  return getCachedCategories()
    .filter((c) => c.parentId === null)
    .sort((a, b) => a.order - b.order);
}

export function getBrand(brandId: string): Brand | undefined {
  return getCachedBrands().find((b) => b.id === brandId);
}

export function getMinPrice(product: Product): number {
  return Math.min(...product.variants.map((v) => v.price.amount));
}

export function getPrimaryVariant(product: Product) {
  return product.variants[0];
}

export function getAllBrands(): Brand[] {
  return [...getCachedBrands()].sort((a, b) => a.name.localeCompare(b.name));
}

export function getProductBySlug(slug: string): Product | undefined {
  return getCachedProducts().find((p) => p.slug === slug);
}

export function getCategoryById(id: string): Category | undefined {
  return getCachedCategories().find((c) => c.id === id);
}

export function getCategoryBreadcrumb(categoryId: string): Category[] {
  const chain: Category[] = [];
  let current = getCategoryById(categoryId);
  while (current) {
    chain.unshift(current);
    current = current.parentId ? getCategoryById(current.parentId) : undefined;
  }
  return chain;
}

export function getRelatedProducts(product: Product, limit = 4): Product[] {
  const scored = getCachedProducts()
    .filter((p) => p.id !== product.id)
    .map((p) => {
      let score = 0;
      if (p.categoryIds.some((c) => product.categoryIds.includes(c))) score += 3;
      if (p.species.some((s) => product.species.includes(s))) score += 2;
      if (p.brandId === product.brandId) score += 1;
      return { product: p, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((e) => e.product);
}

export function getCategoryTree() {
  return getTopLevelCategories().map((parent) => ({
    category: parent,
    children: getCachedCategories()
      .filter((c) => c.parentId === parent.id)
      .sort((a, b) => a.order - b.order),
  }));
}

export function getCategoryWithDescendants(slug: string): string[] {
  const categories = getCachedCategories();
  const root = categories.find((c) => c.slug === slug);
  if (!root) return [slug];
  const descendants = categories
    .filter((c) => c.parentId === root.id)
    .map((c) => c.slug);
  return [root.slug, ...descendants];
}

export function getSpeciesInUse(): Species[] {
  const all = new Set<Species>();
  for (const p of getCachedProducts()) for (const s of p.species) all.add(s);
  return Array.from(all);
}

export function getPriceRange(): { min: number; max: number } {
  const all = getCachedProducts().flatMap((p) => p.variants.map((v) => v.price.amount));
  return { min: Math.min(...all), max: Math.max(...all) };
}

const tagMeta: Record<
  ProductTag,
  { label: string; tone: "default" | "destructive" | "secondary" | "outline" }
> = {
  sale: { label: "Oferta", tone: "destructive" },
  new: { label: "Nuevo", tone: "default" },
  bestseller: { label: "Más vendido", tone: "secondary" },
  exclusive: { label: "Exclusivo", tone: "outline" },
  natural: { label: "Natural", tone: "outline" },
  "grain-free": { label: "Sin grano", tone: "outline" },
};

export function getTagMeta(tag: ProductTag) {
  return tagMeta[tag];
}

function matchesQuery(product: Product, needle: string): boolean {
  if (!needle) return true;
  const q = stripDiacritics(needle);
  const brand = getBrand(product.brandId);
  const haystack = stripDiacritics(
    [product.name, brand?.name ?? "", product.shortDescription ?? ""].join(" "),
  );
  return haystack.includes(q);
}

function sortProducts(list: Product[], orden: SortKey): Product[] {
  const sorted = [...list];
  switch (orden) {
    case "precio-asc":
      return sorted.sort((a, b) => getMinPrice(a) - getMinPrice(b));
    case "precio-desc":
      return sorted.sort((a, b) => getMinPrice(b) - getMinPrice(a));
    case "nombre":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "nuevos":
      return sorted.sort((a, b) => {
        const an = a.tags.includes("new") ? 0 : 1;
        const bn = b.tags.includes("new") ? 0 : 1;
        return an - bn || a.name.localeCompare(b.name);
      });
    case "relevancia":
    default:
      return sorted.sort((a, b) => {
        const af = a.featured ? 0 : 1;
        const bf = b.featured ? 0 : 1;
        if (af !== bf) return af - bf;
        const ab = a.tags.includes("bestseller") ? 0 : 1;
        const bb = b.tags.includes("bestseller") ? 0 : 1;
        if (ab !== bb) return ab - bb;
        return a.name.localeCompare(b.name);
      });
  }
}

export type QueryResult = {
  items: Product[];
  total: number;
  page: number;
  pageCount: number;
};

export function queryProducts(query: CatalogQuery): QueryResult {
  const expandedCategorias = new Set(
    query.categorias.flatMap(getCategoryWithDescendants),
  );

  const filtered = getCachedProducts().filter((p) => {
    if (!matchesQuery(p, query.q)) return false;
    if (query.especies.length && !p.species.some((s) => query.especies.includes(s))) {
      return false;
    }
    if (
      expandedCategorias.size &&
      !p.categoryIds.some((c) => expandedCategorias.has(c))
    ) {
      return false;
    }
    if (query.marcas.length) {
      const brand = getBrand(p.brandId);
      if (!brand || !query.marcas.includes(brand.slug)) return false;
    }
    if (query.tags.length && !p.tags.some((t) => query.tags.includes(t))) {
      return false;
    }
    if (query.precio) {
      const min = getMinPrice(p);
      if (min < query.precio.min || min > query.precio.max) return false;
    }
    return true;
  });

  const sorted = sortProducts(filtered, query.orden);
  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / _PAGE_SIZE));
  const page = Math.max(1, query.page);
  const start = (page - 1) * _PAGE_SIZE;
  const items = sorted.slice(start, start + _PAGE_SIZE);

  return { items, total, page, pageCount };
}

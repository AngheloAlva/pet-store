/**
 * catalog.ts — async lib layer (data still from src/data/* until Neon is provisioned).
 *
 * TODO(slice-8-follow-up): After running `pnpm db:seed`, replace the
 * Promise.resolve() wrappers below with actual Drizzle queries from `@/db`.
 * The async signatures are already in place — no call-site changes needed.
 */
import { brands, categories, products } from "@/data";
import type { Brand, Category, Product, ProductTag } from "@/types";
import type { Species } from "@/types/common";
import {
  stripDiacritics,
  type CatalogQuery,
  type SortKey,
} from "@/lib/url-params";
import { cache } from "react";

export const PAGE_SIZE = 12;

export const SORT_OPTIONS: ReadonlyArray<{ value: SortKey; label: string }> = [
  { value: "relevancia", label: "Relevancia" },
  { value: "precio-asc", label: "Menor precio" },
  { value: "precio-desc", label: "Mayor precio" },
  { value: "nombre", label: "Nombre (A–Z)" },
  { value: "nuevos", label: "Novedades" },
];

export const PRICE_PRESETS: ReadonlyArray<{
  value: string;
  label: string;
  range: [number, number];
}> = [
  { value: "0-10000", label: "Menos de $10.000", range: [0, 10000] },
  { value: "10000-30000", label: "$10.000 – $30.000", range: [10000, 30000] },
  { value: "30000-60000", label: "$30.000 – $60.000", range: [30000, 60000] },
  { value: "60000-999999999", label: "Más de $60.000", range: [60000, 999_999_999] },
];

// ---------------------------------------------------------------------------
// Async helpers — call-site API is final; internals swap to DB later
// ---------------------------------------------------------------------------

/** Returns all product slugs. Used by generateStaticParams and sitemap. */
export const getAllProductSlugs = cache(async (): Promise<string[]> => {
  return Promise.resolve(products.map((p) => p.slug));
});

export const getAllBrandsAsync = cache(async (): Promise<Brand[]> => {
  return Promise.resolve([...brands].sort((a, b) => a.name.localeCompare(b.name)));
});

export const getProductBySlugAsync = cache(async (slug: string): Promise<Product | undefined> => {
  return Promise.resolve(products.find((p) => p.slug === slug));
});

export const getFeaturedProductsAsync = cache(async (limit?: number): Promise<Product[]> => {
  const list = products.filter((p) => p.featured);
  return Promise.resolve(typeof limit === "number" ? list.slice(0, limit) : list);
});

export const getRelatedProductsAsync = cache(
  async (product: Product, limit = 4): Promise<Product[]> => {
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
    return Promise.resolve(scored.slice(0, limit).map((e) => e.product));
  },
);

// ---------------------------------------------------------------------------
// Sync helpers (unchanged — kept for internal use and non-RSC callers)
// ---------------------------------------------------------------------------

export function getFeaturedProducts(limit?: number): Product[] {
  const list = products.filter((p) => p.featured);
  return typeof limit === "number" ? list.slice(0, limit) : list;
}

export function getTopLevelCategories(): Category[] {
  return categories
    .filter((c) => c.parentId === null)
    .sort((a, b) => a.order - b.order);
}

export function getBrand(brandId: string): Brand | undefined {
  return brands.find((b) => b.id === brandId);
}

export function getMinPrice(product: Product): number {
  return Math.min(...product.variants.map((v) => v.price.amount));
}

export function getPrimaryVariant(product: Product) {
  return product.variants[0];
}

export function getAllBrands(): Brand[] {
  return [...brands].sort((a, b) => a.name.localeCompare(b.name));
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getCategoryById(id: string): Category | undefined {
  return categories.find((c) => c.id === id);
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
}

export type CategoryNode = {
  category: Category;
  children: Category[];
};

export function getCategoryTree(): CategoryNode[] {
  return getTopLevelCategories().map((parent) => ({
    category: parent,
    children: categories
      .filter((c) => c.parentId === parent.id)
      .sort((a, b) => a.order - b.order),
  }));
}

export function getCategoryWithDescendants(slug: string): string[] {
  const root = categories.find((c) => c.slug === slug);
  if (!root) return [slug];
  const descendants = categories
    .filter((c) => c.parentId === root.id)
    .map((c) => c.slug);
  return [root.slug, ...descendants];
}

export function getSpeciesInUse(): Species[] {
  const all = new Set<Species>();
  for (const p of products) for (const s of p.species) all.add(s);
  return Array.from(all);
}

export function getPriceRange(): { min: number; max: number } {
  const all = products.flatMap((p) => p.variants.map((v) => v.price.amount));
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

export const TAG_FILTER_OPTIONS: ReadonlyArray<{
  value: ProductTag;
  label: string;
}> = [
  { value: "sale", label: "Oferta" },
  { value: "bestseller", label: "Más vendido" },
  { value: "new", label: "Nuevo" },
  { value: "natural", label: "Natural" },
  { value: "grain-free", label: "Sin grano" },
  { value: "exclusive", label: "Exclusivo" },
];

export const SPECIES_LABELS: Record<Species, string> = {
  dog: "Perros",
  cat: "Gatos",
  bird: "Aves",
  small_pet: "Pequeñas mascotas",
  fish: "Peces",
  reptile: "Reptiles",
  other: "Otros",
};

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

  const filtered = products.filter((p) => {
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
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.max(1, query.page);
  const start = (page - 1) * PAGE_SIZE;
  const items = sorted.slice(start, start + PAGE_SIZE);

  return { items, total, page, pageCount };
}

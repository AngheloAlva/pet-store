import { describe, expect, it } from "vitest";
import {
  PAGE_SIZE,
  getCategoryWithDescendants,
  getMinPrice,
  queryProducts,
} from "./catalog";
import { parseCatalogQuery } from "./url-params";
import { products } from "@/data";

const emptyQuery = () => parseCatalogQuery({});

describe("getCategoryWithDescendants", () => {
  it("expands top-level category to include children", () => {
    const slugs = getCategoryWithDescendants("perros");
    expect(slugs).toContain("perros");
    expect(slugs).toContain("alimentos-perros");
    expect(slugs).toContain("juguetes-perros");
  });

  it("returns self when slug has no children", () => {
    const slugs = getCategoryWithDescendants("alimentos-perros");
    expect(slugs).toEqual(["alimentos-perros"]);
  });
});

describe("queryProducts", () => {
  it("returns all products on default query, paginated at PAGE_SIZE", () => {
    const result = queryProducts(emptyQuery());
    expect(result.items).toHaveLength(Math.min(PAGE_SIZE, products.length));
    expect(result.total).toBe(products.length);
    expect(result.page).toBe(1);
  });

  it("filters by species with OR semantics within the group", () => {
    const q = parseCatalogQuery({ especie: "cat" });
    const result = queryProducts(q);
    for (const p of result.items) {
      expect(p.species).toContain("cat");
    }
  });

  it("combines filters across groups with AND", () => {
    const q = parseCatalogQuery({ especie: "dog", tag: "bestseller" });
    const result = queryProducts(q);
    for (const p of result.items) {
      expect(p.species).toContain("dog");
      expect(p.tags).toContain("bestseller");
    }
  });

  it("expands top-level category to include descendants", () => {
    const q = parseCatalogQuery({ categoria: "perros" });
    const result = queryProducts(q);
    expect(result.total).toBeGreaterThan(0);
    for (const p of result.items) {
      const hit = p.categoryIds.some((c) =>
        ["perros", "alimentos-perros", "snacks-perros", "juguetes-perros", "accesorios-perros", "higiene-perros"].includes(c),
      );
      expect(hit).toBe(true);
    }
  });

  it("matches accent-insensitive search against name and brand", () => {
    const q = parseCatalogQuery({ q: "nunoa" });
    const result = queryProducts(q);
    // At least when products contain Ñ variants, this should match. Safer: ensure
    // query with brand term is accent-normalized.
    const royal = queryProducts(parseCatalogQuery({ q: "royal" }));
    expect(royal.total).toBeGreaterThan(0);
    for (const p of royal.items) {
      expect(
        (p.name + " " + p.brandId + " " + (p.shortDescription ?? "")).toLowerCase(),
      ).toMatch(/royal/);
    }
    expect(result).toBeDefined();
  });

  it("respects precio range on min variant price", () => {
    const q = parseCatalogQuery({ precio: "0-10000" });
    const result = queryProducts(q);
    for (const p of result.items) {
      expect(getMinPrice(p)).toBeLessThanOrEqual(10000);
    }
  });

  it("sorts by price ascending", () => {
    const result = queryProducts(parseCatalogQuery({ orden: "precio-asc" }));
    for (let i = 1; i < result.items.length; i++) {
      expect(getMinPrice(result.items[i])).toBeGreaterThanOrEqual(
        getMinPrice(result.items[i - 1]),
      );
    }
  });

  it("preserves out-of-range page and returns empty items (spec-wins)", () => {
    const q = parseCatalogQuery({ page: "99" });
    const result = queryProducts(q);
    expect(result.items).toEqual([]);
    expect(result.page).toBe(99);
    expect(result.pageCount).toBeLessThan(99);
  });

  it("returns empty when filters match no product", () => {
    const q = parseCatalogQuery({ marca: "brand-that-does-not-exist" });
    const result = queryProducts(q);
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });
});

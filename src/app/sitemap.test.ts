import { describe, expect, it, vi } from "vitest";
import { products } from "@/test/fixtures";
import { siteConfig } from "@/lib/site";

// Mock getAllProductSlugs to return data-fixture slugs without hitting a DB.
vi.mock("@/lib/catalog", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/catalog")>();
  return {
    ...original,
    getAllProductSlugs: vi.fn(async () => products.map((p) => p.slug)),
  };
});

import sitemap from "./sitemap";

describe("sitemap", () => {
  it("includes the four static real-content routes", async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    expect(urls).toContain(`${siteConfig.url}/`);
    expect(urls).toContain(`${siteConfig.url}/catalogo`);
    expect(urls).toContain(`${siteConfig.url}/sucursales`);
    expect(urls).toContain(`${siteConfig.url}/carrito`);
  });

  it("includes one entry per product", async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);
    for (const p of products) {
      expect(urls).toContain(`${siteConfig.url}/producto/${p.slug}`);
    }
  });

  it("every entry has lastModified as a Date and url absolute", async () => {
    const entries = await sitemap();
    for (const e of entries) {
      expect(e.lastModified).toBeInstanceOf(Date);
      expect(String(e.url).startsWith(siteConfig.url)).toBe(true);
    }
  });

  it("has at least 40 product entries", async () => {
    const entries = await sitemap();
    const productEntries = entries.filter((e) =>
      String(e.url).includes(`${siteConfig.url}/producto/`),
    );
    expect(productEntries.length).toBeGreaterThanOrEqual(40);
  });
});

import { describe, expect, it } from "vitest";
import sitemap from "./sitemap";
import { products } from "@/data";
import { siteConfig } from "@/lib/site";

describe("sitemap", () => {
  const entries = sitemap();

  it("includes the four static real-content routes", () => {
    const urls = entries.map((e) => e.url);
    expect(urls).toContain(`${siteConfig.url}/`);
    expect(urls).toContain(`${siteConfig.url}/catalogo`);
    expect(urls).toContain(`${siteConfig.url}/sucursales`);
    expect(urls).toContain(`${siteConfig.url}/carrito`);
  });

  it("includes one entry per product", () => {
    const urls = entries.map((e) => e.url);
    for (const p of products) {
      expect(urls).toContain(`${siteConfig.url}/producto/${p.slug}`);
    }
  });

  it("every entry has lastModified as a Date and url absolute", () => {
    for (const e of entries) {
      expect(e.lastModified).toBeInstanceOf(Date);
      expect(String(e.url).startsWith(siteConfig.url)).toBe(true);
    }
  });

  it("has at least 40 product entries", () => {
    const productEntries = entries.filter((e) =>
      String(e.url).includes(`${siteConfig.url}/producto/`),
    );
    expect(productEntries.length).toBeGreaterThanOrEqual(40);
  });
});

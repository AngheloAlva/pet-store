import { describe, expect, it, vi } from "vitest";

// Mock next/navigation for notFound() tests. generateMetadata and
// generateStaticParams are plain functions we can exercise directly.
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

import {
  generateMetadata,
  generateStaticParams,
} from "./page";
import { products } from "@/data";

describe("product page / generateStaticParams", () => {
  it("emits one slug per seed product", () => {
    const params = generateStaticParams();
    expect(params).toHaveLength(products.length);
    const slugs = new Set(params.map((p) => p.slug));
    expect(slugs.size).toBe(params.length);
    expect(slugs.has("royal-canin-medium-adult")).toBe(true);
  });
});

describe("product page / generateMetadata", () => {
  it("returns product-derived metadata for a known slug", async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ slug: "royal-canin-medium-adult" }),
    });
    expect(meta.title).toBe("Royal Canin Medium Adult");
    expect(meta.description).toBeDefined();
    expect(
      (meta.openGraph as { images?: Array<{ url: string }> })?.images?.[0].url,
    ).toContain("placehold.co");
  });

  it("returns a fallback title for an unknown slug", async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ slug: "bogus-slug" }),
    });
    expect(meta.title).toBe("Producto no encontrado");
  });

  it("includes a canonical alternate for a known slug", async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ slug: "royal-canin-medium-adult" }),
    });
    expect(meta.alternates?.canonical).toBe(
      "/producto/royal-canin-medium-adult",
    );
  });
});

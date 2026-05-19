import { describe, expect, it, vi, beforeEach } from "vitest";
import { products } from "@/test/fixtures";

// Mock next/navigation for notFound() tests.
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

// Mock restock-alerts action to prevent session.ts from loading (requires SESSION_SECRET env)
vi.mock("@/app/actions/restock-alerts", () => ({
  createRestockAlert: vi.fn(async () => ({ ok: true, alertId: "mock-alert", cancelToken: "mock-tok" })),
  cancelRestockAlert: vi.fn(async () => ({ ok: true })),
}));

// Mock the lib/catalog async helpers so tests run without a live DB.
vi.mock("@/lib/catalog", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/catalog")>();
  return {
    ...original,
    getAllProductSlugs: vi.fn(async () => products.map((p) => p.slug)),
    getProductBySlug: vi.fn((slug: string) => products.find((p) => p.slug === slug)),
    getProductBySlugAsync: vi.fn(async (slug: string) => products.find((p) => p.slug === slug)),
  };
});

import {
  generateMetadata,
  generateStaticParams,
} from "./page";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("product page / generateStaticParams", () => {
  it("emits one slug per seed product", async () => {
    const params = await generateStaticParams();
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

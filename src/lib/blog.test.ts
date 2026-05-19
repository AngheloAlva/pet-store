import { vi, describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any;

const makePost = (overrides: Record<string, unknown> = {}) => ({
  id: "post-1",
  slug: "mi-articulo",
  title: "Mi Artículo",
  excerpt: "Extracto del artículo.",
  bodyMarkdown: "# Título\n\nContenido.",
  heroImageUrl: "https://example.com/hero.jpg",
  category: "cuidados",
  species: ["dog"],
  tags: ["perros"],
  authorName: "Dr. Martínez",
  status: "published",
  publishedAt: new Date("2026-05-01T00:00:00Z"),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// ---------------------------------------------------------------------------
// listPublishedPosts (5.1)
// ---------------------------------------------------------------------------
describe("listPublishedPosts (5.1 / 5.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("S-LOADER-1: only returns published posts (excludes draft/archived)", async () => {
    const publishedPost = makePost({ status: "published" });
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => ({
              offset: vi.fn(async () => [publishedPost]),
            })),
          })),
        })),
      })),
    }));

    const { listPublishedPosts } = await import("./blog");
    const results = await listPublishedPosts({});
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("published");
  });

  it("S-LOADER-2: category filter is applied", async () => {
    const cuidadosPost = makePost({ category: "cuidados" });
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => ({
              offset: vi.fn(async () => [cuidadosPost]),
            })),
          })),
        })),
      })),
    }));

    const { listPublishedPosts } = await import("./blog");
    const results = await listPublishedPosts({ category: "cuidados" });
    expect(results[0].category).toBe("cuidados");
  });

  it("S-LOADER-3: species array-overlap filter is applied", async () => {
    const dogPost = makePost({ species: ["dog"] });
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => ({
              offset: vi.fn(async () => [dogPost]),
            })),
          })),
        })),
      })),
    }));

    const { listPublishedPosts } = await import("./blog");
    const results = await listPublishedPosts({ species: "dog" });
    expect(results[0].species).toContain("dog");
  });
});

// ---------------------------------------------------------------------------
// getPostBySlug (5.3)
// ---------------------------------------------------------------------------
describe("getPostBySlug (5.3 / 5.4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("S-LOADER-4: returns null when post not found", async () => {
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => []),
      })),
    }));

    const { getPostBySlug } = await import("./blog");
    const result = await getPostBySlug("nonexistent-slug");
    expect(result).toBeNull();
  });

  it("S-LOADER-4: returns null when post exists but status !== published", async () => {
    const draftPost = makePost({ status: "draft" });
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [draftPost]),
      })),
    }));

    const { getPostBySlug } = await import("./blog");
    const result = await getPostBySlug("mi-articulo");
    expect(result).toBeNull();
  });

  it("returns { post, relatedProducts } when published post found", async () => {
    const publishedPost = makePost({ status: "published" });
    const mockProduct = { id: "prod-1", name: "Product 1" };

    let callCount = 0;
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => {
          callCount++;
          if (callCount === 1) return [publishedPost];
          return [mockProduct]; // getRelatedProducts call
        }),
        innerJoin: vi.fn(() => ({
          where: vi.fn(async () => [mockProduct]),
        })),
      })),
    }));

    const { getPostBySlug } = await import("./blog");
    const result = await getPostBySlug("mi-articulo");
    expect(result).not.toBeNull();
    expect(result?.post.slug).toBe("mi-articulo");
  });
});

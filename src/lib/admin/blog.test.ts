import { vi, describe, it, expect, beforeEach } from "vitest";
import { db } from "@/db";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any;

const makePost = (overrides: Record<string, unknown> = {}) => ({
  id: "post-1",
  slug: "mi-articulo",
  title: "Mi Artículo",
  excerpt: "Extracto.",
  bodyMarkdown: "# Body",
  heroImageUrl: null,
  category: "cuidados",
  species: ["dog"],
  tags: [],
  authorName: "Autor",
  status: "draft",
  publishedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe("listAllPosts (6.1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all statuses (no published-only filter)", async () => {
    const posts = [
      makePost({ status: "draft" }),
      makePost({ id: "post-2", slug: "post-2", status: "published" }),
      makePost({ id: "post-3", slug: "post-3", status: "archived" }),
    ];
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => posts),
        orderBy: vi.fn(async () => posts),
      })),
    }));

    const { listAllPosts } = await import("./blog");
    const results = await listAllPosts({});
    expect(results).toHaveLength(3);
  });

  it("filters by status when provided", async () => {
    const draftPost = makePost({ status: "draft" });
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(async () => [draftPost]),
        })),
        orderBy: vi.fn(async () => [draftPost]),
      })),
    }));

    const { listAllPosts } = await import("./blog");
    const results = await listAllPosts({ status: "draft" });
    expect(results[0].status).toBe("draft");
  });

  it("filters by category when provided", async () => {
    const cuidadosPost = makePost({ category: "cuidados" });
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(async () => [cuidadosPost]),
        })),
        orderBy: vi.fn(async () => [cuidadosPost]),
      })),
    }));

    const { listAllPosts } = await import("./blog");
    const results = await listAllPosts({ category: "cuidados" });
    expect(results[0].category).toBe("cuidados");
  });
});

describe("getPostById (6.1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns draft and archived posts (no status filter)", async () => {
    const draftPost = makePost({ status: "draft" });
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [draftPost]),
      })),
    }));

    const { getPostById } = await import("./blog");
    const result = await getPostById("post-1");
    expect(result?.status).toBe("draft");
  });

  it("returns null when post not found", async () => {
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => []),
      })),
    }));

    const { getPostById } = await import("./blog");
    const result = await getPostById("nonexistent");
    expect(result).toBeNull();
  });

  it("returns post with relatedProductIds", async () => {
    const post = makePost({ status: "published" });
    let callCount = 0;
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => {
          callCount++;
          if (callCount === 1) return [post];
          return [{ productId: "prod-1" }, { productId: "prod-2" }];
        }),
      })),
    }));

    const { getPostById } = await import("./blog");
    const result = await getPostById("post-1");
    expect(result).not.toBeNull();
    expect(result?.relatedProductIds).toBeDefined();
  });
});

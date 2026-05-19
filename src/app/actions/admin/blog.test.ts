import { vi, describe, it, expect, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockRedirect = vi.mocked(redirect);
const mockRevalidatePath = vi.mocked(revalidatePath);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const adminUser = {
  id: "admin-user",
  email: "admin@test.cl",
  name: "Admin",
  role: "admin" as const,
  storeId: null,
  isDemoSeed: false,
};

const customerUser = { ...adminUser, role: "customer" as const };

function makeCreatePayload(overrides: Record<string, unknown> = {}) {
  return {
    slug: "cuidados-para-perros",
    title: "Cuidados para perros",
    excerpt: "Todo lo que necesitas saber.",
    bodyMarkdown: "# Cuidados\n\nAquí el contenido.",
    heroImageUrl: "https://example.com/hero.jpg",
    category: "cuidados",
    species: ["dog"],
    tags: ["perros"],
    authorName: "Dr. Martínez",
    status: "draft",
    relatedProductIds: [],
    ...overrides,
  };
}

const getActions = async () => {
  const m = await import("./blog");
  return m;
};

// ---------------------------------------------------------------------------
// createBlogPost
// ---------------------------------------------------------------------------
describe("createBlogPost (4.1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => []),
      })),
    }));
    (db as AnyDb).transaction = vi.fn(async (cb: (tx: AnyDb) => Promise<unknown>) => cb(db as AnyDb));
    (db as AnyDb).insert = vi.fn(() => ({ values: vi.fn(async () => ({})) }));
  });

  it("redirects to / when user is not admin (requireAdmin guard)", async () => {
    mockGetCurrentUser.mockResolvedValue(customerUser);
    const { createBlogPost } = await getActions();
    await expect(createBlogPost(makeCreatePayload())).rejects.toThrow("REDIRECT:/");
    expect(mockRedirect).toHaveBeenCalledWith("/");
  });

  it("redirects to / when user is null", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const { createBlogPost } = await getActions();
    await expect(createBlogPost(makeCreatePayload())).rejects.toThrow("REDIRECT:/");
  });

  it("returns { ok: false } on Zod validation failure", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);
    const { createBlogPost } = await getActions();
    const result = await createBlogPost({});
    expect(result).toMatchObject({ ok: false });
  });

  it("auto-generates slug from title when slug is blank", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);
    const insertMock = vi.fn(() => ({ values: vi.fn(async () => ({})) }));
    (db as AnyDb).insert = insertMock;
    (db as AnyDb).transaction = vi.fn(async (cb) => cb({ insert: insertMock } as AnyDb));
    const { createBlogPost } = await getActions();
    const result = await createBlogPost(makeCreatePayload({ slug: "" }));
    // Auto-slug from title "Cuidados para perros" → "cuidados-para-perros"
    expect(result).toMatchObject({ ok: true });
  });

  it("returns { ok: false } with slug error when slug already exists", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);
    // Mock select to return an existing row (slug collision)
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [{ id: "existing-post" }]),
      })),
    }));
    const { createBlogPost } = await getActions();
    const result = await createBlogPost(makeCreatePayload({ slug: "cuidados-para-perros" }));
    expect(result).toMatchObject({ ok: false });
  });

  it("inserts join rows when relatedProductIds is provided", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);
    const insertMock = vi.fn(() => ({ values: vi.fn(async () => ({})) }));
    (db as AnyDb).insert = insertMock;
    (db as AnyDb).transaction = vi.fn(async (cb) =>
      cb({ insert: insertMock } as AnyDb),
    );
    const { createBlogPost } = await getActions();
    await createBlogPost(makeCreatePayload({ relatedProductIds: ["prod-1", "prod-2"] }));
    // At least 2 insert calls: one for blog_posts, one for blog_post_products
    expect(insertMock).toHaveBeenCalledTimes(2);
  });

  it("revalidates /admin/blog and /blog on success", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);
    const insertMock = vi.fn(() => ({ values: vi.fn(async () => ({})) }));
    (db as AnyDb).insert = insertMock;
    (db as AnyDb).transaction = vi.fn(async (cb) => cb({ insert: insertMock } as AnyDb));
    const { createBlogPost } = await getActions();
    await createBlogPost(makeCreatePayload());
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/blog");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/blog");
  });
});

// ---------------------------------------------------------------------------
// updateBlogPost (4.3)
// ---------------------------------------------------------------------------
describe("updateBlogPost (4.3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => []),
      })),
    }));
    (db as AnyDb).transaction = vi.fn(async (cb: (tx: AnyDb) => Promise<unknown>) => cb(db as AnyDb));
    (db as AnyDb).insert = vi.fn(() => ({ values: vi.fn(async () => ({})) }));
    (db as AnyDb).update = vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => ({})) })) }));
    (db as AnyDb).delete = vi.fn(() => ({ where: vi.fn(async () => ({})) }));
  });

  function makeUpdatePayload(overrides: Record<string, unknown> = {}) {
    return {
      id: "post-123",
      slug: "cuidados-para-perros-actualizado",
      title: "Cuidados para perros actualizado",
      excerpt: "Extracto actualizado.",
      bodyMarkdown: "# Actualizado",
      category: "cuidados",
      authorName: "Dr. López",
      relatedProductIds: [],
      ...overrides,
    };
  }

  it("slug-unique check allows same slug for self (S-ACTION-4)", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);
    // The action uses ne(blogPosts.id, data.id) — when slug only belongs to self,
    // the WHERE slug=$slug AND id != $id query returns no rows (empty).
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => []),
      })),
    }));
    const updateMock = vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => ({})) })) }));
    const deleteMock = vi.fn(() => ({ where: vi.fn(async () => ({})) }));
    (db as AnyDb).update = updateMock;
    (db as AnyDb).delete = deleteMock;
    (db as AnyDb).transaction = vi.fn(async (cb) =>
      cb({ update: updateMock, delete: deleteMock, insert: vi.fn(() => ({ values: vi.fn(async () => ({})) })) } as AnyDb),
    );
    const { updateBlogPost } = await getActions();
    const result = await updateBlogPost(makeUpdatePayload());
    expect(result).toMatchObject({ ok: true });
  });

  it("returns { ok: false } when slug already taken by another post", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);
    // Slug exists for DIFFERENT post
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [{ id: "other-post-abc" }]),
      })),
    }));
    const { updateBlogPost } = await getActions();
    const result = await updateBlogPost(makeUpdatePayload({ id: "post-123" }));
    expect(result).toMatchObject({ ok: false });
  });

  it("delete-then-insert join rows inside transaction (S-ACTION-9)", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);
    const insertMock = vi.fn(() => ({ values: vi.fn(async () => ({})) }));
    const deleteMock = vi.fn(() => ({ where: vi.fn(async () => ({})) }));
    const updateMock = vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => ({})) })) }));
    (db as AnyDb).transaction = vi.fn(async (cb) =>
      cb({ insert: insertMock, delete: deleteMock, update: updateMock } as AnyDb),
    );
    const { updateBlogPost } = await getActions();
    await updateBlogPost(makeUpdatePayload({ relatedProductIds: ["prod-1"] }));
    expect(deleteMock).toHaveBeenCalled();
    expect(insertMock).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// publishBlogPost (4.5)
// ---------------------------------------------------------------------------
describe("publishBlogPost (4.5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db as AnyDb).update = vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => ({})) })) }));
  });

  it("sets status=published", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);
    const updateMock = vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => ({})) })) }));
    (db as AnyDb).update = updateMock;
    const { publishBlogPost } = await getActions();
    await publishBlogPost({ id: "post-1" });
    expect(updateMock).toHaveBeenCalled();
  });

  it("sets publishedAt when null (S-ACTION-5)", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);
    let capturedSet: Record<string, unknown> = {};
    const updateMock = vi.fn(() => ({
      set: vi.fn((data: Record<string, unknown>) => {
        capturedSet = data;
        return { where: vi.fn(async () => ({})) };
      }),
    }));
    (db as AnyDb).update = updateMock;
    const { publishBlogPost } = await getActions();
    await publishBlogPost({ id: "post-1", currentPublishedAt: null });
    expect(capturedSet.status).toBe("published");
    expect(capturedSet.publishedAt).toBeDefined();
  });

  it("preserves existing publishedAt on re-publish (S-ACTION-5)", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);
    const existingDate = new Date("2026-01-01T10:00:00Z");
    let capturedSet: Record<string, unknown> = {};
    const updateMock = vi.fn(() => ({
      set: vi.fn((data: Record<string, unknown>) => {
        capturedSet = data;
        return { where: vi.fn(async () => ({})) };
      }),
    }));
    (db as AnyDb).update = updateMock;
    const { publishBlogPost } = await getActions();
    await publishBlogPost({ id: "post-1", currentPublishedAt: existingDate });
    expect(capturedSet.publishedAt).toBe(existingDate);
  });
});

// ---------------------------------------------------------------------------
// unpublishBlogPost (4.7)
// ---------------------------------------------------------------------------
describe("unpublishBlogPost (4.7)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets status=draft (S-ACTION-6)", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);
    let capturedSet: Record<string, unknown> = {};
    const updateMock = vi.fn(() => ({
      set: vi.fn((data: Record<string, unknown>) => {
        capturedSet = data;
        return { where: vi.fn(async () => ({})) };
      }),
    }));
    (db as AnyDb).update = updateMock;
    const { unpublishBlogPost } = await getActions();
    await unpublishBlogPost({ id: "post-1" });
    expect(capturedSet.status).toBe("draft");
  });

  it("does NOT include publishedAt in the update set (preserves it)", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);
    let capturedSet: Record<string, unknown> = {};
    const updateMock = vi.fn(() => ({
      set: vi.fn((data: Record<string, unknown>) => {
        capturedSet = data;
        return { where: vi.fn(async () => ({})) };
      }),
    }));
    (db as AnyDb).update = updateMock;
    const { unpublishBlogPost } = await getActions();
    await unpublishBlogPost({ id: "post-1" });
    expect(capturedSet).not.toHaveProperty("publishedAt");
  });
});

// ---------------------------------------------------------------------------
// archiveBlogPost (4.9)
// ---------------------------------------------------------------------------
describe("archiveBlogPost (4.9)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets status=archived (S-ACTION-7)", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);
    let capturedSet: Record<string, unknown> = {};
    const updateMock = vi.fn(() => ({
      set: vi.fn((data: Record<string, unknown>) => {
        capturedSet = data;
        return { where: vi.fn(async () => ({})) };
      }),
    }));
    (db as AnyDb).update = updateMock;
    const { archiveBlogPost } = await getActions();
    await archiveBlogPost({ id: "post-1" });
    expect(capturedSet.status).toBe("archived");
  });

  it("does NOT delete the row — only updates status (soft delete)", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);
    const updateMock = vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(async () => ({})) })),
    }));
    const deleteMock = vi.fn();
    (db as AnyDb).update = updateMock;
    (db as AnyDb).delete = deleteMock;
    const { archiveBlogPost } = await getActions();
    await archiveBlogPost({ id: "post-1" });
    expect(updateMock).toHaveBeenCalled();
    expect(deleteMock).not.toHaveBeenCalled();
  });
});

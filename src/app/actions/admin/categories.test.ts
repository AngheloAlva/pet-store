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

const adminUser = {
  id: "admin-user",
  email: "admin@test.cl",
  name: "Admin",
  role: "admin" as const,
  storeId: null,
  isDemoSeed: false,
};

const customerUser = {
  ...adminUser,
  role: "customer" as const,
};

// ---------------------------------------------------------------------------
// Lazy import (after mocks)
// ---------------------------------------------------------------------------
const getActions = async () => {
  const m = await import("./categories");
  return m;
};

// ---------------------------------------------------------------------------
// requireAdmin — role gate table
// ---------------------------------------------------------------------------
describe("requireAdmin — categories actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const nonAdminActions = [
    { name: "createCategory", args: [{}] as unknown[] },
    { name: "updateCategory", args: ["id-1", {}] as unknown[] },
    { name: "deleteCategory", args: ["id-1"] as unknown[] },
    { name: "reorderCategories", args: [["id-1"]] as unknown[] },
  ];

  for (const { name, args } of nonAdminActions) {
    it(`${name}: redirects to / when user is not admin`, async () => {
      mockGetCurrentUser.mockResolvedValue(customerUser);
      const actions = await getActions();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect((actions as any)[name](...args)).rejects.toThrow(/REDIRECT:\//);
      expect(mockRedirect).toHaveBeenCalledWith("/");
    });
  }
});

// ---------------------------------------------------------------------------
// createCategory
// ---------------------------------------------------------------------------
describe("createCategory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(adminUser);
    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) => cb(db as AnyDb),
    );
    (db as AnyDb).insert = vi.fn(() => ({ values: vi.fn(async () => ({})) }));
  });

  it("returns errors when name is missing", async () => {
    const { createCategory } = await getActions();
    const result = await createCategory({ slug: "test-slug" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.fieldErrors).toHaveProperty("name");
    }
  });

  it("inserts row in a transaction and revalidates on success", async () => {
    const { createCategory } = await getActions();
    const result = await createCategory({
      name: "Snacks",
      slug: "snacks",
      parentId: null,
      species: null,
    });
    expect(result.ok).toBe(true);
    expect((db as AnyDb).transaction).toHaveBeenCalledTimes(1);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/categorias");
  });

  it("does NOT call revalidatePath when transaction throws", async () => {
    (db as AnyDb).transaction = vi.fn(async () => {
      throw new Error("DB failure");
    });
    const { createCategory } = await getActions();
    await expect(
      createCategory({ name: "Snacks", slug: "snacks" }),
    ).rejects.toThrow("DB failure");
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// reorderCategories
// ---------------------------------------------------------------------------
describe("reorderCategories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(adminUser);
    const mockUpdate = vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(async () => ({})) })),
    }));
    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) =>
        cb({ update: mockUpdate } as AnyDb),
    );
    (db as AnyDb).update = mockUpdate;
  });

  it("writes order=idx for each id in a single transaction (S30)", async () => {
    const { reorderCategories } = await getActions();
    const result = await reorderCategories(["id-a", "id-b", "id-c"]);
    expect(result.ok).toBe(true);
    // transaction called exactly once
    expect((db as AnyDb).transaction).toHaveBeenCalledTimes(1);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/categorias");
  });

  it("returns error when list is empty", async () => {
    const { reorderCategories } = await getActions();
    const result = await reorderCategories([]);
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// deleteCategory
// ---------------------------------------------------------------------------
describe("deleteCategory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(adminUser);
  });

  it("returns error when category has children (S8)", async () => {
    // Mock tx.select to return a child row for categories
    const mockSelect = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [{ id: "child-id" }]),
      })),
    }));
    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) =>
        cb({ select: mockSelect } as AnyDb),
    );

    const { deleteCategory } = await getActions();
    const result = await deleteCategory("parent-id");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.formErrors[0]).toMatch(/subcategor/);
    }
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("returns error when category has linked products (S9)", async () => {
    // First select (children) returns empty, second (products) returns row
    let callCount = 0;
    const mockSelect = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => {
          callCount++;
          if (callCount === 1) return []; // no children
          return [{ productId: "p-1" }]; // has products
        }),
      })),
    }));
    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) =>
        cb({ select: mockSelect } as AnyDb),
    );

    const { deleteCategory } = await getActions();
    const result = await deleteCategory("cat-id");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.formErrors[0]).toMatch(/productos/);
    }
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("deletes safely when no FK references (S10)", async () => {
    const mockDelete = vi.fn(() => ({ where: vi.fn(async () => ({})) }));
    const mockSelect = vi.fn(() => ({
      from: vi.fn(() => ({ where: vi.fn(async () => []) })),
    }));
    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) =>
        cb({ select: mockSelect, delete: mockDelete } as AnyDb),
    );

    const { deleteCategory } = await getActions();
    const result = await deleteCategory("cat-id");
    expect(result.ok).toBe(true);
    expect(mockDelete).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/categorias");
  });
});

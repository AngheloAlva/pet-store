import { vi, describe, it, expect, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { revalidatePath } from "next/cache";
import {
  stockLevels,
  productVariants,
  productImages,
  productCategories,
  products,
} from "@/db/schema";

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

// ---------------------------------------------------------------------------
// Fixture helper
// ---------------------------------------------------------------------------
function makeProductPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Test Product",
    slug: "test-product",
    brandId: "brand-1",
    description: "A test product description",
    shortDescription: null,
    species: ["dog"] as const,
    tags: [],
    targetSize: null,
    lifeStage: null,
    ingredients: null,
    featured: false,
    categoryIds: ["cat-1"],
    images: [{ url: "https://example.com/img.jpg", alt: "Test" }],
    variants: [
      {
        sku: "TEST-001",
        name: "Test Variant",
        quantityValue: 1,
        quantityUnit: "kg" as const,
        priceAmount: 9990,
        compareAtAmount: null,
        barcode: null,
        stockByStore: { "store-1": "in_stock" as const },
      },
    ],
    ...overrides,
  };
}

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
// Lazy import of actions (must be after mocks are declared)
// ---------------------------------------------------------------------------
const getActions = async () => {
  const m = await import("./products");
  return m;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any;

describe("createProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset db mock chain
    (db as AnyDb).transaction = vi.fn(async (cb: (tx: AnyDb) => Promise<unknown>) => cb(db as AnyDb));
    (db as AnyDb).insert = vi.fn(() => ({ values: vi.fn(async () => ({})) }));
  });

  it("redirects to / when user is not admin", async () => {
    mockGetCurrentUser.mockResolvedValue(customerUser);
    const { createProduct } = await getActions();
    await expect(createProduct(makeProductPayload())).rejects.toThrow("REDIRECT:/");
    expect(mockRedirect).toHaveBeenCalledWith("/");
  });

  it("redirects to / when user is null", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const { createProduct } = await getActions();
    await expect(createProduct(makeProductPayload())).rejects.toThrow("REDIRECT:/");
  });

  it("returns { ok: false, errors } on validation failure (missing images)", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);
    const { createProduct } = await getActions();
    const result = await createProduct(makeProductPayload({ images: [] }));
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) {
      expect(result.errors.fieldErrors).toBeDefined();
    }
  });

  it("calls db.transaction once with correct insert order on happy path", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);

    const insertMock = vi.fn(() => ({ values: vi.fn(async () => ({})) }));
    (db as AnyDb).insert = insertMock;

    const txStub = {
      insert: insertMock,
    };
    (db as AnyDb).transaction = vi.fn(async (cb) => cb(txStub as AnyDb));

    const { createProduct } = await getActions();
    const result = await createProduct(makeProductPayload());

    expect(result).toMatchObject({ ok: true });
    expect((db as AnyDb).transaction).toHaveBeenCalledTimes(1);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/productos");
  });

  it("does NOT persist partial state when inner insert throws", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);

    let insertCallCount = 0;
    const insertMock = vi.fn(() => ({
      values: vi.fn(async () => {
        insertCallCount++;
        // throw on the productVariants insert (3rd insert: products, productCategories, then variants)
        if (insertCallCount >= 3) {
          throw new Error("DB error on variants");
        }
        return {};
      }),
    }));

    const txStub = {
      insert: insertMock,
    };
    (db as AnyDb).transaction = vi.fn(async (cb) => {
      await cb(txStub as AnyDb);
    });

    const { createProduct } = await getActions();
    const payload = makeProductPayload();

    // transaction throws because inner insert throws
    (db as AnyDb).transaction = vi.fn(async (cb) => {
      try {
        await cb(txStub as AnyDb);
      } catch (e) {
        throw e;
      }
    });

    await expect(createProduct(payload)).rejects.toThrow("DB error on variants");
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});

describe("updateProduct", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db as AnyDb).transaction = vi.fn(async (cb) => cb(db as AnyDb));
  });

  it("returns { ok: false, errors } with 'Producto no encontrado' when product doesn't exist", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);

    // Simulate: tx.select returns empty, meaning product not found
    const selectMock = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => []),
      })),
    }));
    (db as AnyDb).transaction = vi.fn(async (cb) => {
      const txStub = {
        select: selectMock,
        insert: vi.fn(() => ({ values: vi.fn(async () => ({})) })),
        update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => ({})) })) })),
        delete: vi.fn(() => ({ where: vi.fn(async () => ({})) })),
      };
      return cb(txStub as AnyDb);
    });

    const { updateProduct } = await getActions();
    const result = await updateProduct("nonexistent-id", makeProductPayload({ id: "nonexistent-id" }));

    expect(result).toMatchObject({ ok: false });
    if (!result.ok) {
      expect(result.errors.formErrors).toContain("Producto no encontrado");
    }
  });
});

describe("deleteProduct", () => {
  it("deletes in order: stock_levels → variants → images → categories → product inside txn", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);

    // Track which table object each delete call received (by reference)
    const deletedTables: unknown[] = [];
    const deleteMock = vi.fn((table: unknown) => {
      deletedTables.push(table);
      return { where: vi.fn(async () => ({})) };
    });
    const selectMock = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [{ id: "v1" }]),
      })),
    }));

    (db as AnyDb).transaction = vi.fn(async (cb) => {
      const txStub = {
        select: selectMock,
        delete: deleteMock,
      };
      return cb(txStub as AnyDb);
    });

    const { deleteProduct } = await getActions();
    await deleteProduct("product-1");

    // Assert FK-safe delete sequence: stock_levels → product_variants → product_images → product_categories → products
    expect(deletedTables).toHaveLength(5);
    expect(deletedTables[0]).toBe(stockLevels);
    expect(deletedTables[1]).toBe(productVariants);
    expect(deletedTables[2]).toBe(productImages);
    expect(deletedTables[3]).toBe(productCategories);
    expect(deletedTables[4]).toBe(products);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/productos");
  });
});

describe("bulkDeleteProducts", () => {
  it("returns count of deleted products", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);

    (db as AnyDb).transaction = vi.fn(async (cb) => {
      const txStub = {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(async () => [{ id: "v1" }, { id: "v2" }]),
          })),
        })),
        delete: vi.fn(() => ({ where: vi.fn(async () => ({})) })),
      };
      return cb(txStub as AnyDb);
    });

    const { bulkDeleteProducts } = await getActions();
    const result = await bulkDeleteProducts(["product-1", "product-2"]);

    expect(result).toMatchObject({ ok: true, deleted: 2 });
  });
});

describe("bulkToggleFeatured", () => {
  it("calls db.update once with inArray", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);

    const updateSetMock = vi.fn(() => ({ where: vi.fn(async () => ({})) }));
    const updateMock = vi.fn(() => ({ set: updateSetMock }));

    (db as AnyDb).transaction = vi.fn(async (cb) => {
      const txStub = {
        update: updateMock,
      };
      return cb(txStub as AnyDb);
    });

    const { bulkToggleFeatured } = await getActions();
    await bulkToggleFeatured(["p1", "p2"], true);

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateSetMock).toHaveBeenCalledWith({ featured: true });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/productos");
  });
});

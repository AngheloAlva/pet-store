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

// Default valid schedule for tests
const validSchedule = {
  mon: { open: "09:00", close: "18:00" },
  tue: { open: "09:00", close: "18:00" },
  wed: { open: "09:00", close: "18:00" },
  thu: { open: "09:00", close: "18:00" },
  fri: { open: "09:00", close: "18:00" },
  sat: { closed: true },
  sun: { closed: true },
};

function makeStorePayload(overrides: Record<string, unknown> = {}) {
  return {
    name: "Sucursal Test",
    slug: "sucursal-test",
    address: "Av. Test 123",
    commune: "Santiago",
    phone: "+56 2 123 4567",
    lat: -33.45,
    lng: -70.65,
    schedule: validSchedule,
    services: ["Veterinaria"],
    reference: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Lazy import
// ---------------------------------------------------------------------------
const getActions = async () => {
  const m = await import("./stores");
  return m;
};

// ---------------------------------------------------------------------------
// requireAdmin — role gate table (S29)
// ---------------------------------------------------------------------------
describe("requireAdmin — stores actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const nonAdminActions = [
    { name: "createStore", args: [{}] as unknown[] },
    { name: "updateStore", args: ["id-1", {}] as unknown[] },
    { name: "deleteStore", args: ["id-1"] as unknown[] },
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
// createStore
// ---------------------------------------------------------------------------
describe("createStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(adminUser);
    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) => cb(db as AnyDb),
    );
    (db as AnyDb).insert = vi.fn(() => ({ values: vi.fn(async () => ({})) }));
  });

  it("validates schedule — invalid time format returns error (S32)", async () => {
    const { createStore } = await getActions();
    const result = await createStore(
      makeStorePayload({
        schedule: {
          ...validSchedule,
          mon: { open: "25:00", close: "18:00" }, // invalid time
        },
      }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(JSON.stringify(result.errors)).toMatch(/Formato HH:MM/);
    }
  });

  it("inserts row with services array and schedule jsonb", async () => {
    const { createStore } = await getActions();
    const result = await createStore(makeStorePayload());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.id).toBeDefined();
    }
    expect((db as AnyDb).transaction).toHaveBeenCalledTimes(1);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/sucursales");
  });

  it("does NOT call revalidatePath when transaction throws", async () => {
    (db as AnyDb).transaction = vi.fn(async () => {
      throw new Error("DB failure");
    });
    const { createStore } = await getActions();
    await expect(createStore(makeStorePayload())).rejects.toThrow("DB failure");
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// updateStore
// ---------------------------------------------------------------------------
describe("updateStore", () => {
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

  it("updates row and revalidates list + edit page", async () => {
    const { updateStore } = await getActions();
    const result = await updateStore("store-id-1", makeStorePayload());
    expect(result.ok).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/sucursales");
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      "/admin/sucursales/store-id-1/editar",
      "page",
    );
  });
});

// ---------------------------------------------------------------------------
// deleteStore
// ---------------------------------------------------------------------------
describe("deleteStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(adminUser);
  });

  it("returns error when stockLevels reference the store (S17)", async () => {
    const mockSelect = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [{ variantId: "v-1" }]),
      })),
    }));
    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) =>
        cb({ select: mockSelect } as AnyDb),
    );

    const { deleteStore } = await getActions();
    const result = await deleteStore("store-id-1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.formErrors[0]).toMatch(/stock/);
    }
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("deletes when no stock references (S18)", async () => {
    const mockDelete = vi.fn(() => ({ where: vi.fn(async () => ({})) }));
    const mockSelect = vi.fn(() => ({
      from: vi.fn(() => ({ where: vi.fn(async () => []) })),
    }));
    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) =>
        cb({ select: mockSelect, delete: mockDelete } as AnyDb),
    );

    const { deleteStore } = await getActions();
    const result = await deleteStore("store-id-1");
    expect(result.ok).toBe(true);
    expect(mockDelete).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/sucursales");
  });
});

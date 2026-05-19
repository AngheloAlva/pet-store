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
  id: "user-admin-demo",
  email: "admin@test.cl",
  name: "Admin",
  role: "admin" as const,
  storeId: null,
  isDemoSeed: false,
};

const customerUser = { ...adminUser, role: "customer" as const };

// ---------------------------------------------------------------------------
// Lazy import
// ---------------------------------------------------------------------------
const getActions = async () => {
  const m = await import("./services");
  return m;
};

// ---------------------------------------------------------------------------
// requireAdmin guard
// ---------------------------------------------------------------------------
describe("requireAdmin guard — services", () => {
  beforeEach(() => vi.clearAllMocks());

  const nonAdminActions = [
    { name: "createService", args: [{}] as unknown[] },
    { name: "updateService", args: ["id", {}] as unknown[] },
    { name: "deleteService", args: ["id"] as unknown[] },
  ];

  for (const { name, args } of nonAdminActions) {
    it(`${name}: redirects to / for non-admin`, async () => {
      mockGetCurrentUser.mockResolvedValue(customerUser);
      const actions = await getActions();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect((actions as any)[name](...args)).rejects.toThrow(/REDIRECT:\//);
      expect(mockRedirect).toHaveBeenCalledWith("/");
    });
  }
});

// ---------------------------------------------------------------------------
// createService
// ---------------------------------------------------------------------------
describe("createService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(adminUser);
    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) => cb(db as AnyDb),
    );
    (db as AnyDb).insert = vi.fn(() => ({ values: vi.fn(async () => ({})) }));
  });

  it("returns validation error when name is missing", async () => {
    const { createService } = await getActions();
    const result = await createService({ slug: "bath-trim", durationMin: 60, priceCents: 5000 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.fieldErrors).toHaveProperty("name");
    }
  });

  it("S-ACTION-1: returns slug uniqueness error when DB throws unique violation", async () => {
    (db as AnyDb).transaction = vi.fn(async () => {
      const err = new Error("duplicate key value violates unique constraint");
      (err as Error & { code: string }).code = "23505";
      throw err;
    });
    const { createService } = await getActions();
    const result = await createService({
      name: "Baño y corte",
      slug: "bath-trim",
      durationMin: 60,
      priceCents: 5000,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.formErrors[0]).toMatch(/slug/i);
    }
  });

  it("inserts row and revalidates on success", async () => {
    const { createService } = await getActions();
    const result = await createService({
      name: "Baño y corte",
      slug: "bath-trim",
      durationMin: 60,
      priceCents: 5000,
    });
    expect(result.ok).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/servicios");
  });
});

// ---------------------------------------------------------------------------
// deleteService — S-ACTION-2: blocked by existing appointments
// ---------------------------------------------------------------------------
describe("deleteService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(adminUser);
  });

  it("S-ACTION-2: returns error when service has existing appointments", async () => {
    const mockSelect = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [{ id: "appt-1" }]), // has appointments
      })),
    }));
    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) =>
        cb({ select: mockSelect } as AnyDb),
    );

    const { deleteService } = await getActions();
    const result = await deleteService("svc-1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.formErrors[0]).toMatch(/citas/i);
    }
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("deletes safely when no appointments reference the service", async () => {
    const mockDelete = vi.fn(() => ({ where: vi.fn(async () => ({})) }));
    const mockSelect = vi.fn(() => ({
      from: vi.fn(() => ({ where: vi.fn(async () => []) })),
    }));
    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) =>
        cb({ select: mockSelect, delete: mockDelete } as AnyDb),
    );

    const { deleteService } = await getActions();
    const result = await deleteService("svc-1");
    expect(result.ok).toBe(true);
    expect(mockDelete).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/servicios");
  });
});

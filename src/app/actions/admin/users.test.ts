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

const nonDemoUser = {
  id: "user-normal",
  email: "normal@test.cl",
  name: "Normal User",
  rut: null,
  phone: null,
  role: "customer",
  storeId: null,
  isDemoSeed: false,
  createdAt: "2024-01-01",
};

const demoUser = {
  ...nonDemoUser,
  id: "user-demo",
  isDemoSeed: true,
};

// ---------------------------------------------------------------------------
// Lazy import
// ---------------------------------------------------------------------------
const getActions = async () => {
  const m = await import("./users");
  return m;
};

// ---------------------------------------------------------------------------
// requireAdmin — role gate (S29)
// ---------------------------------------------------------------------------
describe("requireAdmin — users actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const nonAdminActions = [
    { name: "updateUserIdentity", args: ["id-1", {}] as unknown[] },
    { name: "deleteUser", args: ["id-1"] as unknown[] },
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
// updateUserIdentity
// ---------------------------------------------------------------------------
describe("updateUserIdentity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(adminUser);
  });

  it("returns error for invalid RUT", async () => {
    const mockSelect = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [nonDemoUser]),
      })),
    }));
    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) =>
        cb({ select: mockSelect } as AnyDb),
    );

    const { updateUserIdentity } = await getActions();
    const result = await updateUserIdentity("user-normal", {
      name: "Normal User",
      email: "normal@test.cl",
      rut: "abc-invalid",
      phone: null,
      role: "customer",
      storeId: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(JSON.stringify(result.errors)).toMatch(/RUT inválido/);
    }
  });

  it("returns error when target user isDemoSeed (S21)", async () => {
    const mockSelect = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [demoUser]),
      })),
    }));
    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) =>
        cb({ select: mockSelect } as AnyDb),
    );

    const { updateUserIdentity } = await getActions();
    const result = await updateUserIdentity("user-demo", {
      name: "Demo User",
      email: "demo@test.cl",
      rut: null,
      phone: null,
      role: "customer",
      storeId: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.formErrors[0]).toMatch(/demo/i);
    }
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("updates row when non-demo user (S23)", async () => {
    const mockUpdate = vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(async () => ({})) })),
    }));
    const mockSelect = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [nonDemoUser]),
      })),
    }));
    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) =>
        cb({ select: mockSelect, update: mockUpdate } as AnyDb),
    );

    const { updateUserIdentity } = await getActions();
    const result = await updateUserIdentity("user-normal", {
      name: "Normal User Updated",
      email: "normal@test.cl",
      rut: null,
      phone: null,
      role: "customer",
      storeId: null,
    });
    expect(result.ok).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/usuarios");
    expect(mockRevalidatePath).toHaveBeenCalledWith(
      "/admin/usuarios/user-normal",
      "page",
    );
  });
});

// ---------------------------------------------------------------------------
// deleteUser
// ---------------------------------------------------------------------------
describe("deleteUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(adminUser);
  });

  it("returns error for demo seed (S25)", async () => {
    const mockSelect = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [demoUser]),
      })),
    }));
    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) =>
        cb({ select: mockSelect } as AnyDb),
    );

    const { deleteUser } = await getActions();
    const result = await deleteUser("user-demo");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.formErrors[0]).toMatch(/demo/i);
    }
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("deletes non-demo user (S24)", async () => {
    const mockDelete = vi.fn(() => ({ where: vi.fn(async () => ({})) }));
    const mockSelect = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [nonDemoUser]),
      })),
    }));
    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) =>
        cb({ select: mockSelect, delete: mockDelete } as AnyDb),
    );

    const { deleteUser } = await getActions();
    const result = await deleteUser("user-normal");
    expect(result.ok).toBe(true);
    expect(mockDelete).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/usuarios");
  });
});

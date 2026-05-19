import { vi, describe, it, expect, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { revalidatePath } from "next/cache";

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
  email: "admin@demo.cl",
  name: "Admin Demo",
  role: "admin" as const,
  storeId: null,
  isDemoSeed: true,
};

const camilaUser = {
  id: "user-camila-demo",
  email: "camila@demo.cl",
  name: "Camila Rojas",
  role: "customer" as const,
  storeId: null,
  isDemoSeed: true,
};

const getActions = async () => {
  const m = await import("@/app/actions/admin/pets");
  return m;
};

// ---------------------------------------------------------------------------
// requireAdmin gate
// ---------------------------------------------------------------------------
describe("requireAdmin — admin pet actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createPet: redirects non-admin to /", async () => {
    mockGetCurrentUser.mockResolvedValue(camilaUser);
    const actions = await getActions();
    await expect(
      actions.createPet({ userId: "user-camila-demo", name: "Tobi", species: "dog" }),
    ).rejects.toThrow(/REDIRECT:\//);
    expect(mockRedirect).toHaveBeenCalledWith("/");
  });

  it("updatePet: redirects non-admin to /", async () => {
    mockGetCurrentUser.mockResolvedValue(camilaUser);
    const actions = await getActions();
    await expect(
      actions.updatePet("pet-tobi", { name: "Tobi", species: "dog" }),
    ).rejects.toThrow(/REDIRECT:\//);
  });

  it("deletePet: redirects non-admin to /", async () => {
    mockGetCurrentUser.mockResolvedValue(camilaUser);
    const actions = await getActions();
    await expect(actions.deletePet("pet-tobi")).rejects.toThrow(/REDIRECT:\//);
  });
});

// ---------------------------------------------------------------------------
// Admin cross-user update (S-ACTION-2)
// ---------------------------------------------------------------------------
describe("admin updatePet — cross-user (S-ACTION-2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(adminUser);
  });

  it("admin can update any pet regardless of userId", async () => {
    const mockUpdate = vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(async () => ({})) })),
    }));
    (db as AnyDb).update = mockUpdate;

    const actions = await getActions();
    const result = await actions.updatePet("pet-tobi-camila", {
      name: "Tobi",
      species: "dog",
      breed: "Labrador",
    });

    expect(result.ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/mascotas");
  });

  it("returns validation error for invalid input", async () => {
    const actions = await getActions();
    const result = await actions.updatePet("pet-tobi-camila", {
      name: "",
      species: "dog",
    });
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Admin createPet
// ---------------------------------------------------------------------------
describe("admin createPet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(adminUser);
    (db as AnyDb).insert = vi.fn(() => ({ values: vi.fn(async () => ({})) }));
  });

  it("admin can create pet for any user", async () => {
    const actions = await getActions();
    const result = await actions.createPet({
      userId: "user-camila-demo",
      name: "Tobi",
      species: "dog",
    });
    expect(result.ok).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/mascotas");
  });
});

// ---------------------------------------------------------------------------
// Admin deletePet (soft delete)
// ---------------------------------------------------------------------------
describe("admin deletePet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(adminUser);
  });

  it("soft deletes (active=false), does NOT hard delete", async () => {
    const mockUpdate = vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(async () => ({})) })),
    }));
    const mockDelete = vi.fn();
    (db as AnyDb).update = mockUpdate;
    (db as AnyDb).delete = mockDelete;

    const actions = await getActions();
    const result = await actions.deletePet("pet-tobi");
    expect(result.ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/mascotas");
  });
});

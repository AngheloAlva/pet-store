import { vi, describe, it, expect, beforeEach } from "vitest";
import { getCurrentUser } from "@/lib/session";
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
const mockRevalidatePath = vi.mocked(revalidatePath);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any;

const camilaUser = {
  id: "user-camila-demo",
  email: "camila@demo.cl",
  name: "Camila Rojas",
  role: "customer" as const,
  storeId: null,
  isDemoSeed: true,
};

const otherUser = {
  id: "user-other",
  email: "other@demo.cl",
  name: "Other User",
  role: "customer" as const,
  storeId: null,
  isDemoSeed: false,
};

const adminUser = {
  id: "user-admin-demo",
  email: "admin@demo.cl",
  name: "Admin Demo",
  role: "admin" as const,
  storeId: null,
  isDemoSeed: true,
};

const getActions = async () => {
  const m = await import("@/app/actions/pets");
  return m;
};

describe("createPet (client)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db as AnyDb).insert = vi.fn(() => ({ values: vi.fn(async () => ({})) }));
    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) => cb(db as AnyDb),
    );
  });

  it("returns auth error when user is not authenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const { createPet } = await getActions();
    const result = await createPet({
      userId: "user-camila-demo",
      name: "Tobi",
      species: "dog",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/auth/i);
    expect((db as AnyDb).insert).not.toHaveBeenCalled();
  });

  it("returns auth error when user tries to create pet for another user (S-ACTION-1)", async () => {
    mockGetCurrentUser.mockResolvedValue(camilaUser);
    const { createPet } = await getActions();
    const result = await createPet({
      userId: "user-other",
      name: "Luna",
      species: "cat",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/auth/i);
    expect((db as AnyDb).insert).not.toHaveBeenCalled();
  });

  it("admin can create pet for any user", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);
    (db as AnyDb).insert = vi.fn(() => ({ values: vi.fn(async () => ({})) }));
    const { createPet } = await getActions();
    const result = await createPet({
      userId: "user-camila-demo",
      name: "Tobi",
      species: "dog",
    });
    expect(result.ok).toBe(true);
  });

  it("returns validation error for invalid species", async () => {
    mockGetCurrentUser.mockResolvedValue(camilaUser);
    const { createPet } = await getActions();
    const result = await createPet({
      userId: "user-camila-demo",
      name: "Hamster",
      species: "hamster",
    });
    expect(result.ok).toBe(false);
  });

  it("inserts and revalidates on success", async () => {
    mockGetCurrentUser.mockResolvedValue(camilaUser);
    const { createPet } = await getActions();
    const result = await createPet({
      userId: "user-camila-demo",
      name: "Tobi",
      species: "dog",
    });
    expect(result.ok).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/cuenta/mascotas");
  });
});

describe("deletePet (client) — soft delete only (S-ACTION-3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets active=false (soft delete), does NOT hard delete", async () => {
    mockGetCurrentUser.mockResolvedValue(camilaUser);

    // Mock select to return a pet owned by camila
    const mockUpdate = vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(async () => ({})) })),
    }));
    const mockSelect = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [
          { id: "pet-tobi", userId: "user-camila-demo", active: true },
        ]),
      })),
    }));
    const mockDelete = vi.fn();
    (db as AnyDb).select = mockSelect;
    (db as AnyDb).update = mockUpdate;
    (db as AnyDb).delete = mockDelete;

    const { deletePet } = await getActions();
    const result = await deletePet("pet-tobi");
    expect(result.ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
    // Hard delete MUST NOT be called
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/cuenta/mascotas");
  });

  it("returns auth error when user does not own the pet", async () => {
    mockGetCurrentUser.mockResolvedValue(otherUser);

    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [
          { id: "pet-tobi", userId: "user-camila-demo", active: true },
        ]),
      })),
    }));

    const { deletePet } = await getActions();
    const result = await deletePet("pet-tobi");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/auth/i);
  });
});

describe("updatePet (client)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates own pet successfully", async () => {
    mockGetCurrentUser.mockResolvedValue(camilaUser);

    const mockUpdate = vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(async () => ({})) })),
    }));
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [
          { id: "pet-tobi", userId: "user-camila-demo", active: true },
        ]),
      })),
    }));
    (db as AnyDb).update = mockUpdate;

    const { updatePet } = await getActions();
    const result = await updatePet("pet-tobi", {
      name: "Tobi Updated",
      species: "dog",
    });
    expect(result.ok).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/cuenta/mascotas");
  });

  it("returns auth error when updating another user's pet", async () => {
    mockGetCurrentUser.mockResolvedValue(otherUser);

    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [
          { id: "pet-tobi", userId: "user-camila-demo", active: true },
        ]),
      })),
    }));

    const { updatePet } = await getActions();
    const result = await updatePet("pet-tobi", { name: "Hack", species: "dog" });
    expect(result.ok).toBe(false);
  });
});

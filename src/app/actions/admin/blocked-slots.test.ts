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
vi.mock("@/lib/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

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

const getActions = async () => import("./blocked-slots");

describe("requireAdmin guard — blocked-slots", () => {
  beforeEach(() => vi.clearAllMocks());

  it("createBlockedSlot: redirects to / for non-admin", async () => {
    mockGetCurrentUser.mockResolvedValue(customerUser);
    const { createBlockedSlot } = await getActions();
    await expect(createBlockedSlot({})).rejects.toThrow(/REDIRECT:\//);
    expect(mockRedirect).toHaveBeenCalledWith("/");
  });
});

describe("createBlockedSlot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(adminUser);
    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) => cb(db as AnyDb),
    );
    (db as AnyDb).insert = vi.fn(() => ({ values: vi.fn(async () => ({})) }));
  });

  it("returns validation error when storeId is missing", async () => {
    const { createBlockedSlot } = await getActions();
    const result = await createBlockedSlot({
      startsAt: "2026-06-01T00:00:00.000Z",
      endsAt: "2026-06-02T00:00:00.000Z",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.fieldErrors).toHaveProperty("storeId");
    }
  });

  it("inserts row and revalidates on success", async () => {
    const { createBlockedSlot } = await getActions();
    const result = await createBlockedSlot({
      storeId: "providencia",
      serviceId: null,
      startsAt: "2026-06-01T00:00:00.000Z",
      endsAt: "2026-06-02T00:00:00.000Z",
      reason: "Feriado",
    });
    expect(result.ok).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/horarios");
  });
});

describe("deleteBlockedSlot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(adminUser);
    (db as AnyDb).delete = vi.fn(() => ({ where: vi.fn(async () => ({})) }));
  });

  it("deletes and revalidates", async () => {
    const { deleteBlockedSlot } = await getActions();
    const result = await deleteBlockedSlot("bs-1");
    expect(result.ok).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/horarios");
  });
});

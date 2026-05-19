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
const mockRevalidatePath = vi.mocked(revalidatePath);
const mockRedirect = vi.mocked(redirect);

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

const customerUser = { ...adminUser, role: "customer" as const };

const getAction = async () => import("./clear-inbox");

describe("clearInbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("S-ACTION-4b: non-admin throws (requireAdmin rejects) before any DELETE", async () => {
    mockGetCurrentUser.mockResolvedValue(customerUser);
    const mockDelete = vi.fn();
    (db as AnyDb).delete = mockDelete;

    const { clearInbox } = await getAction();
    await expect(clearInbox()).rejects.toThrow(/REDIRECT/);
    expect(mockRedirect).toHaveBeenCalledWith("/");
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("S-ACTION-4a: admin deletes all rows and revalidates", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);

    const mockDeleteChain = {
      returning: vi.fn(async () => [{ id: "e1" }, { id: "e2" }]),
    };
    const mockDelete = vi.fn(() => mockDeleteChain);
    (db as AnyDb).delete = mockDelete;

    const { clearInbox } = await getAction();
    const result = await clearInbox();

    expect(mockDelete).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/demo/inbox");
    expect(result).toMatchObject({ ok: true, count: 2 });
  });

  it("S-ACTION-4a: returns ok:true with count=0 when inbox is empty", async () => {
    mockGetCurrentUser.mockResolvedValue(adminUser);

    const mockDeleteChain = {
      returning: vi.fn(async () => []),
    };
    const mockDelete = vi.fn(() => mockDeleteChain);
    (db as AnyDb).delete = mockDelete;

    const { clearInbox } = await getAction();
    const result = await clearInbox();
    expect(result).toMatchObject({ ok: true, count: 0 });
  });
});

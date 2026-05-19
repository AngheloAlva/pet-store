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

const getActions = async () => {
  const m = await import("./schedule-configs");
  return m;
};

describe("requireAdmin guard — schedule-configs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("createScheduleConfig: redirects to / for non-admin", async () => {
    mockGetCurrentUser.mockResolvedValue(customerUser);
    const { createScheduleConfig } = await getActions();
    await expect(createScheduleConfig({})).rejects.toThrow(/REDIRECT:\//);
    expect(mockRedirect).toHaveBeenCalledWith("/");
  });
});

describe("createScheduleConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(adminUser);
    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) => cb(db as AnyDb),
    );
    (db as AnyDb).insert = vi.fn(() => ({ values: vi.fn(async () => ({})) }));
  });

  it("returns validation error when required fields are missing", async () => {
    const { createScheduleConfig } = await getActions();
    const result = await createScheduleConfig({ storeId: "providencia" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.fieldErrors).toHaveProperty("weekday");
    }
  });

  it("inserts row and revalidates on success", async () => {
    const { createScheduleConfig } = await getActions();
    const result = await createScheduleConfig({
      storeId: "providencia",
      serviceId: null,
      weekday: 1,
      startHHMM: 900,
      endHHMM: 1700,
      slotMinutes: 30,
      active: true,
    });
    expect(result.ok).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/horarios");
  });
});

describe("deleteScheduleConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(adminUser);
    (db as AnyDb).delete = vi.fn(() => ({ where: vi.fn(async () => ({})) }));
  });

  it("deletes and revalidates", async () => {
    const { deleteScheduleConfig } = await getActions();
    const result = await deleteScheduleConfig("cfg-1");
    expect(result.ok).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/horarios");
  });
});

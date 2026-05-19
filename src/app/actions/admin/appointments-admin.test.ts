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

const FUTURE_START = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1h from now
const FUTURE_END = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2h from now

const getActions = async () => import("./appointments-admin");

describe("requireAdmin guard — appointments-admin", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updateAppointment: redirects to / for non-admin", async () => {
    mockGetCurrentUser.mockResolvedValue(customerUser);
    const { updateAppointment } = await getActions();
    await expect(updateAppointment({})).rejects.toThrow(/REDIRECT:\//);
    expect(mockRedirect).toHaveBeenCalledWith("/");
  });
});

// ---------------------------------------------------------------------------
// updateAppointment — S-ADMIN-5 status transition guard
// ---------------------------------------------------------------------------
describe("updateAppointment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(adminUser);
  });

  it("S-ADMIN-5: marks appointment as attended", async () => {
    const mockSelect = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [
          { id: "appt-1", status: "scheduled", storeId: "providencia", serviceId: "svc-1" },
        ]),
      })),
    }));
    const mockUpdate = vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(async () => ({})) })),
    }));
    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) =>
        cb({ select: mockSelect, update: mockUpdate } as AnyDb),
    );

    const { updateAppointment } = await getActions();
    const result = await updateAppointment({
      appointmentId: "appt-1",
      status: "attended",
    });
    expect(result.ok).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/citas");
  });

  it("returns error for invalid status (only attended/no_show allowed)", async () => {
    const { updateAppointment } = await getActions();
    const result = await updateAppointment({
      appointmentId: "appt-1",
      status: "canceled", // not allowed via updateAppointment
    });
    expect(result.ok).toBe(false);
  });

  it("returns not_found when appointment does not exist", async () => {
    const mockSelect = vi.fn(() => ({
      from: vi.fn(() => ({ where: vi.fn(async () => []) })),
    }));
    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) =>
        cb({ select: mockSelect } as AnyDb),
    );
    const { updateAppointment } = await getActions();
    const result = await updateAppointment({
      appointmentId: "appt-missing",
      status: "attended",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("not_found");
    }
  });
});

// ---------------------------------------------------------------------------
// cancelAppointment — S-ACTION-6: admin has no time guard
// ---------------------------------------------------------------------------
describe("cancelAppointment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(adminUser);
  });

  it("S-ACTION-6: admin cancels appointment within 2h — no time guard", async () => {
    const mockSelect = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [
          {
            id: "appt-soon",
            status: "scheduled",
            // 30 min from now — would be blocked for clients
            startsAt: new Date(Date.now() + 30 * 60 * 1000),
          },
        ]),
      })),
    }));
    const mockUpdate = vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(async () => ({})) })),
    }));
    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) =>
        cb({ select: mockSelect, update: mockUpdate } as AnyDb),
    );

    const { cancelAppointment } = await getActions();
    const result = await cancelAppointment({
      appointmentId: "appt-soon",
      cancelReason: "Admin override",
    });
    expect(result.ok).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/citas");
  });

  it("returns validation error when cancelReason is missing", async () => {
    const { cancelAppointment } = await getActions();
    const result = await cancelAppointment({ appointmentId: "appt-1" });
    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// rescheduleAppointment — S13: happy path + conflict
// ---------------------------------------------------------------------------
describe("rescheduleAppointment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(adminUser);
  });

  it("S13: happy path — reschedules appointment when new slot is free", async () => {
    let callCount = 0;
    const mockSelect = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => {
          callCount++;
          if (callCount === 1) {
            // Fetch existing appointment
            return [{ id: "appt-1", status: "scheduled", storeId: "providencia", serviceId: "svc-1" }];
          }
          // Overlap check — no conflicts
          return [];
        }),
      })),
    }));
    const mockUpdate = vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(async () => ({})) })),
    }));
    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) =>
        cb({ select: mockSelect, update: mockUpdate } as AnyDb),
    );

    const { rescheduleAppointment } = await getActions();
    const result = await rescheduleAppointment({
      appointmentId: "appt-1",
      newStartsAt: FUTURE_START,
      newEndsAt: FUTURE_END,
    });
    expect(result.ok).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/citas");
  });

  it("S13: returns slot_unavailable when new slot has existing appointment", async () => {
    let callCount = 0;
    const mockSelect = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => {
          callCount++;
          if (callCount === 1) {
            return [{ id: "appt-1", status: "scheduled", storeId: "providencia", serviceId: "svc-1" }];
          }
          // Overlap check — conflict found
          return [{ id: "appt-conflict" }];
        }),
      })),
    }));
    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) =>
        cb({ select: mockSelect } as AnyDb),
    );

    const { rescheduleAppointment } = await getActions();
    const result = await rescheduleAppointment({
      appointmentId: "appt-1",
      newStartsAt: FUTURE_START,
      newEndsAt: FUTURE_END,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("slot_unavailable");
    }
  });
});

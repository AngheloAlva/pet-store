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
vi.mock("@/lib/staff/auth", () => ({
  requireStaffOrAdmin: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/notifications/demo-email", () => ({
  sendDemoEmail: vi.fn(async () => ({ id: "mock-email-id" })),
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

const staffUser = {
  id: "user-staff-centro",
  email: "staff@demo.cl",
  name: "Vendedor Sucursal Centro",
  role: "staff" as const,
  storeId: "providencia",
  isDemoSeed: true,
};

const customerUser = { ...adminUser, role: "customer" as const };

const FUTURE_START = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1h from now
const FUTURE_END = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2h from now

const getActions = async () => import("./appointments-admin");

describe("requireAdmin guard — appointments-admin", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updateAppointment: redirects to / for non-staff/non-admin (via requireStaffOrAdmin mock)", async () => {
    // updateAppointment now uses requireStaffOrAdmin — mock it to simulate a customer redirect
    const staffAuth = await import("@/lib/staff/auth");
    vi.mocked(staffAuth.requireStaffOrAdmin).mockImplementation(() => {
      redirect("/");
      return Promise.resolve(customerUser as never);
    });
    const { updateAppointment } = await getActions();
    await expect(updateAppointment({})).rejects.toThrow(/REDIRECT:\//);
    expect(mockRedirect).toHaveBeenCalledWith("/");
  });
});

// ---------------------------------------------------------------------------
// updateAppointment — staff gate (S-ACTION-1, S-ACTION-2, S-ACTION-3)
// ---------------------------------------------------------------------------
describe("updateAppointment — staff gate", () => {
  let mockRequireStaffOrAdmin: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const staffAuth = await import("@/lib/staff/auth");
    mockRequireStaffOrAdmin = vi.mocked(staffAuth.requireStaffOrAdmin);
  });

  // S-ACTION-1: staff can update appointment
  it("S-ACTION-1: staff allowed — DB update succeeds, no redirect", async () => {
    mockRequireStaffOrAdmin.mockResolvedValue(staffUser);
    const mockSelect = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [{ id: "appt-1", status: "scheduled" }]),
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
    const result = await updateAppointment({ appointmentId: "appt-1", status: "attended" });
    expect(result.ok).toBe(true);
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  // S-ACTION-2: customer blocked
  it("S-ACTION-2: customer blocked — throws redirect", async () => {
    mockRequireStaffOrAdmin.mockImplementation(() => {
      throw new Error("REDIRECT:/");
    });
    const { updateAppointment } = await getActions();
    await expect(updateAppointment({ appointmentId: "appt-1", status: "attended" })).rejects.toThrow("REDIRECT:/");
  });

  // S-ACTION-3: both paths revalidated
  it("S-ACTION-3: revalidates /admin/citas AND /staff on success", async () => {
    mockRequireStaffOrAdmin.mockResolvedValue(staffUser);
    const mockSelect = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [{ id: "appt-1", status: "scheduled" }]),
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
    await updateAppointment({ appointmentId: "appt-1", status: "attended" });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/citas");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/staff");
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

  it("S-ACTION-2: calls sendDemoEmail with appointment_canceled and triggeredBy=admin.id", async () => {
    const { sendDemoEmail } = await import("@/lib/notifications/demo-email");
    const mockSendDemoEmail = vi.mocked(sendDemoEmail);
    mockSendDemoEmail.mockClear();

    const mockTxSelect = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [
          {
            id: "appt-x",
            status: "scheduled",
            userId: "user-camila-demo",
            startsAt: new Date(Date.now() + 30 * 60 * 1000),
            serviceId: "svc-bath-trim",
            storeId: "providencia",
          },
        ]),
      })),
    }));
    const mockUpdate = vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(async () => ({})) })),
    }));
    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) =>
        cb({ select: mockTxSelect, update: mockUpdate } as AnyDb),
    );
    // Mock post-tx user lookup
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [{ email: "camila@demo.cl", name: "Camila Rojas" }]),
      })),
    }));

    const { cancelAppointment } = await getActions();
    const result = await cancelAppointment({
      appointmentId: "appt-x",
      cancelReason: "Admin override",
    });
    expect(result.ok).toBe(true);
    expect(mockSendDemoEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "appointment_canceled",
        triggeredBy: adminUser.id,
      }),
    );
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

  it("S-ACTION-3: calls sendDemoEmail with appointment_rescheduled on success", async () => {
    const { sendDemoEmail } = await import("@/lib/notifications/demo-email");
    const mockSendDemoEmail = vi.mocked(sendDemoEmail);
    mockSendDemoEmail.mockClear();

    let callCount = 0;
    const mockTxSelect = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => {
          callCount++;
          if (callCount === 1) {
            return [{
              id: "appt-1",
              status: "scheduled",
              storeId: "providencia",
              serviceId: "svc-1",
              userId: "user-camila-demo",
              startsAt: new Date(FUTURE_START),
            }];
          }
          return [];
        }),
      })),
    }));
    const mockUpdate = vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(async () => ({})) })),
    }));
    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) =>
        cb({ select: mockTxSelect, update: mockUpdate } as AnyDb),
    );
    // Mock post-tx user lookup
    (db as AnyDb).select = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [{ email: "camila@demo.cl", name: "Camila Rojas" }]),
      })),
    }));

    const { rescheduleAppointment } = await getActions();
    const result = await rescheduleAppointment({
      appointmentId: "appt-1",
      newStartsAt: FUTURE_START,
      newEndsAt: FUTURE_END,
    });
    expect(result.ok).toBe(true);
    expect(mockSendDemoEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "appointment_rescheduled",
        triggeredBy: adminUser.id,
      }),
    );
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

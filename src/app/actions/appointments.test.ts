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
vi.mock("@/lib/notifications/demo-email", () => ({
  sendDemoEmail: vi.fn(async () => ({ id: "mock-email-id" })),
  enqueueAppointmentReminders: vi.fn(async () => {}),
  DEMO_EMAIL_TEMPLATE: {
    APPOINTMENT_CONFIRMATION: "appointment_confirmation",
    APPOINTMENT_CANCELLATION: "appointment_cancellation",
    APPOINTMENT_REMINDER_24H: "appointment_reminder_24h",
    APPOINTMENT_REMINDER_2H: "appointment_reminder_2h",
  },
}));

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockRedirect = vi.mocked(redirect);
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

const FUTURE = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

const getActions = async () => import("./appointments");

// ---------------------------------------------------------------------------
// requireUser guard
// ---------------------------------------------------------------------------
describe("requireUser guard — appointments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("createAppointment: redirects unauthenticated user", async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const { createAppointment } = await getActions();
    await expect(createAppointment({})).rejects.toThrow(/REDIRECT/);
    expect(mockRedirect).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// createAppointment
// ---------------------------------------------------------------------------
describe("createAppointment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(camilaUser);
  });

  it("returns validation error when serviceId is missing", async () => {
    const { createAppointment } = await getActions();
    const result = await createAppointment({
      storeId: "providencia",
      startsAt: FUTURE,
    });
    expect(result.ok).toBe(false);
    if (!result.ok && "errors" in result) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result.errors as any).fieldErrors).toHaveProperty("serviceId");
    }
  });

  it("S-ACTION-3: returns slot_unavailable when slot already taken", async () => {
    let callCount = 0;
    const mockSelect = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => {
          callCount++;
          // service exists
          if (callCount === 1) return [{ id: "svc-1", durationMin: 60 }];
          // overlap check — conflict
          return [{ id: "existing-appt" }];
        }),
      })),
    }));
    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) =>
        cb({ select: mockSelect } as AnyDb),
    );

    const { createAppointment } = await getActions();
    const result = await createAppointment({
      serviceId: "svc-1",
      storeId: "providencia",
      startsAt: FUTURE,
    });
    expect(result.ok).toBe(false);
    if (!result.ok && "error" in result) {
      expect(result.error).toBe("slot_unavailable");
    }
  });

  it("S-NOTIF-1: calls sendDemoEmail with confirmation template on success", async () => {
    const { sendDemoEmail } = await import("@/lib/notifications/demo-email");
    const mockSendDemoEmail = vi.mocked(sendDemoEmail);
    mockSendDemoEmail.mockClear();

    let callCount = 0;
    const mockInsert = vi.fn(() => ({ values: vi.fn(async () => ({})) }));
    const mockSelect = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => {
          callCount++;
          if (callCount === 1) return [{ id: "svc-1", durationMin: 60 }];
          return []; // no overlap
        }),
      })),
    }));
    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) =>
        cb({ select: mockSelect, insert: mockInsert } as AnyDb),
    );

    const { createAppointment } = await getActions();
    const result = await createAppointment({
      serviceId: "svc-1",
      storeId: "providencia",
      startsAt: FUTURE,
    });
    expect(result.ok).toBe(true);
    expect(mockSendDemoEmail).toHaveBeenCalledWith(
      expect.objectContaining({ template: "appointment_confirmation" }),
    );
  });

  it("S-SCHEMA-4: petId null + petNameSnapshot persisted", async () => {
    let callCount = 0;
    let insertedValues: Record<string, unknown> | null = null;
    const mockInsert = vi.fn(() => ({
      values: vi.fn(async (vals: Record<string, unknown>) => {
        insertedValues = vals;
        return {};
      }),
    }));
    const mockSelect = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => {
          callCount++;
          if (callCount === 1) return [{ id: "svc-1", durationMin: 60 }];
          return [];
        }),
      })),
    }));
    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) =>
        cb({ select: mockSelect, insert: mockInsert } as AnyDb),
    );

    const { createAppointment } = await getActions();
    await createAppointment({
      serviceId: "svc-1",
      storeId: "providencia",
      startsAt: FUTURE,
      petNameSnapshot: "Tobi",
    });
    expect(insertedValues).not.toBeNull();
    expect(insertedValues!.petId).toBeNull();
    expect(insertedValues!.petNameSnapshot).toBe("Tobi");
  });

  it("S-PUBLIC-3: serial race — second call returns slot_unavailable after first succeeds", async () => {
    let insertCount = 0;
    const mockInsert = vi.fn(() => ({
      values: vi.fn(async () => {
        insertCount++;
        return {};
      }),
    }));

    // Simulate overlap returning data on the second call
    let txCallCount = 0;
    (db as AnyDb).transaction = vi.fn(async (cb: (tx: AnyDb) => Promise<unknown>) => {
      txCallCount++;
      let selectCount = 0;
      const mockSelect = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(async () => {
            selectCount++;
            if (selectCount === 1) return [{ id: "svc-1", durationMin: 60 }];
            // First tx: no overlap; second tx: has overlap
            return txCallCount === 1 ? [] : [{ id: "existing" }];
          }),
        })),
      }));
      return cb({ select: mockSelect, insert: mockInsert } as AnyDb);
    });

    const { createAppointment } = await getActions();
    const input = { serviceId: "svc-1", storeId: "providencia", startsAt: FUTURE };

    const result1 = await createAppointment(input);
    const result2 = await createAppointment(input);

    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(false);
    if (!result2.ok && "error" in result2) {
      expect(result2.error).toBe("slot_unavailable");
    }
    expect(insertCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// cancelOwnAppointment
// ---------------------------------------------------------------------------
describe("cancelOwnAppointment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(camilaUser);
  });

  it("S-ACTION-4: returns unauthorized when appointment belongs to another user", async () => {
    const mockSelect = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [
          {
            id: "appt-1",
            userId: "user-staff-centro", // not camila
            status: "scheduled",
            startsAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
          },
        ]),
      })),
    }));
    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) =>
        cb({ select: mockSelect } as AnyDb),
    );

    const { cancelOwnAppointment } = await getActions();
    const result = await cancelOwnAppointment({
      appointmentId: "appt-1",
      cancelReason: "No puedo ir",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("unauthorized");
    }
  });

  it("S8: returns too_late_to_cancel when appointment is < 2h away", async () => {
    const mockSelect = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [
          {
            id: "appt-soon",
            userId: "user-camila-demo",
            status: "scheduled",
            startsAt: new Date(Date.now() + 30 * 60 * 1000), // 30min
          },
        ]),
      })),
    }));
    (db as AnyDb).transaction = vi.fn(
      async (cb: (tx: AnyDb) => Promise<unknown>) =>
        cb({ select: mockSelect } as AnyDb),
    );

    const { cancelOwnAppointment } = await getActions();
    const result = await cancelOwnAppointment({
      appointmentId: "appt-soon",
      cancelReason: "No puedo ir",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("too_late_to_cancel");
    }
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("cancels successfully when appointment is >= 2h away", async () => {
    const mockSelect = vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(async () => [
          {
            id: "appt-future",
            userId: "user-camila-demo",
            status: "scheduled",
            startsAt: new Date(Date.now() + 3 * 60 * 60 * 1000), // 3h
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

    const { cancelOwnAppointment } = await getActions();
    const result = await cancelOwnAppointment({
      appointmentId: "appt-future",
      cancelReason: "No puedo ir",
    });
    expect(result.ok).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/cuenta/citas");
  });
});

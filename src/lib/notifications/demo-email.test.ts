import { describe, it, expect, vi, beforeEach } from "vitest";
import { db } from "@/db";

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------
// db is globally mocked in setup.ts; override insert for specific tests.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any;

const getModule = () => import("./demo-email");

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// sendDemoEmail
// ---------------------------------------------------------------------------
describe("sendDemoEmail", () => {
  it("S-HELPER-1: calls db.insert with correct type, subject, bodyHtml, bodyText, toEmail", async () => {
    const mockInsert = vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(async () => [{ id: "email-row-1" }]),
      })),
    }));
    (db as AnyDb).insert = mockInsert;

    const { sendDemoEmail } = await getModule();
    const result = await sendDemoEmail({
      to: "camila@demo.cl",
      type: "appointment_confirmation",
      data: {
        serviceName: "Baño y corte",
        startsAt: new Date("2026-05-23T10:00:00.000Z"),
        storeName: "Providencia",
        userName: "Camila",
      },
    });

    expect(mockInsert).toHaveBeenCalled();
    const insertedValues = mockInsert.mock.calls[0];
    expect(insertedValues).toBeDefined();
    const valuesArg = (mockInsert.mock.results[0].value as { values: ReturnType<typeof vi.fn> }).values.mock.calls[0][0];
    expect(valuesArg.type).toBe("appointment_confirmation");
    expect(valuesArg.toEmail).toBe("camila@demo.cl");
    expect(typeof valuesArg.subject).toBe("string");
    expect(typeof valuesArg.bodyHtml).toBe("string");
    expect(typeof valuesArg.bodyText).toBe("string");
    expect(result).toHaveProperty("id", "email-row-1");
  });

  it("S-HELPER-2: returns { id } of the inserted row", async () => {
    const mockInsert = vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(async () => [{ id: "inserted-id-abc" }]),
      })),
    }));
    (db as AnyDb).insert = mockInsert;

    const { sendDemoEmail } = await getModule();
    const result = await sendDemoEmail({
      to: "test@test.cl",
      type: "welcome",
      data: { userName: "Test" },
    });
    expect(result.id).toBe("inserted-id-abc");
  });

  it("S-HELPER-3: uses rendered subject when no subject override given", async () => {
    let capturedSubject = "";
    const mockInsert = vi.fn(() => ({
      values: vi.fn((vals: { subject: string }) => {
        capturedSubject = vals.subject;
        return {
          returning: vi.fn(async () => [{ id: "x" }]),
        };
      }),
    }));
    (db as AnyDb).insert = mockInsert;

    const { sendDemoEmail } = await getModule();
    await sendDemoEmail({
      to: "test@test.cl",
      type: "welcome",
      data: { userName: "Camila" },
    });
    expect(capturedSubject).toContain("Camila");
  });

  it("S-HELPER-3: uses provided subject override when given", async () => {
    let capturedSubject = "";
    const mockInsert = vi.fn(() => ({
      values: vi.fn((vals: { subject: string }) => {
        capturedSubject = vals.subject;
        return {
          returning: vi.fn(async () => [{ id: "x" }]),
        };
      }),
    }));
    (db as AnyDb).insert = mockInsert;

    const { sendDemoEmail } = await getModule();
    await sendDemoEmail({
      to: "test@test.cl",
      subject: "Custom Subject",
      type: "welcome",
      data: { userName: "Camila" },
    });
    expect(capturedSubject).toBe("Custom Subject");
  });

  it("S-HELPER-4: render error prevents db.insert (throws before insert)", async () => {
    const mockInsert = vi.fn();
    (db as AnyDb).insert = mockInsert;

    const { sendDemoEmail } = await getModule();
    // Pass wrong-typed data that will cause the template to fail
    // @ts-expect-error — intentionally passing wrong data to test runtime error handling
    await expect(sendDemoEmail({ to: "x@x.cl", type: "other", data: null })).rejects.toThrow();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("passes toUserId and triggeredBy to insert when provided", async () => {
    let capturedValues: Record<string, unknown> = {};
    const mockInsert = vi.fn(() => ({
      values: vi.fn((vals: Record<string, unknown>) => {
        capturedValues = vals;
        return {
          returning: vi.fn(async () => [{ id: "x" }]),
        };
      }),
    }));
    (db as AnyDb).insert = mockInsert;

    const { sendDemoEmail } = await getModule();
    await sendDemoEmail({
      to: "camila@demo.cl",
      toUserId: "user-camila-demo",
      triggeredBy: "user-admin-demo",
      type: "welcome",
      data: { userName: "Camila" },
    });
    expect(capturedValues.toUserId).toBe("user-camila-demo");
    expect(capturedValues.triggeredBy).toBe("user-admin-demo");
  });
});

// ---------------------------------------------------------------------------
// enqueueAppointmentReminders
// ---------------------------------------------------------------------------
describe("enqueueAppointmentReminders", () => {
  it("S-HELPER-6: writes two rows (24h + 2h) and returns { ids: [string, string] }", async () => {
    const insertedTypes: string[] = [];
    let callCount = 0;
    const mockInsert = vi.fn(() => ({
      values: vi.fn((vals: { type: string }) => {
        insertedTypes.push(vals.type);
        callCount++;
        return {
          returning: vi.fn(async () => [{ id: `email-${callCount}` }]),
        };
      }),
    }));
    (db as AnyDb).insert = mockInsert;

    const { enqueueAppointmentReminders } = await getModule();
    const result = await enqueueAppointmentReminders({
      appointmentId: "appt-1",
      userEmail: "camila@demo.cl",
      userId: "user-camila-demo",
      serviceName: "Baño y corte",
      startsAt: new Date("2026-05-23T10:00:00.000Z"),
      storeName: "Providencia",
    });

    expect(result).toHaveProperty("ids");
    expect(result.ids).toHaveLength(2);
    expect(insertedTypes).toContain("appointment_reminder_24h");
    expect(insertedTypes).toContain("appointment_reminder_2h");
    expect(typeof result.ids[0]).toBe("string");
    expect(typeof result.ids[1]).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// DEMO_EMAIL_TEMPLATE constant
// ---------------------------------------------------------------------------
describe("DEMO_EMAIL_TEMPLATE", () => {
  it("includes APPOINTMENT_CANCELED (not APPOINTMENT_CANCELLATION)", async () => {
    const { DEMO_EMAIL_TEMPLATE } = await getModule();
    expect(DEMO_EMAIL_TEMPLATE.APPOINTMENT_CANCELED).toBe("appointment_canceled");
    expect((DEMO_EMAIL_TEMPLATE as Record<string, unknown>).APPOINTMENT_CANCELLATION).toBeUndefined();
  });
});

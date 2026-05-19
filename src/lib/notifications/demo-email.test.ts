import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DEMO_EMAIL_TEMPLATE } from "./demo-email";

// ---------------------------------------------------------------------------
// S-NOTIF-2: stub resolves and returns { id }
// S-NOTIF-1: console.debug gated by DEMO_MAIL_LOG=1
// ---------------------------------------------------------------------------
describe("sendDemoEmail", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.DEMO_MAIL_LOG;
  });

  it("S-NOTIF-2: resolves without throwing and returns { id: string }", async () => {
    const { sendDemoEmail } = await import("./demo-email");
    const result = await sendDemoEmail({
      to: "test@test.cl",
      template: DEMO_EMAIL_TEMPLATE.APPOINTMENT_CONFIRMATION,
      data: { appointmentId: "apt-1" },
    });
    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("string");
    expect(result.id.length).toBeGreaterThan(0);
  });

  it("S-NOTIF-2: does not throw for any valid template", async () => {
    const { sendDemoEmail } = await import("./demo-email");
    await expect(
      sendDemoEmail({
        to: "user@example.com",
        template: DEMO_EMAIL_TEMPLATE.APPOINTMENT_REMINDER_24H,
        data: {},
      }),
    ).resolves.not.toThrow();
  });

  it("S-NOTIF-1: console.debug NOT called when DEMO_MAIL_LOG is unset", async () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    const { sendDemoEmail } = await import("./demo-email");
    await sendDemoEmail({
      to: "user@example.com",
      template: DEMO_EMAIL_TEMPLATE.APPOINTMENT_CONFIRMATION,
      data: {},
    });
    expect(debugSpy).not.toHaveBeenCalled();
    debugSpy.mockRestore();
  });

  it("S-NOTIF-1: console.debug IS called when DEMO_MAIL_LOG=1", async () => {
    process.env.DEMO_MAIL_LOG = "1";
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
    const { sendDemoEmail } = await import("./demo-email");
    await sendDemoEmail({
      to: "user@example.com",
      template: DEMO_EMAIL_TEMPLATE.APPOINTMENT_CONFIRMATION,
      data: { foo: "bar" },
    });
    expect(debugSpy).toHaveBeenCalled();
    debugSpy.mockRestore();
  });
});

describe("enqueueAppointmentReminders", () => {
  it("resolves without throwing (stub)", async () => {
    const { enqueueAppointmentReminders } = await import("./demo-email");
    await expect(enqueueAppointmentReminders("apt-123")).resolves.not.toThrow();
  });
});

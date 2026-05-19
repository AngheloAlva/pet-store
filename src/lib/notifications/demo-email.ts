/**
 * Notification stub — no-op implementation.
 * Matches the F2.8 interface contract so F2.8 can swap implementations
 * without changes to callers.
 */

// ---------------------------------------------------------------------------
// Template const + type
// ---------------------------------------------------------------------------
export const DEMO_EMAIL_TEMPLATE = {
  APPOINTMENT_CONFIRMATION: "appointment_confirmation",
  APPOINTMENT_CANCELLATION: "appointment_cancellation",
  APPOINTMENT_REMINDER_24H: "appointment_reminder_24h",
  APPOINTMENT_REMINDER_2H: "appointment_reminder_2h",
  POINTS_ADJUSTMENT: "points_adjustment",
} as const;

export type DemoEmailTemplate = (typeof DEMO_EMAIL_TEMPLATE)[keyof typeof DEMO_EMAIL_TEMPLATE];

// ---------------------------------------------------------------------------
// DemoEmailArgs
// ---------------------------------------------------------------------------
export interface DemoEmailArgs {
  to: string;
  template: DemoEmailTemplate;
  data: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// sendDemoEmail — stub (no-op; console.debug when DEMO_MAIL_LOG=1)
// ---------------------------------------------------------------------------
export async function sendDemoEmail(args: DemoEmailArgs): Promise<{ id: string }> {
  const id = crypto.randomUUID();
  if (process.env.DEMO_MAIL_LOG === "1") {
    console.debug("[demo-email]", { id, ...args });
  }
  return { id };
}

// ---------------------------------------------------------------------------
// enqueueAppointmentReminders — stub
// Called after createAppointment; F2.8 implements actual delivery.
// ---------------------------------------------------------------------------
export async function enqueueAppointmentReminders(appointmentId: string): Promise<void> {
  void appointmentId; // no-op stub — F2.8 implements delivery
}

import { db } from "@/db";
import { demoEmails, type DemoEmailType } from "@/db/schema";
import { TEMPLATES, type TemplateData } from "./templates/index";

// ---------------------------------------------------------------------------
// Legacy template const — kept for call-site compatibility
// APPOINTMENT_CANCELLATION removed; replaced with APPOINTMENT_CANCELED
// ---------------------------------------------------------------------------
export const DEMO_EMAIL_TEMPLATE = {
  APPOINTMENT_CONFIRMATION: "appointment_confirmation",
  APPOINTMENT_CANCELED: "appointment_canceled",
  APPOINTMENT_REMINDER_24H: "appointment_reminder_24h",
  APPOINTMENT_REMINDER_2H: "appointment_reminder_2h",
  APPOINTMENT_RESCHEDULED: "appointment_rescheduled",
  RESTOCK_ALERT: "restock_alert",
  WELCOME: "welcome",
  POINTS_ADJUSTMENT: "points_adjustment",
  OTHER: "other",
} as const;

export type DemoEmailTemplateValue = (typeof DEMO_EMAIL_TEMPLATE)[keyof typeof DEMO_EMAIL_TEMPLATE];

// ---------------------------------------------------------------------------
// DemoEmailArgs — generic over T so callers get narrowed data types
// ---------------------------------------------------------------------------
export interface DemoEmailArgs<T extends DemoEmailType> {
  to: string;
  toUserId?: string;
  subject?: string;
  type: T;
  data: TemplateData[T];
  triggeredBy?: string;
}

// ---------------------------------------------------------------------------
// sendDemoEmail — resolves template, renders, inserts row, returns { id }
// ---------------------------------------------------------------------------
export async function sendDemoEmail<T extends DemoEmailType>(
  args: DemoEmailArgs<T>,
): Promise<{ id: string }> {
  // Resolve and call render — throws if data is invalid (S-HELPER-4)
  const renderFn = TEMPLATES[args.type] as (data: TemplateData[T]) => {
    subject: string;
    html: string;
    text: string;
  };
  const rendered = renderFn(args.data);

  const id = crypto.randomUUID();
  const subject = args.subject ?? rendered.subject;

  if (process.env.DEMO_MAIL_LOG === "1") {
    console.debug("[demo-email]", { id, type: args.type, to: args.to, subject });
  }

  const [row] = await db
    .insert(demoEmails)
    .values({
      id,
      toEmail: args.to,
      toUserId: args.toUserId ?? null,
      subject,
      type: args.type,
      bodyHtml: rendered.html,
      bodyText: rendered.text,
      data: args.data as unknown as Record<string, unknown>,
      triggeredBy: args.triggeredBy ?? null,
    })
    .returning({ id: demoEmails.id });

  return { id: row.id };
}

// ---------------------------------------------------------------------------
// enqueueAppointmentReminders — writes 24h + 2h reminder rows immediately
// ---------------------------------------------------------------------------
export interface EnqueueRemindersArgs {
  appointmentId: string;
  userEmail: string;
  userId?: string;
  serviceName: string;
  startsAt: Date;
  storeName: string;
  userName?: string;
}

export async function enqueueAppointmentReminders(
  args: EnqueueRemindersArgs,
): Promise<{ ids: [string, string] }> {
  const templateData = {
    serviceName: args.serviceName,
    startsAt: args.startsAt,
    storeName: args.storeName,
    userName: args.userName ?? args.userEmail,
  };

  const [r24h, r2h] = await Promise.all([
    sendDemoEmail({
      to: args.userEmail,
      toUserId: args.userId,
      type: "appointment_reminder_24h",
      data: templateData,
    }),
    sendDemoEmail({
      to: args.userEmail,
      toUserId: args.userId,
      type: "appointment_reminder_2h",
      data: templateData,
    }),
  ]);

  return { ids: [r24h.id, r2h.id] };
}

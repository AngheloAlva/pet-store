"use server";

import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { appointments, services, APPOINTMENT_STATUS } from "@/db/schema";
import { eq, and, lt, gt } from "drizzle-orm";
import { z } from "zod";
import {
  sendDemoEmail,
  enqueueAppointmentReminders,
  DEMO_EMAIL_TEMPLATE,
} from "@/lib/notifications/demo-email";
import { differenceInMinutes } from "date-fns";

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------
async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------
export const createAppointmentSchema = z.object({
  serviceId: z.string().min(1, { message: "Servicio obligatorio" }),
  storeId: z.string().min(1, { message: "Sucursal obligatoria" }),
  startsAt: z.string().datetime({ message: "Fecha inválida" }),
  petId: z.string().optional(),
  petNameSnapshot: z.string().optional(),
  notes: z.string().optional(),
});

export const cancelOwnAppointmentSchema = z.object({
  appointmentId: z.string().min(1),
  cancelReason: z.string().min(1, { message: "Razón de cancelación obligatoria" }),
});

// ---------------------------------------------------------------------------
// createAppointment — S-ACTION-3 overlap guard, S-NOTIF-1 email
// ---------------------------------------------------------------------------
export async function createAppointment(
  input: unknown,
): Promise<
  | { ok: true; id: string }
  | { ok: false; error: "slot_unavailable" | "service_not_found" | "validation_error"; errors?: unknown }
> {
  const user = await requireUser();

  const parsed = createAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation_error", errors: parsed.error.flatten() };
  }

  const data = parsed.data;
  const startsAt = new Date(data.startsAt);

  const result = await db.transaction(async (tx) => {
    // 1. Fetch service to get durationMin
    const svcRows = await tx
      .select({ id: services.id, durationMin: services.durationMin })
      .from(services)
      .where(eq(services.id, data.serviceId));

    if (svcRows.length === 0) {
      return { ok: false as const, error: "service_not_found" as const };
    }

    const svc = svcRows[0];
    const endsAt = new Date(startsAt.getTime() + svc.durationMin * 60 * 1000);

    // 2. Overlap guard — find scheduled appointments overlapping [startsAt, endsAt)
    const overlapping = await tx
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.storeId, data.storeId),
          eq(appointments.serviceId, data.serviceId),
          eq(appointments.status, APPOINTMENT_STATUS.SCHEDULED),
          lt(appointments.startsAt, endsAt),
          gt(appointments.endsAt, startsAt),
        ),
      );

    if (overlapping.length > 0) {
      return { ok: false as const, error: "slot_unavailable" as const };
    }

    // 3. Insert
    const id = crypto.randomUUID();
    await tx.insert(appointments).values({
      id,
      userId: user.id,
      petId: data.petId ?? null,
      petNameSnapshot: data.petNameSnapshot ?? null,
      serviceId: data.serviceId,
      storeId: data.storeId,
      startsAt,
      endsAt,
      status: APPOINTMENT_STATUS.SCHEDULED,
      notes: data.notes ?? null,
    });

    return { ok: true as const, id };
  });

  if (!result.ok) {
    return result;
  }

  // S-NOTIF-1: send confirmation email (non-blocking — fire and forget)
  await sendDemoEmail({
    to: user.email,
    template: DEMO_EMAIL_TEMPLATE.APPOINTMENT_CONFIRMATION,
    data: { appointmentId: result.id, userId: user.id },
  });
  await enqueueAppointmentReminders(result.id);

  revalidatePath("/cuenta/citas");

  return { ok: true, id: result.id };
}

// ---------------------------------------------------------------------------
// cancelOwnAppointment — S-ACTION-4 ownership, S8 hard-block < 2h
// ---------------------------------------------------------------------------
export async function cancelOwnAppointment(
  input: unknown,
): Promise<
  | { ok: true }
  | { ok: false; error: "too_late_to_cancel" | "unauthorized" | "not_found" | "validation_error"; details?: unknown }
> {
  const user = await requireUser();

  const parsed = cancelOwnAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation_error", details: parsed.error.flatten() };
  }

  const data = parsed.data;

  const result = await db.transaction(async (tx) => {
    const rows = await tx
      .select({
        id: appointments.id,
        userId: appointments.userId,
        status: appointments.status,
        startsAt: appointments.startsAt,
      })
      .from(appointments)
      .where(eq(appointments.id, data.appointmentId));

    if (rows.length === 0) {
      return { ok: false as const, error: "not_found" as const };
    }

    const appt = rows[0];

    // S-ACTION-4: ownership check
    if (appt.userId !== user.id) {
      return { ok: false as const, error: "unauthorized" as const };
    }

    // S8: hard-block < 2 hours
    const minutesUntilStart = differenceInMinutes(appt.startsAt, new Date());
    if (minutesUntilStart < 120) {
      return { ok: false as const, error: "too_late_to_cancel" as const };
    }

    await tx
      .update(appointments)
      .set({
        status: APPOINTMENT_STATUS.CANCELED,
        cancelReason: data.cancelReason,
      })
      .where(eq(appointments.id, data.appointmentId));

    return { ok: true as const };
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath("/cuenta/citas");

  return { ok: true };
}

"use server";

import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { appointments, APPOINTMENT_STATUS } from "@/db/schema";
import { eq, and, ne, lt, gt } from "drizzle-orm";
import {
  updateAppointmentSchema,
  cancelAppointmentSchema,
  rescheduleAppointmentSchema,
} from "./appointments-admin.schema";

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/");
  }
  return user;
}

// ---------------------------------------------------------------------------
// updateAppointment — S-ADMIN-5: status transition to attended/no_show
// ---------------------------------------------------------------------------
export async function updateAppointment(
  input: unknown,
): Promise<
  | { ok: true }
  | { ok: false; error: "not_found" | "invalid_status" | "validation_error"; details?: unknown }
> {
  await requireAdmin();

  const parsed = updateAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation_error", details: parsed.error.flatten() };
  }

  const data = parsed.data;

  const result = await db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: appointments.id, status: appointments.status })
      .from(appointments)
      .where(eq(appointments.id, data.appointmentId));

    if (rows.length === 0) {
      return { ok: false as const, error: "not_found" as const };
    }

    const appt = rows[0];
    if (appt.status !== APPOINTMENT_STATUS.SCHEDULED) {
      return { ok: false as const, error: "invalid_status" as const };
    }

    await tx
      .update(appointments)
      .set({ status: data.status, notes: data.notes ?? null })
      .where(eq(appointments.id, data.appointmentId));

    return { ok: true as const };
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath("/admin/citas");

  return { ok: true };
}

// ---------------------------------------------------------------------------
// cancelAppointment — admin, NO time guard (S-ACTION-6)
// ---------------------------------------------------------------------------
export async function cancelAppointment(
  input: unknown,
): Promise<
  | { ok: true }
  | { ok: false; error: "not_found" | "validation_error"; details?: unknown }
> {
  await requireAdmin();

  const parsed = cancelAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation_error", details: parsed.error.flatten() };
  }

  const data = parsed.data;

  const result = await db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: appointments.id, status: appointments.status, startsAt: appointments.startsAt })
      .from(appointments)
      .where(eq(appointments.id, data.appointmentId));

    if (rows.length === 0) {
      return { ok: false as const, error: "not_found" as const };
    }

    // No time guard for admin
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

  revalidatePath("/admin/citas");

  return { ok: true };
}

// ---------------------------------------------------------------------------
// rescheduleAppointment — admin, with overlap guard (S13)
// ---------------------------------------------------------------------------
export async function rescheduleAppointment(
  input: unknown,
): Promise<
  | { ok: true }
  | { ok: false; error: "slot_unavailable" | "not_found" | "validation_error"; details?: unknown }
> {
  await requireAdmin();

  const parsed = rescheduleAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation_error", details: parsed.error.flatten() };
  }

  const data = parsed.data;
  const newStart = new Date(data.newStartsAt);
  const newEnd = new Date(data.newEndsAt);

  const result = await db.transaction(async (tx) => {
    // 1. Fetch existing appointment
    const rows = await tx
      .select({
        id: appointments.id,
        status: appointments.status,
        storeId: appointments.storeId,
        serviceId: appointments.serviceId,
      })
      .from(appointments)
      .where(eq(appointments.id, data.appointmentId));

    if (rows.length === 0) {
      return { ok: false as const, error: "not_found" as const };
    }

    const appt = rows[0];

    // 2. Overlap guard — find scheduled appointments that overlap [newStart, newEnd)
    // excluding the appointment being rescheduled
    const overlapping = await tx
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.storeId, appt.storeId),
          eq(appointments.serviceId, appt.serviceId),
          eq(appointments.status, APPOINTMENT_STATUS.SCHEDULED),
          ne(appointments.id, data.appointmentId),
          lt(appointments.startsAt, newEnd),
          gt(appointments.endsAt, newStart),
        ),
      );

    if (overlapping.length > 0) {
      return { ok: false as const, error: "slot_unavailable" as const };
    }

    // 3. Update
    await tx
      .update(appointments)
      .set({ startsAt: newStart, endsAt: newEnd })
      .where(eq(appointments.id, data.appointmentId));

    return { ok: true as const };
  });

  if (!result.ok) {
    return result;
  }

  revalidatePath("/admin/citas");

  return { ok: true };
}

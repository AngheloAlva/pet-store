"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { appointments, APPOINTMENT_STATUS } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireStaffOrAdmin } from "@/lib/staff/auth";
import type { AppointmentStatus } from "@/db/schema";

// ---------------------------------------------------------------------------
// Private helper — auth once, update status
// ---------------------------------------------------------------------------
async function executeStatusUpdate(
  appointmentId: string,
  status: AppointmentStatus,
): Promise<void> {
  if (!appointmentId) throw new Error("appointmentId is required");

  await requireStaffOrAdmin();

  await db
    .update(appointments)
    .set({ status, updatedAt: new Date() })
    .where(eq(appointments.id, appointmentId));

  revalidatePath("/staff");
  revalidatePath("/admin/citas");
}

// ---------------------------------------------------------------------------
// markAppointmentAttended — S-ACTION-4
// ---------------------------------------------------------------------------
export async function markAppointmentAttended({
  appointmentId,
}: {
  appointmentId: string;
}): Promise<void> {
  await executeStatusUpdate(appointmentId, APPOINTMENT_STATUS.ATTENDED);
}

// ---------------------------------------------------------------------------
// markAppointmentNoShow — S-ACTION-5
// ---------------------------------------------------------------------------
export async function markAppointmentNoShow({
  appointmentId,
}: {
  appointmentId: string;
}): Promise<void> {
  await executeStatusUpdate(appointmentId, APPOINTMENT_STATUS.NO_SHOW);
}

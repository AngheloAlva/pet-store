import "server-only";
import { getAppointments } from "@/lib/admin/appointments";
import type { AppointmentAdminRow } from "@/lib/admin/appointments";

export type { AppointmentAdminRow };

// ---------------------------------------------------------------------------
// listTodayAppointments
// ---------------------------------------------------------------------------
export async function listTodayAppointments({
  storeId,
  now = new Date(),
}: {
  storeId: string;
  now?: Date;
}): Promise<AppointmentAdminRow[]> {
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  return getAppointments({
    storeId,
    dateRangeStart: startOfDay,
    dateRangeEnd: endOfDay,
  });
}

import { db, dbReady } from "@/db";
import { appointments, services, stores, users } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import type { AppointmentStatus } from "@/db/schema";

export type AppointmentAdminRow = {
  id: string;
  userId: string;
  userName: string;
  petId: string | null;
  petNameSnapshot: string | null;
  serviceId: string;
  serviceName: string;
  storeId: string;
  storeName: string;
  startsAt: Date;
  endsAt: Date;
  status: AppointmentStatus;
  notes: string | null;
  cancelReason: string | null;
};

export interface GetAppointmentsFilter {
  storeId?: string;
  dateRangeStart?: Date;
  dateRangeEnd?: Date;
  status?: AppointmentStatus;
}

export async function getAppointments(
  filter: GetAppointmentsFilter = {},
): Promise<AppointmentAdminRow[]> {
  await dbReady;

  const conditions = [];
  if (filter.storeId) conditions.push(eq(appointments.storeId, filter.storeId));
  if (filter.dateRangeStart) conditions.push(gte(appointments.startsAt, filter.dateRangeStart));
  if (filter.dateRangeEnd) conditions.push(lte(appointments.startsAt, filter.dateRangeEnd));
  if (filter.status) conditions.push(eq(appointments.status, filter.status));

  const rows = await db
    .select({
      id: appointments.id,
      userId: appointments.userId,
      userName: users.name,
      petId: appointments.petId,
      petNameSnapshot: appointments.petNameSnapshot,
      serviceId: appointments.serviceId,
      serviceName: services.name,
      storeId: appointments.storeId,
      storeName: stores.name,
      startsAt: appointments.startsAt,
      endsAt: appointments.endsAt,
      status: appointments.status,
      notes: appointments.notes,
      cancelReason: appointments.cancelReason,
    })
    .from(appointments)
    .leftJoin(users, eq(appointments.userId, users.id))
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .leftJoin(stores, eq(appointments.storeId, stores.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    userName: r.userName ?? "Unknown",
    petId: r.petId,
    petNameSnapshot: r.petNameSnapshot,
    serviceId: r.serviceId,
    serviceName: r.serviceName ?? "Unknown",
    storeId: r.storeId,
    storeName: r.storeName ?? "Unknown",
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    status: r.status as AppointmentStatus,
    notes: r.notes,
    cancelReason: r.cancelReason,
  }));
}

"use server";

/**
 * Cuenta appointments actions — F3.4 (APPT-1)
 * getOwnAppointmentsWithDb: user-scoped query, no bulk-load + JS filter.
 */
import { db } from "@/db";
import { appointments, services, stores, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { AppointmentStatus } from "@/db/schema";

type AnyDb = typeof db;

export type OwnAppointmentRow = {
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

export async function getOwnAppointmentsWithDb(
  database: AnyDb,
  userId: string,
): Promise<OwnAppointmentRow[]> {
  const rows = await database
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
    .where(eq(appointments.userId, userId));

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    userName: r.userName ?? "",
    petId: r.petId,
    petNameSnapshot: r.petNameSnapshot,
    serviceId: r.serviceId,
    serviceName: r.serviceName ?? "",
    storeId: r.storeId,
    storeName: r.storeName ?? "",
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    status: r.status as AppointmentStatus,
    notes: r.notes,
    cancelReason: r.cancelReason,
  }));
}

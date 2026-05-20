import "server-only";
import { db } from "@/db";
import { users, appointments, services, pointsTransactions, USER_ROLES } from "@/db/schema";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import type { AppointmentStatus } from "@/db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  rut: string | null;
  phone: string | null;
  totalPoints: number | null;
}

export interface AppointmentSummary {
  id: string;
  serviceName: string;
  startsAt: Date;
  status: AppointmentStatus;
}

export interface CustomerDetail {
  user: CustomerRow;
  totalPoints: number;
  recentAppointments: AppointmentSummary[];
}

// ---------------------------------------------------------------------------
// searchCustomers
// ---------------------------------------------------------------------------
export async function searchCustomers({
  query,
  limit = 20,
}: {
  query: string;
  limit?: number;
}): Promise<CustomerRow[]> {
  if (!query) return [];

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      rut: users.rut,
      phone: users.phone,
    })
    .from(users)
    .where(
      and(
        eq(users.role, USER_ROLES.CUSTOMER),
        or(
          ilike(users.name, `%${query}%`),
          ilike(users.email, `%${query}%`),
          ilike(users.rut, `%${query}%`),
        ),
      ),
    )
    .limit(limit);

  return rows.map((r) => ({ ...r, totalPoints: null }));
}

// ---------------------------------------------------------------------------
// getCustomerDetail
// ---------------------------------------------------------------------------
export async function getCustomerDetail({
  userId,
}: {
  userId: string;
}): Promise<CustomerDetail | null> {
  const userRows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      rut: users.rut,
      phone: users.phone,
      role: users.role,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (userRows.length === 0) return null;

  const user = userRows[0];
  if (user.role !== USER_ROLES.CUSTOMER) return null;

  const [pointsRows, apptRows] = await Promise.all([
    db
      .select({ balanceAfter: pointsTransactions.balanceAfter })
      .from(pointsTransactions)
      .where(eq(pointsTransactions.userId, userId))
      .orderBy(desc(pointsTransactions.createdAt))
      .limit(1),
    db
      .select({
        id: appointments.id,
        serviceName: services.name,
        startsAt: appointments.startsAt,
        status: appointments.status,
      })
      .from(appointments)
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(eq(appointments.userId, userId))
      .orderBy(desc(appointments.startsAt))
      .limit(5),
  ]);

  const totalPoints = pointsRows[0]?.balanceAfter ?? 0;
  const recentAppointments = apptRows.map((r) => ({
    id: r.id,
    serviceName: r.serviceName ?? "",
    startsAt: r.startsAt,
    status: r.status as AppointmentStatus,
  }));

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      rut: user.rut,
      phone: user.phone,
      totalPoints: null,
    },
    totalPoints,
    recentAppointments,
  };
}

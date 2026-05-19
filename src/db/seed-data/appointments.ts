import type { InferInsertModel } from "drizzle-orm";
import { appointments, APPOINTMENT_STATUS } from "@/db/schema";
import { startOfDay, addDays, subDays, setHours } from "date-fns";

type NewAppointment = InferInsertModel<typeof appointments>;

// Use a fixed demo base date for deterministic offsets
const DEMO_NOW = startOfDay(new Date("2026-05-20T00:00:00.000Z"));

function makeAppt(
  id: string,
  userId: string,
  serviceId: string,
  storeId: string,
  startDate: Date,
  status: NewAppointment["status"],
  petNameSnapshot?: string,
  petId?: string,
): NewAppointment {
  const startsAt = setHours(startDate, 10);
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000); // +1h
  return {
    id,
    userId,
    petId: petId ?? null,
    petNameSnapshot: petNameSnapshot ?? null,
    serviceId,
    storeId,
    startsAt,
    endsAt,
    status,
    notes: null,
    cancelReason: null,
  };
}

export const seedAppointments: NewAppointment[] = [
  // Camila — upcoming scheduled (S-CUENTA-1)
  makeAppt(
    "appt-camila-upcoming",
    "user-camila-demo",
    "svc-bath-trim",
    "providencia",
    addDays(DEMO_NOW, 3),
    APPOINTMENT_STATUS.SCHEDULED,
    "Tobi",
    "pet-tobi-camila",
  ),

  // Camila — past attended (S-CUENTA-2)
  makeAppt(
    "appt-camila-past",
    "user-camila-demo",
    "svc-vet-consult",
    "las-condes",
    subDays(DEMO_NOW, 14),
    APPOINTMENT_STATUS.ATTENDED,
    "Tobi",
    "pet-tobi-camila",
  ),

  // Admin — a couple of extra appointments for realistic data
  makeAppt(
    "appt-admin-1",
    "user-admin-demo",
    "svc-meds-pickup",
    "providencia",
    addDays(DEMO_NOW, 7),
    APPOINTMENT_STATUS.SCHEDULED,
  ),
  makeAppt(
    "appt-admin-2",
    "user-admin-demo",
    "svc-bath-trim",
    "las-condes",
    subDays(DEMO_NOW, 30),
    APPOINTMENT_STATUS.ATTENDED,
  ),

  // Staff — historical
  makeAppt(
    "appt-staff-1",
    "user-staff-centro",
    "svc-vet-consult",
    "providencia",
    subDays(DEMO_NOW, 7),
    APPOINTMENT_STATUS.CANCELED,
  ),

  // Additional scheduled for display variety
  makeAppt(
    "appt-camila-upcoming-2",
    "user-camila-demo",
    "svc-vet-consult",
    "providencia",
    addDays(DEMO_NOW, 10),
    APPOINTMENT_STATUS.SCHEDULED,
    "Tobi",
    "pet-tobi-camila",
  ),

  makeAppt(
    "appt-staff-2",
    "user-staff-centro",
    "svc-bath-trim",
    "providencia",
    subDays(DEMO_NOW, 2),
    APPOINTMENT_STATUS.NO_SHOW,
  ),

  makeAppt(
    "appt-admin-3",
    "user-admin-demo",
    "svc-vet-consult",
    "las-condes",
    subDays(DEMO_NOW, 60),
    APPOINTMENT_STATUS.ATTENDED,
  ),
];

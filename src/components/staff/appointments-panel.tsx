import { markAppointmentAttended, markAppointmentNoShow } from "@/app/actions/staff/appointments";
import { APPOINTMENT_STATUS } from "@/db/schema";
import type { AppointmentAdminRow } from "@/lib/staff/appointments";

interface AppointmentsPanelProps {
  storeId: string;
  initialAppointments: AppointmentAdminRow[];
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Agendada",
  attended: "Atendida",
  no_show: "No asistió",
  canceled: "Cancelada",
};

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-800",
  attended: "bg-green-100 text-green-800",
  no_show: "bg-red-100 text-red-800",
  canceled: "bg-gray-100 text-gray-600",
};

export function AppointmentsPanel({ initialAppointments }: AppointmentsPanelProps) {
  if (initialAppointments.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No hay citas programadas para hoy.</p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {initialAppointments.map((appt) => (
        <li key={appt.id} className="rounded-lg border border-border p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium">
              {appt.startsAt.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <span className="text-sm">{appt.userName}</span>
            {appt.petNameSnapshot && (
              <span className="text-sm text-muted-foreground">· {appt.petNameSnapshot}</span>
            )}
            <span className="text-sm text-muted-foreground">· {appt.serviceName}</span>
            <span
              className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[appt.status] ?? ""}`}
            >
              {STATUS_LABELS[appt.status] ?? appt.status}
            </span>
          </div>
          {appt.status === APPOINTMENT_STATUS.SCHEDULED && (
            <div className="mt-3 flex gap-2">
              <form action={markAppointmentAttended.bind(null, { appointmentId: appt.id })}>
                <button
                  type="submit"
                  className="h-14 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
                >
                  Marcar atendida
                </button>
              </form>
              <form action={markAppointmentNoShow.bind(null, { appointmentId: appt.id })}>
                <button
                  type="submit"
                  className="h-14 rounded-lg border border-border px-4 text-sm font-medium"
                >
                  No asistió
                </button>
              </form>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { cancelOwnAppointment } from "@/app/actions/appointments";
import type { AppointmentAdminRow } from "@/lib/admin/appointments";

type Props = {
  rows: AppointmentAdminRow[];
  showCancel: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Programada",
  attended: "Atendida",
  canceled: "Cancelada",
  no_show: "No se presentó",
};

export function CitasClient({ rows, showCancel }: Props) {
  const [, startTransition] = useTransition();

  function handleCancel(id: string) {
    const reason = "Cancelado por el cliente";
    startTransition(async () => {
      const result = await cancelOwnAppointment({ appointmentId: id, cancelReason: reason });
      if (!result.ok) {
        if (result.error === "too_late_to_cancel") {
          toast.error(
            "No podés cancelar con menos de 2 horas de anticipación. Por favor contactá a la sucursal.",
          );
        } else {
          toast.error("Error al cancelar la cita.");
        }
      } else {
        toast.success("Cita cancelada correctamente.");
      }
    });
  }

  return (
    <div className="space-y-3">
      {rows.map((appt) => (
        <div
          key={appt.id}
          className="rounded-lg border p-4 flex items-start justify-between gap-4"
        >
          <div className="space-y-1">
            <p className="font-semibold">{appt.serviceName}</p>
            <p className="text-sm text-muted-foreground">
              {appt.storeName} ·{" "}
              {appt.startsAt.toLocaleString("es-CL", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              Estado: {STATUS_LABEL[appt.status] ?? appt.status}
            </p>
          </div>
          {showCancel && appt.status === "scheduled" && (
            <button
              onClick={() => handleCancel(appt.id)}
              className="shrink-0 rounded-md border border-destructive px-3 py-1 text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              Cancelar
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

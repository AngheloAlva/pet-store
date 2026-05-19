"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  cancelAppointment,
  updateAppointment,
} from "@/app/actions/admin/appointments-admin";
import type { AppointmentAdminRow } from "@/lib/admin/appointments";

type Props = {
  rows: AppointmentAdminRow[];
};

export function AppointmentsClient({ rows }: Props) {
  const [, startTransition] = useTransition();

  function handleMarkAttended(id: string) {
    startTransition(async () => {
      const result = await updateAppointment({ appointmentId: id, status: "attended" });
      if (!result.ok) toast.error("Error al actualizar");
      else toast.success("Marcado como atendido");
    });
  }

  function handleCancel(id: string) {
    startTransition(async () => {
      const result = await cancelAppointment({
        appointmentId: id,
        cancelReason: "Cancelado por admin",
      });
      if (!result.ok) toast.error("Error al cancelar");
      else toast.success("Cita cancelada");
    });
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead>Servicio</TableHead>
          <TableHead>Sucursal</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground">
              No hay citas registradas.
            </TableCell>
          </TableRow>
        )}
        {rows.map((appt) => (
          <TableRow key={appt.id}>
            <TableCell className="font-medium">{appt.userName}</TableCell>
            <TableCell>{appt.serviceName}</TableCell>
            <TableCell>{appt.storeName}</TableCell>
            <TableCell>
              {appt.startsAt.toLocaleString("es-CL", {
                dateStyle: "short",
                timeStyle: "short",
              })}
            </TableCell>
            <TableCell>{appt.status}</TableCell>
            <TableCell>
              {appt.status === "scheduled" && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleMarkAttended(appt.id)}>
                    Atendido
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleCancel(appt.id)}
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

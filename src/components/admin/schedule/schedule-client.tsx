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
import { deleteScheduleConfig } from "@/app/actions/admin/schedule-configs";
import { deleteBlockedSlot } from "@/app/actions/admin/blocked-slots";
import type { ScheduleConfigRow, BlockedSlotRow } from "@/lib/admin/schedule-configs";

const WEEKDAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function fmtHHMM(n: number): string {
  const h = Math.floor(n / 100).toString().padStart(2, "0");
  const m = (n % 100).toString().padStart(2, "0");
  return `${h}:${m}`;
}

type Props = {
  scheduleConfigs: ScheduleConfigRow[];
  blockedSlots: BlockedSlotRow[];
};

export function ScheduleClient({ scheduleConfigs, blockedSlots }: Props) {
  const [, startTransition] = useTransition();

  function handleDeleteConfig(id: string) {
    startTransition(async () => {
      const result = await deleteScheduleConfig(id);
      if (!result.ok) toast.error("Error al eliminar");
      else toast.success("Configuración eliminada");
    });
  }

  function handleDeleteBlockedSlot(id: string) {
    startTransition(async () => {
      const result = await deleteBlockedSlot(id);
      if (!result.ok) toast.error("Error al eliminar");
      else toast.success("Bloqueo eliminado");
    });
  }

  return (
    <div className="space-y-8">
      {/* Schedule configs */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Configuraciones de horario</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sucursal</TableHead>
              <TableHead>Servicio</TableHead>
              <TableHead>Día</TableHead>
              <TableHead>Inicio</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead>Intervalo</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scheduleConfigs.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No hay configuraciones de horario.
                </TableCell>
              </TableRow>
            )}
            {scheduleConfigs.map((cfg) => (
              <TableRow key={cfg.id}>
                <TableCell>{cfg.storeId}</TableCell>
                <TableCell>{cfg.serviceId ?? "Todos"}</TableCell>
                <TableCell>{WEEKDAY_NAMES[cfg.weekday]}</TableCell>
                <TableCell>{fmtHHMM(cfg.startHHMM)}</TableCell>
                <TableCell>{fmtHHMM(cfg.endHHMM)}</TableCell>
                <TableCell>{cfg.slotMinutes} min</TableCell>
                <TableCell>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteConfig(cfg.id)}
                  >
                    Eliminar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      {/* Blocked slots */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Slots bloqueados</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sucursal</TableHead>
              <TableHead>Inicio</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead>Razón</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {blockedSlots.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No hay bloqueos registrados.
                </TableCell>
              </TableRow>
            )}
            {blockedSlots.map((bs) => (
              <TableRow key={bs.id}>
                <TableCell>{bs.storeId}</TableCell>
                <TableCell>{bs.startsAt.toLocaleString("es-CL")}</TableCell>
                <TableCell>{bs.endsAt.toLocaleString("es-CL")}</TableCell>
                <TableCell>{bs.reason ?? "—"}</TableCell>
                <TableCell>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteBlockedSlot(bs.id)}
                  >
                    Eliminar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}

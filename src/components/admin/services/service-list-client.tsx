"use client";

import { useState, useTransition } from "react";
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
import { deleteService } from "@/app/actions/admin/services";
import type { ServiceRow } from "@/lib/admin/services";

type Props = {
  rows: ServiceRow[];
  onAdd: () => void;
};

export function ServiceListClient({ rows, onAdd }: Props) {
  const [, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteService(id);
      if (!result.ok) {
        toast.error(result.errors.formErrors[0] ?? "Error al eliminar");
      } else {
        toast.success("Servicio eliminado");
      }
      setDeletingId(null);
    });
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={onAdd}>Agregar servicio</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Duración</TableHead>
            <TableHead>Precio</TableHead>
            <TableHead>Activo</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No hay servicios registrados.
              </TableCell>
            </TableRow>
          )}
          {rows.map((svc) => (
            <TableRow key={svc.id}>
              <TableCell className="font-medium">{svc.name}</TableCell>
              <TableCell>{svc.durationMin} min</TableCell>
              <TableCell>
                {new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(
                  svc.priceCents / 100,
                )}
              </TableCell>
              <TableCell>{svc.active ? "Sí" : "No"}</TableCell>
              <TableCell>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deletingId === svc.id}
                  onClick={() => handleDelete(svc.id)}
                >
                  Eliminar
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}

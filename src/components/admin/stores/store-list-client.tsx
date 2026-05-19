"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
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
import { DeleteStoreDialog } from "./delete-store-dialog";
import { deleteStore } from "@/app/actions/admin/stores";
import type { AdminStoreRow } from "@/lib/admin/stores";

type Props = {
  rows: AdminStoreRow[];
};

export function StoreListClient({ rows }: Props) {
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    store?: AdminStoreRow;
  }>({ open: false });
  const [, startTransition] = useTransition();

  async function handleDeleteConfirm() {
    if (!deleteDialog.store) return;
    startTransition(async () => {
      const result = await deleteStore(deleteDialog.store!.id);
      if (!result.ok) {
        toast.error(result.errors.formErrors[0] ?? "Error al eliminar");
      } else {
        toast.success("Sucursal eliminada");
      }
      setDeleteDialog({ open: false });
    });
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Comuna</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>Servicios</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((store) => (
            <TableRow key={store.id}>
              <TableCell className="font-medium">{store.name}</TableCell>
              <TableCell>{store.commune}</TableCell>
              <TableCell>{store.phone}</TableCell>
              <TableCell>
                {store.servicesCount === 0
                  ? "Sin servicios"
                  : `${store.servicesCount} servicio${store.servicesCount !== 1 ? "s" : ""}`}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Link
                    href={`/admin/sucursales/${store.id}/editar`}
                    className="text-sm text-primary hover:underline"
                  >
                    Editar
                  </Link>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setDeleteDialog({ open: true, store })
                    }
                  >
                    Eliminar
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No hay sucursales
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <DeleteStoreDialog
        storeName={deleteDialog.store?.name}
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}

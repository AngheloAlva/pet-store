"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import type { AdminUserRow } from "@/lib/admin/users";

type Props = {
  rows: AdminUserRow[];
};

export function UsersListClient({ rows }: Props) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const lower = q.toLowerCase();
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(lower) ||
        r.email.toLowerCase().includes(lower) ||
        (r.rut ?? "").toLowerCase().includes(lower),
    );
  }, [rows, q]);

  return (
    <div className="space-y-4">
      <Input
        placeholder="Buscar por nombre, email o RUT..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Buscar usuarios"
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>RUT</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Demo</TableHead>
            <TableHead>Sucursal</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.rut ?? "—"}</TableCell>
              <TableCell>
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  {user.role}
                </span>
              </TableCell>
              <TableCell>
                {user.isDemoSeed && (
                  <span className="rounded bg-amber-100 text-amber-800 px-1.5 py-0.5 text-xs">
                    Demo
                  </span>
                )}
              </TableCell>
              <TableCell>{user.storeName ?? "—"}</TableCell>
              <TableCell>
                <Link
                  href={`/admin/usuarios/${user.id}`}
                  className="text-sm text-primary hover:underline"
                >
                  Ver
                </Link>
              </TableCell>
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center text-muted-foreground"
              >
                No hay usuarios con ese criterio
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

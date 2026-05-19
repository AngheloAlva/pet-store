"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAppForm } from "@/components/ui/tanstack-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { updateUserIdentitySchema, type ZodFlatError } from "@/app/actions/admin/users.schema";
import { deleteUser } from "@/app/actions/admin/users";
import { DeleteUserDialog } from "./delete-user-dialog";
import type { UserForEdit } from "@/lib/admin/users";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Props = {
  user: UserForEdit;
  stores: Array<{ id: string; name: string }>;
  action: (
    input: unknown,
  ) => Promise<{ ok: true } | { ok: false; errors: ZodFlatError }>;
  onDeleteSuccess: () => void;
};

const ROLE_OPTIONS = [
  { value: "customer", label: "Cliente" },
  { value: "staff", label: "Staff" },
  { value: "admin", label: "Admin" },
];

// ---------------------------------------------------------------------------
// UserIdentityForm
// ---------------------------------------------------------------------------
export function UserIdentityForm({ user, stores, action, onDeleteSuccess }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const form = useAppForm({
    defaultValues: {
      name: user.name ?? "",
      email: user.email ?? "",
      rut: user.rut ?? "",
      phone: user.phone ?? "",
      role: user.role ?? "customer",
      storeId: user.storeId ?? "",
    },
    validators: {
      onChange: ({ value }) => {
        const result = updateUserIdentitySchema.safeParse({
          ...value,
          rut: value.rut || null,
          phone: value.phone || null,
          storeId: value.storeId || null,
        });
        if (result.success) return undefined;
        const fields: Record<string, string> = {};
        for (const issue of result.error.issues) {
          if (!issue.path.length) continue;
          const path = issue.path.reduce<string>((acc, segment, i) => {
            if (typeof segment === "number") return `${acc}[${segment}]`;
            return i === 0 ? String(segment) : `${acc}.${segment}`;
          }, "");
          if (path && !fields[path]) fields[path] = issue.message;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { fields } as any;
      },
    },
  });

  async function handleSubmit() {
    const values = form.state.values;
    const payload = {
      name: values.name,
      email: values.email,
      rut: values.rut || null,
      phone: values.phone || null,
      role: values.role,
      storeId: values.storeId || null,
    };

    startTransition(async () => {
      const result = await action(payload);

      if (!result.ok) {
        const errors = result.errors;
        if (errors.fieldErrors) {
          for (const [field, messages] of Object.entries(errors.fieldErrors)) {
            const msgs = messages as string[] | undefined;
            if (msgs && msgs.length > 0) {
              form.setFieldMeta(field as never, (prev) => ({
                ...prev,
                errorMap: { ...(prev?.errorMap ?? {}), onServer: msgs[0] },
                isTouched: true,
              }));
            }
          }
        }
        toast.error("Hubo errores en el formulario");
        return;
      }

      toast.success("Usuario actualizado");
      router.refresh();
    });
  }

  async function handleDeleteConfirm() {
    startTransition(async () => {
      const result = await deleteUser(user.id);
      if (!result.ok) {
        toast.error(result.errors.formErrors[0] ?? "Error al eliminar");
        return;
      }
      toast.success("Usuario eliminado");
      onDeleteSuccess();
    });
  }

  return (
    <div className="space-y-8">
      {/* Identity panel */}
      <section className="space-y-4 rounded-lg border p-6">
        <h2 className="text-xl font-semibold">Identidad</h2>

        {user.isDemoSeed && (
          <div
            role="alert"
            className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800"
          >
            Usuario demo — no editable
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSubmit();
          }}
          className="space-y-4"
        >
          {/* Name */}
          <form.AppField name="name">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="user-name">Nombre *</FieldLabel>
                <Input
                  id="user-name"
                  placeholder="Nombre completo"
                  value={field.state.value}
                  disabled={user.isDemoSeed}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                {field.state.meta.errors.length > 0 && (
                  <FieldError>{String(field.state.meta.errors[0])}</FieldError>
                )}
              </Field>
            )}
          </form.AppField>

          {/* Email */}
          <form.AppField name="email">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="user-email">Email *</FieldLabel>
                <Input
                  id="user-email"
                  type="email"
                  placeholder="correo@ejemplo.cl"
                  value={field.state.value}
                  disabled={user.isDemoSeed}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                {field.state.meta.errors.length > 0 && (
                  <FieldError>{String(field.state.meta.errors[0])}</FieldError>
                )}
              </Field>
            )}
          </form.AppField>

          {/* RUT */}
          <form.AppField name="rut">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="user-rut">RUT</FieldLabel>
                <Input
                  id="user-rut"
                  placeholder="12.345.678-9"
                  value={field.state.value}
                  disabled={user.isDemoSeed}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                {field.state.meta.errors.length > 0 && (
                  <FieldError>{String(field.state.meta.errors[0])}</FieldError>
                )}
              </Field>
            )}
          </form.AppField>

          {/* Phone */}
          <form.AppField name="phone">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="user-phone">Teléfono</FieldLabel>
                <Input
                  id="user-phone"
                  placeholder="+56 9 1234 5678"
                  value={field.state.value}
                  disabled={user.isDemoSeed}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </Field>
            )}
          </form.AppField>

          {/* Role */}
          <form.AppField name="role">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="user-role">Rol *</FieldLabel>
                <select
                  id="user-role"
                  value={field.state.value}
                  disabled={user.isDemoSeed}
                  onChange={(e) => field.handleChange(e.target.value as "customer" | "admin" | "staff")}
                  onBlur={field.handleBlur}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {field.state.meta.errors.length > 0 && (
                  <FieldError>{String(field.state.meta.errors[0])}</FieldError>
                )}
              </Field>
            )}
          </form.AppField>

          {/* StoreId */}
          <form.AppField name="storeId">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="user-store">Sucursal</FieldLabel>
                <select
                  id="user-store"
                  value={field.state.value ?? ""}
                  disabled={user.isDemoSeed}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Sin sucursal</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </form.AppField>

          {/* Submit — hidden for demo-seed */}
          {!user.isDemoSeed && (
            <Button type="submit">Guardar</Button>
          )}
        </form>

        {/* Delete button */}
        <div className="pt-2 border-t">
          <Button
            type="button"
            variant="destructive"
            disabled={user.isDemoSeed}
            title={
              user.isDemoSeed
                ? "No se puede eliminar un usuario demo"
                : undefined
            }
            onClick={() => !user.isDemoSeed && setDeleteDialogOpen(true)}
          >
            Eliminar usuario
          </Button>
        </div>
      </section>

      {/* Points panel — STUB (F2.4) */}
      <section className="space-y-4 rounded-lg border p-6">
        <h2 className="text-xl font-semibold">Historial de puntos</h2>
        <p>Historial de puntos disponible en F2.4</p>
        <fieldset disabled>
          <div className="flex gap-2">
            <Input type="number" placeholder="0" disabled />
            {/* F2.4: TODO — wire up points adjustment action */}
            <Button type="button" disabled>
              Ajustar puntos
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Ajuste de puntos disponible en F2.4
          </p>
        </fieldset>
      </section>

      {/* Pets panel — STUB (F2.4) */}
      <section className="space-y-2 rounded-lg border p-6">
        <h2 className="text-xl font-semibold">Mascotas</h2>
        {/* F2.4: TODO — render pets list */}
        <p>Mascotas próximamente (F2.4)</p>
      </section>

      {/* Delete dialog */}
      <DeleteUserDialog
        userName={user.name}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAppForm } from "@/components/ui/tanstack-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  createCategory,
  updateCategory,
} from "@/app/actions/admin/categories";
import { slugify } from "@/lib/admin/slugify";
import { SPECIES_OPTIONAL } from "@/app/actions/admin/categories.schema";
import type { CategoryRow } from "@/lib/admin/categories";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
type Props = {
  mode: "create" | "edit";
  initial?: CategoryRow;
  parentOptions: Array<{ id: string; name: string }>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const SPECIES_LABELS: Record<string, string> = {
  dog: "Perro",
  cat: "Gato",
  bird: "Ave",
  fish: "Pez",
  small_pet: "Pequeña mascota",
  reptile: "Reptil",
};

// ---------------------------------------------------------------------------
// CategoryEditDialog
// ---------------------------------------------------------------------------
export function CategoryEditDialog({
  mode,
  initial,
  parentOptions,
  open,
  onOpenChange,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [slugManuallyOverridden, setSlugManuallyOverridden] = useState(
    mode === "edit",
  );

  const form = useAppForm({
    defaultValues: {
      name: initial?.name ?? "",
      slug: initial?.slug ?? "",
      parentId: initial?.parentId ?? "",
      species: initial?.species ?? "",
    },
  });

  // Slug auto-sync
  const handleNameChange = useCallback(
    (value: string, fieldChange: (v: string) => void) => {
      fieldChange(value);
      if (!slugManuallyOverridden) {
        form.setFieldValue("slug", slugify(value));
      }
    },
    [slugManuallyOverridden, form],
  );

  async function handleSubmit() {
    const values = form.state.values;

    const payload = {
      name: values.name,
      slug: values.slug,
      parentId: values.parentId || null,
      species: (values.species as string) || null,
    };

    startTransition(async () => {
      let result;
      if (mode === "create") {
        result = await createCategory(payload);
      } else {
        result = await updateCategory(initial!.id, payload);
      }

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

      toast.success(
        mode === "create" ? "Categoría creada" : "Categoría actualizada",
      );
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {mode === "create" ? "Nueva categoría" : "Editar categoría"}
          </AlertDialogTitle>
        </AlertDialogHeader>

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
                <FieldLabel htmlFor="cat-name">Nombre *</FieldLabel>
                <Input
                  id="cat-name"
                  placeholder="Nombre de la categoría"
                  value={field.state.value}
                  onChange={(e) =>
                    handleNameChange(e.target.value, field.handleChange)
                  }
                  onBlur={field.handleBlur}
                />
                {field.state.meta.errors.length > 0 && (
                  <FieldError>
                    {String(field.state.meta.errors[0])}
                  </FieldError>
                )}
              </Field>
            )}
          </form.AppField>

          {/* Slug */}
          <form.AppField name="slug">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="cat-slug">Slug *</FieldLabel>
                <Input
                  id="cat-slug"
                  placeholder="slug-de-la-categoria"
                  value={field.state.value}
                  onChange={(e) => {
                    setSlugManuallyOverridden(true);
                    field.handleChange(e.target.value);
                  }}
                  onBlur={field.handleBlur}
                />
                {field.state.meta.errors.length > 0 && (
                  <FieldError>
                    {String(field.state.meta.errors[0])}
                  </FieldError>
                )}
              </Field>
            )}
          </form.AppField>

          {/* ParentId */}
          <form.AppField name="parentId">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="cat-parent">Categoría padre</FieldLabel>
                <select
                  id="cat-parent"
                  value={field.state.value ?? ""}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Sin padre</option>
                  {parentOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </form.AppField>

          {/* Species */}
          <form.AppField name="species">
            {(field) => (
              <Field>
                <FieldLabel htmlFor="cat-species">Especie</FieldLabel>
                <select
                  id="cat-species"
                  value={field.state.value ?? ""}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Sin especie</option>
                  {SPECIES_OPTIONAL.map((s) => (
                    <option key={s} value={s}>
                      {SPECIES_LABELS[s] ?? s}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </form.AppField>

          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
            <Button type="submit">
              {mode === "create" ? "Crear" : "Guardar"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

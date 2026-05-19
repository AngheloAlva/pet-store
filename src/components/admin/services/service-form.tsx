"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useAppForm } from "@/components/ui/tanstack-form";
import { createService } from "@/app/actions/admin/services";

type Props = {
  onSuccess?: () => void;
};

export function ServiceForm({ onSuccess }: Props) {
  const [, startTransition] = useTransition();

  const form = useAppForm({
    defaultValues: {
      name: "",
      slug: "",
      durationMin: 60,
      priceCents: 0,
      description: "",
      active: true,
    },
    onSubmit: ({ value }) => {
      startTransition(async () => {
        const result = await createService({
          ...value,
          durationMin: Number(value.durationMin),
          priceCents: Number(value.priceCents),
        });
        if (!result.ok) {
          toast.error(result.errors.formErrors[0] ?? "Error al crear servicio");
        } else {
          toast.success("Servicio creado");
          form.reset();
          onSuccess?.();
        }
      });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="space-y-4"
    >
      <form.AppField name="name">
        {(field) => <field.TextField label="Nombre" />}
      </form.AppField>
      <form.AppField name="slug">
        {(field) => <field.TextField label="Slug" />}
      </form.AppField>
      <form.AppField name="durationMin">
        {(field) => <field.TextField label="Duración (min)" type="number" />}
      </form.AppField>
      <form.AppField name="priceCents">
        {(field) => <field.TextField label="Precio (centavos)" type="number" />}
      </form.AppField>
      <form.AppField name="description">
        {(field) => <field.TextareaField label="Descripción" />}
      </form.AppField>
      <form.Subscribe selector={(s) => s.isSubmitting}>
        {(isSubmitting) => (
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            Guardar
          </button>
        )}
      </form.Subscribe>
    </form>
  );
}

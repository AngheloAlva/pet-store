"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAppForm } from "@/components/ui/tanstack-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { storeFormSchema, type ZodFlatError, type StoreSchedule } from "@/app/actions/admin/stores.schema";
import { slugify } from "@/lib/admin/slugify";
import { ScheduleEditor } from "./schedule-editor";
import type { StoreForEdit } from "@/lib/admin/stores";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type StoreFormValues = {
  name: string;
  slug: string;
  address: string;
  commune: string;
  phone: string;
  lat: number | string;
  lng: number | string;
  schedule: StoreSchedule;
  services: string[];
  reference: string;
};

type Props = {
  mode: "create" | "edit";
  initial?: StoreForEdit;
  action: (
    input: unknown,
  ) => Promise<{ ok: true; id?: string } | { ok: false; errors: ZodFlatError }>;
};

// ---------------------------------------------------------------------------
// Default schedule (all days open 09:00–18:00)
// ---------------------------------------------------------------------------
const defaultSchedule: StoreSchedule = {
  mon: { open: "09:00", close: "18:00" },
  tue: { open: "09:00", close: "18:00" },
  wed: { open: "09:00", close: "18:00" },
  thu: { open: "09:00", close: "18:00" },
  fri: { open: "09:00", close: "18:00" },
  sat: { open: "09:00", close: "18:00" },
  sun: { open: "09:00", close: "18:00" },
};

// ---------------------------------------------------------------------------
// StoreForm
// ---------------------------------------------------------------------------
export function StoreForm({ mode, initial, action }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [slugManuallyOverridden, setSlugManuallyOverridden] = useState(
    mode === "edit",
  );

  // Services chip state
  const [serviceInput, setServiceInput] = useState("");

  const defaultValues: StoreFormValues = {
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    address: initial?.address ?? "",
    commune: initial?.commune ?? "",
    phone: initial?.phone ?? "",
    lat: initial?.lat ?? "",
    lng: initial?.lng ?? "",
    schedule: initial?.schedule ?? defaultSchedule,
    services: initial?.services ?? [],
    reference: initial?.reference ?? "",
  };

  const form = useAppForm({
    defaultValues,
    validators: {
      onChange: ({ value }) => {
        const result = storeFormSchema.safeParse(value);
        if (result.success) return undefined;
        // Convert Zod issue paths to TanStack bracket notation (mirror of product-form.tsx:170-186)
        const fields: Record<string, string> = {};
        for (const issue of result.error.issues) {
          if (!issue.path.length) continue;
          const path = issue.path.reduce<string>((acc, segment, i) => {
            if (typeof segment === "number") {
              return `${acc}[${segment}]`;
            }
            return i === 0 ? String(segment) : `${acc}.${segment}`;
          }, "");
          if (path && !fields[path]) {
            fields[path] = issue.message;
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return { fields } as any;
      },
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

  // Services chip handlers
  function handleAddService(fieldChange: (v: string[]) => void, currentServices: string[]) {
    const trimmed = serviceInput.trim();
    if (trimmed && !currentServices.includes(trimmed)) {
      fieldChange([...currentServices, trimmed]);
      setServiceInput("");
    }
  }

  function handleRemoveService(
    idx: number,
    fieldChange: (v: string[]) => void,
    currentServices: string[],
  ) {
    fieldChange(currentServices.filter((_, i) => i !== idx));
  }

  // Submit handler
  async function handleSubmit() {
    const values = form.state.values;

    const payload = {
      name: values.name,
      slug: values.slug,
      address: values.address,
      commune: values.commune,
      phone: values.phone,
      lat: Number(values.lat),
      lng: Number(values.lng),
      schedule: values.schedule,
      services: values.services,
      reference: values.reference || null,
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

      toast.success("Sucursal guardada");
      router.push("/admin/sucursales");
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleSubmit();
      }}
      className="space-y-6"
    >
      {/* Name */}
      <form.AppField name="name">
        {(field) => (
          <Field>
            <FieldLabel htmlFor="store-name">Nombre *</FieldLabel>
            <Input
              id="store-name"
              placeholder="Nombre de la sucursal"
              value={field.state.value}
              onChange={(e) => handleNameChange(e.target.value, field.handleChange)}
              onBlur={field.handleBlur}
            />
            {field.state.meta.errors.length > 0 && (
              <FieldError>{String(field.state.meta.errors[0])}</FieldError>
            )}
          </Field>
        )}
      </form.AppField>

      {/* Slug */}
      <form.AppField name="slug">
        {(field) => (
          <Field>
            <FieldLabel htmlFor="store-slug">Slug *</FieldLabel>
            <Input
              id="store-slug"
              placeholder="slug-de-la-sucursal"
              value={field.state.value}
              onChange={(e) => {
                setSlugManuallyOverridden(true);
                field.handleChange(e.target.value);
              }}
              onBlur={field.handleBlur}
            />
            {field.state.meta.errors.length > 0 && (
              <FieldError>{String(field.state.meta.errors[0])}</FieldError>
            )}
          </Field>
        )}
      </form.AppField>

      {/* Address */}
      <form.AppField name="address">
        {(field) => (
          <Field>
            <FieldLabel htmlFor="store-address">Dirección *</FieldLabel>
            <Input
              id="store-address"
              placeholder="Av. Ejemplo 123"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            {field.state.meta.errors.length > 0 && (
              <FieldError>{String(field.state.meta.errors[0])}</FieldError>
            )}
          </Field>
        )}
      </form.AppField>

      {/* Commune */}
      <form.AppField name="commune">
        {(field) => (
          <Field>
            <FieldLabel htmlFor="store-commune">Comuna *</FieldLabel>
            <Input
              id="store-commune"
              placeholder="Santiago"
              value={field.state.value}
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
            <FieldLabel htmlFor="store-phone">Teléfono *</FieldLabel>
            <Input
              id="store-phone"
              placeholder="+56 2 123 4567"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            {field.state.meta.errors.length > 0 && (
              <FieldError>{String(field.state.meta.errors[0])}</FieldError>
            )}
          </Field>
        )}
      </form.AppField>

      {/* Lat / Lng */}
      <div className="grid grid-cols-2 gap-4">
        <form.AppField name="lat">
          {(field) => (
            <Field>
              <FieldLabel htmlFor="store-lat">Latitud *</FieldLabel>
              <Input
                id="store-lat"
                type="number"
                step="any"
                placeholder="-33.45"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
              {field.state.meta.errors.length > 0 && (
                <FieldError>{String(field.state.meta.errors[0])}</FieldError>
              )}
            </Field>
          )}
        </form.AppField>

        <form.AppField name="lng">
          {(field) => (
            <Field>
              <FieldLabel htmlFor="store-lng">Longitud *</FieldLabel>
              <Input
                id="store-lng"
                type="number"
                step="any"
                placeholder="-70.65"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
              />
              {field.state.meta.errors.length > 0 && (
                <FieldError>{String(field.state.meta.errors[0])}</FieldError>
              )}
            </Field>
          )}
        </form.AppField>
      </div>

      {/* Reference */}
      <form.AppField name="reference">
        {(field) => (
          <Field>
            <FieldLabel htmlFor="store-reference">Referencia</FieldLabel>
            <Input
              id="store-reference"
              placeholder="Frente al mall..."
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
            />
            {field.state.meta.errors.length > 0 && (
              <FieldError>{String(field.state.meta.errors[0])}</FieldError>
            )}
          </Field>
        )}
      </form.AppField>

      {/* Services chip input */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Servicios</p>
        <form.AppField name="services">
          {(field) => (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Agregar servicio..."
                  value={serviceInput}
                  onChange={(e) => setServiceInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddService(field.handleChange, field.state.value ?? []);
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    handleAddService(field.handleChange, field.state.value ?? [])
                  }
                >
                  Agregar
                </Button>
              </div>
              {(field.state.value ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {(field.state.value ?? []).map((service, idx) => (
                    <span
                      key={idx}
                      className="flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs"
                    >
                      {service}
                      <button
                        type="button"
                        aria-label={`Eliminar ${service}`}
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() =>
                          handleRemoveService(
                            idx,
                            field.handleChange,
                            field.state.value ?? [],
                          )
                        }
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </form.AppField>
      </div>

      {/* Schedule */}
      <form.AppField name="schedule">
        {(field) => (
          <ScheduleEditor
            value={field.state.value ?? defaultSchedule}
            onChange={field.handleChange}
          />
        )}
      </form.AppField>

      {/* Actions */}
      <div className="flex gap-2">
        <form.AppForm>
          <form.SubmitButton>Guardar</form.SubmitButton>
        </form.AppForm>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/sucursales")}
        >
          Cancelar
        </Button>
      </div>
    </form>
  );
}

"use client";

import { createFormHook, createFormHookContexts } from "@tanstack/react-form";
import { Field, FieldLabel, FieldDescription, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

const { fieldContext, formContext, useFieldContext, useFormContext } =
  createFormHookContexts();

// ---------------------------------------------------------------------------
// TextField
// ---------------------------------------------------------------------------
function TextField({
  label,
  description,
  placeholder,
  type = "text",
}: {
  label: string;
  description?: string;
  placeholder?: string;
  type?: string;
}) {
  const field = useFieldContext<string>();
  const errors = field.state.meta.errors;
  return (
    <Field data-invalid={errors.length > 0 ? "true" : undefined}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        id={field.name}
        name={field.name}
        type={type}
        placeholder={placeholder}
        value={field.state.value ?? ""}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      {errors.length > 0 && <FieldError>{String(errors[0])}</FieldError>}
    </Field>
  );
}

// ---------------------------------------------------------------------------
// NumberField
// ---------------------------------------------------------------------------
function NumberField({
  label,
  description,
  placeholder,
}: {
  label: string;
  description?: string;
  placeholder?: string;
}) {
  const field = useFieldContext<number | string>();
  const errors = field.state.meta.errors;
  return (
    <Field data-invalid={errors.length > 0 ? "true" : undefined}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        id={field.name}
        name={field.name}
        type="number"
        placeholder={placeholder}
        value={field.state.value ?? ""}
        onChange={(e) => field.handleChange(Number(e.target.value))}
        onBlur={field.handleBlur}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      {errors.length > 0 && <FieldError>{String(errors[0])}</FieldError>}
    </Field>
  );
}

// ---------------------------------------------------------------------------
// TextareaField
// ---------------------------------------------------------------------------
function TextareaField({
  label,
  description,
  placeholder,
  rows,
}: {
  label: string;
  description?: string;
  placeholder?: string;
  rows?: number;
}) {
  const field = useFieldContext<string>();
  const errors = field.state.meta.errors;
  return (
    <Field data-invalid={errors.length > 0 ? "true" : undefined}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Textarea
        id={field.name}
        name={field.name}
        placeholder={placeholder}
        rows={rows}
        value={field.state.value ?? ""}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      {errors.length > 0 && <FieldError>{String(errors[0])}</FieldError>}
    </Field>
  );
}

// ---------------------------------------------------------------------------
// CheckboxField
// ---------------------------------------------------------------------------
function CheckboxField({ label }: { label: string }) {
  const field = useFieldContext<boolean>();
  return (
    <Field>
      <div className="flex items-center gap-2">
        <Checkbox
          id={field.name}
          checked={!!field.state.value}
          onCheckedChange={(checked) => field.handleChange(!!checked)}
        />
        <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      </div>
      {field.state.meta.errors.length > 0 && (
        <FieldError>{String(field.state.meta.errors[0])}</FieldError>
      )}
    </Field>
  );
}

// ---------------------------------------------------------------------------
// SelectField — accepts children (option elements) or options array
// ---------------------------------------------------------------------------
function SelectField({
  label,
  options,
}: {
  label: string;
  options: { value: string; label: string }[];
}) {
  const field = useFieldContext<string>();
  const errors = field.state.meta.errors;
  return (
    <Field data-invalid={errors.length > 0 ? "true" : undefined}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <select
        id={field.name}
        name={field.name}
        value={field.state.value ?? ""}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <option value="">Seleccionar...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {errors.length > 0 && <FieldError>{String(errors[0])}</FieldError>}
    </Field>
  );
}

// ---------------------------------------------------------------------------
// SubmitButton
// ---------------------------------------------------------------------------
function SubmitButton({ children }: { children: React.ReactNode }) {
  const form = useFormContext();
  return (
    <form.Subscribe selector={(s) => [s.canSubmit, s.isSubmitting] as const}>
      {([canSubmit, isSubmitting]) => (
        <Button type="submit" disabled={!canSubmit || isSubmitting}>
          {isSubmitting ? "Guardando..." : children}
        </Button>
      )}
    </form.Subscribe>
  );
}

// ---------------------------------------------------------------------------
// Export createFormHook result
// ---------------------------------------------------------------------------
export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextField,
    NumberField,
    SelectField,
    CheckboxField,
    TextareaField,
  },
  formComponents: {
    SubmitButton,
  },
});

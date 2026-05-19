"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { createDemoAccount } from "@/app/actions/session";
import { WarningCircle } from "@phosphor-icons/react";

type ActionState =
  | null
  | { ok: true }
  | { ok: false; error: "email_taken" }
  | { ok: false; error: "invalid_input"; issues: { name?: { _errors: string[] }; email?: { _errors: string[] } } };

async function formAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return createDemoAccount(formData) as Promise<ActionState>;
}

export function CrearDemoForm() {
  const [state, dispatch, isPending] = useActionState(formAction, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok === true) {
      router.push("/");
      router.refresh();
    }
  }, [state, router]);

  const nameErrors =
    state?.ok === false && state.error === "invalid_input" ? state.issues?.name?._errors : null;
  const emailErrors =
    state?.ok === false && state.error === "invalid_input" ? state.issues?.email?._errors : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Disclaimer */}
      <Alert>
        <WarningCircle size={16} />
        <AlertDescription>
          Esta es una cuenta de demostración. Vivirá hasta el próximo reinicio del servidor — no la
          uses para datos reales.
        </AlertDescription>
      </Alert>

      {/* Duplicate email error */}
      {state?.ok === false && state.error === "email_taken" && (
        <Alert variant="destructive">
          <AlertDescription>
            Este correo ya está registrado. Intentá con otro o seleccioná la persona desde el menú.
          </AlertDescription>
        </Alert>
      )}

      <form action={dispatch} className="flex flex-col gap-4">
        <FieldGroup>
          <Field data-invalid={nameErrors && nameErrors.length > 0 ? true : undefined}>
            <FieldLabel htmlFor="name">Nombre</FieldLabel>
            <Input
              id="name"
              name="name"
              placeholder="Tu nombre"
              required
              minLength={2}
              maxLength={60}
              aria-invalid={nameErrors && nameErrors.length > 0 ? true : undefined}
            />
            {nameErrors && nameErrors.length > 0 && (
              <FieldDescription>{nameErrors[0]}</FieldDescription>
            )}
          </Field>

          <Field data-invalid={emailErrors && emailErrors.length > 0 ? true : undefined}>
            <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="tu@ejemplo.com"
              required
              aria-invalid={emailErrors && emailErrors.length > 0 ? true : undefined}
            />
            {emailErrors && emailErrors.length > 0 && (
              <FieldDescription>{emailErrors[0]}</FieldDescription>
            )}
          </Field>
        </FieldGroup>

        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Creando cuenta…" : "Crear cuenta demo"}
        </Button>
      </form>
    </div>
  );
}

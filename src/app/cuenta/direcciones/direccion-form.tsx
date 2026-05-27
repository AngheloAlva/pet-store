"use client";

import { useActionState } from "react";
import { createAddress } from "@/app/actions/cuenta/direcciones";
import type { AddressResult } from "@/app/actions/cuenta/direcciones";

type FormState = AddressResult | null;

async function createAddressAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const input = {
    label: formData.get("label") as string,
    name: formData.get("name") as string,
    street: formData.get("street") as string,
    commune: formData.get("commune") as string,
    region: formData.get("region") as string,
    phone: formData.get("phone") as string,
    notes: (formData.get("notes") as string) || undefined,
  };
  return createAddress(input);
}

interface DireccionFormProps {
  onSuccess?: () => void;
}

export function DireccionForm({ onSuccess: _onSuccess }: DireccionFormProps = {}) {
  const [state, formAction, isPending] = useActionState(createAddressAction, null);

  const error = state && !state.ok ? state : null;
  const success = state?.ok === true;

  return (
    <form action={formAction} className="space-y-4">
      {success && (
        <p className="text-sm text-green-600 font-medium">
          Dirección guardada correctamente.
        </p>
      )}

      {error && error.code === "COMMUNE_NOT_COVERED" && (
        <p className="text-sm text-destructive">
          La comuna ingresada no está dentro de la zona de cobertura.
        </p>
      )}

      {error && error.code === "VALIDATION" && (
        <p className="text-sm text-destructive">
          Por favor revisá los campos del formulario.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="label" className="text-sm font-medium">
            Etiqueta
          </label>
          <input
            id="label"
            name="label"
            type="text"
            placeholder="Casa, Oficina…"
            required
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="name" className="text-sm font-medium">
            Nombre destinatario
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="street" className="text-sm font-medium">
          Calle y número
        </label>
        <input
          id="street"
          name="street"
          type="text"
          required
          className="w-full border rounded-md px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label htmlFor="commune" className="text-sm font-medium">
            Comuna
          </label>
          <input
            id="commune"
            name="commune"
            type="text"
            required
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="region" className="text-sm font-medium">
            Región
          </label>
          <input
            id="region"
            name="region"
            type="text"
            required
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="phone" className="text-sm font-medium">
          Teléfono
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          placeholder="+56912345678"
          required
          className="w-full border rounded-md px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="notes" className="text-sm font-medium">
          Notas (opcional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          className="w-full border rounded-md px-3 py-2 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Guardando…" : "Guardar dirección"}
      </button>
    </form>
  );
}

"use client";

import { useAppForm } from "@/components/ui/tanstack-form";
import { SPECIES } from "@/db/schema";
import { createPet, updatePet } from "@/app/actions/pets";
import {
  createPet as adminCreatePet,
  updatePet as adminUpdatePet,
} from "@/app/actions/admin/pets";
import { useRouter } from "next/navigation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
const SPECIES_LABELS: Record<string, string> = {
  dog: "Perro",
  cat: "Gato",
  exotic: "Exótico",
};

type PetFormValues = {
  userId: string;
  name: string;
  species: string;
  breed: string;
  birthDate: string;
  weightKg: string;
  notes: string;
};

type PetFormProps =
  | {
      mode: "client";
      userId: string;
      petId?: string;
      defaultValues?: Partial<PetFormValues>;
      onSuccess?: () => void;
    }
  | {
      mode: "admin";
      userId?: string;
      petId?: string;
      defaultValues?: Partial<PetFormValues>;
      onSuccess?: () => void;
    };

// ---------------------------------------------------------------------------
// PetForm — shared component for client and admin modes
// ---------------------------------------------------------------------------
export function PetForm(props: PetFormProps) {
  const router = useRouter();
  const isEdit = !!props.petId;

  const form = useAppForm({
    defaultValues: {
      userId: props.mode === "client" ? props.userId : (props.defaultValues?.userId ?? ""),
      name: props.defaultValues?.name ?? "",
      species: props.defaultValues?.species ?? "dog",
      breed: props.defaultValues?.breed ?? "",
      birthDate: props.defaultValues?.birthDate ?? "",
      weightKg: props.defaultValues?.weightKg ?? "",
      notes: props.defaultValues?.notes ?? "",
    } as PetFormValues,
    onSubmit: async ({ value }) => {
      const input = {
        userId: value.userId,
        name: value.name,
        species: value.species,
        breed: value.breed || undefined,
        birthDate: value.birthDate || undefined,
        weightKg: value.weightKg || undefined,
        notes: value.notes || undefined,
      };

      if (isEdit && props.petId) {
        const updateInput = {
          name: input.name,
          species: input.species,
          breed: input.breed,
          birthDate: input.birthDate,
          weightKg: input.weightKg,
          notes: input.notes,
        };
        const result =
          props.mode === "admin"
            ? await adminUpdatePet(props.petId, updateInput)
            : await updatePet(props.petId, updateInput);

        if (result.ok) {
          props.onSuccess?.();
          router.refresh();
        }
      } else {
        const result =
          props.mode === "admin"
            ? await adminCreatePet(input)
            : await createPet(input);

        if (result.ok) {
          props.onSuccess?.();
          router.refresh();
        }
      }
    },
  });

  const speciesOptions = SPECIES.map((s) => ({
    value: s,
    label: SPECIES_LABELS[s] ?? s,
  }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-4"
    >
      {/* Admin mode: show userId field */}
      {props.mode === "admin" && (
        <form.AppField name="userId">
          {(field) => (
            <field.TextField label="ID de usuario" />
          )}
        </form.AppField>
      )}

      <form.AppField name="name">
        {(field) => <field.TextField label="Nombre *" placeholder="Ej: Tobi" />}
      </form.AppField>

      <form.AppField name="species">
        {(field) => (
          <field.SelectField label="Especie *" options={speciesOptions} />
        )}
      </form.AppField>

      <form.AppField name="breed">
        {(field) => (
          <field.TextField label="Raza" placeholder="Ej: Golden Retriever" />
        )}
      </form.AppField>

      <form.AppField name="birthDate">
        {(field) => (
          <field.TextField label="Fecha de nacimiento" type="date" />
        )}
      </form.AppField>

      <form.AppField name="weightKg">
        {(field) => (
          <field.TextField label="Peso (kg)" placeholder="Ej: 28.5" />
        )}
      </form.AppField>

      <form.AppField name="notes">
        {(field) => (
          <field.TextareaField label="Notas" placeholder="Observaciones adicionales..." />
        )}
      </form.AppField>

      <form.AppForm>
        <form.SubmitButton>
          {isEdit ? "Guardar cambios" : "Agregar mascota"}
        </form.SubmitButton>
      </form.AppForm>
    </form>
  );
}

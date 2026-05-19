import { z } from "zod";

// ---------------------------------------------------------------------------
// Schedule schema
// ---------------------------------------------------------------------------
const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

const dayValue = z.union([
  z.object({
    open: z.string().regex(HHMM, { message: "Formato HH:MM" }),
    close: z.string().regex(HHMM, { message: "Formato HH:MM" }),
  }),
  z.object({ closed: z.literal(true) }),
]);

export const storeScheduleSchema = z.object(
  Object.fromEntries(DAY_KEYS.map((d) => [d, dayValue])) as Record<
    (typeof DAY_KEYS)[number],
    typeof dayValue
  >,
);

// ---------------------------------------------------------------------------
// createStoreSchema
// ---------------------------------------------------------------------------
export const createStoreSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Nombre obligatorio" })
    .max(120, { message: "Máximo 120 caracteres" }),
  slug: z
    .string()
    .min(1, { message: "Slug obligatorio" })
    .regex(/^[a-z0-9-]+$/, { message: "Solo minúsculas, números y guiones" }),
  address: z.string().min(1, { message: "Dirección obligatoria" }),
  commune: z.string().min(1, { message: "Comuna obligatoria" }),
  phone: z.string().min(1, { message: "Teléfono obligatorio" }),
  lat: z.coerce.number({ invalid_type_error: "Latitud inválida" }),
  lng: z.coerce.number({ invalid_type_error: "Longitud inválida" }),
  schedule: storeScheduleSchema,
  services: z.array(z.string().min(1)).default([]),
  reference: z.string().nullable().optional(),
});

// ---------------------------------------------------------------------------
// updateStoreSchema — same shape
// ---------------------------------------------------------------------------
export const updateStoreSchema = createStoreSchema;

// ---------------------------------------------------------------------------
// Client-side form schema (lat/lng as string|number before submit)
// ---------------------------------------------------------------------------
export const storeFormSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Nombre obligatorio" })
    .max(120, { message: "Máximo 120 caracteres" }),
  slug: z
    .string()
    .min(1, { message: "Slug obligatorio" })
    .regex(/^[a-z0-9-]+$/, { message: "Solo minúsculas, números y guiones" }),
  address: z.string().min(1, { message: "Dirección obligatoria" }),
  commune: z.string().min(1, { message: "Comuna obligatoria" }),
  phone: z.string().min(1, { message: "Teléfono obligatorio" }),
  lat: z.union([z.number(), z.string()]),
  lng: z.union([z.number(), z.string()]),
  schedule: storeScheduleSchema,
  services: z.array(z.string().min(1)).default([]),
  reference: z.string().nullable().optional(),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type StoreSchedule = z.infer<typeof storeScheduleSchema>;
export type CreateStoreInput = z.infer<typeof createStoreSchema>;
export type ZodFlatError = z.inferFlattenedErrors<typeof createStoreSchema>;

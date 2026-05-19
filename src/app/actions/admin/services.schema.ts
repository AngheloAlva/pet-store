import { z } from "zod";

export const createServiceSchema = z.object({
  name: z.string().min(1, { message: "Nombre obligatorio" }).max(120),
  slug: z
    .string()
    .min(1, { message: "Slug obligatorio" })
    .regex(/^[a-z0-9-]+$/, { message: "Solo minúsculas, números y guiones" }),
  description: z.string().optional(),
  durationMin: z.number().int().positive({ message: "Duración debe ser > 0" }),
  priceCents: z.number().int().min(0, { message: "Precio debe ser >= 0" }),
  requiresPet: z.boolean().optional().default(false),
  species: z.array(z.string()).optional().default([]),
  active: z.boolean().optional().default(true),
});

export const updateServiceSchema = createServiceSchema;

export type ZodFlatError = z.inferFlattenedErrors<typeof createServiceSchema>;

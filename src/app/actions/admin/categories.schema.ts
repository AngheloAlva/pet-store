import { z } from "zod";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const SPECIES_OPTIONAL = [
  "dog",
  "cat",
  "bird",
  "fish",
  "small_pet",
  "reptile",
] as const;

// ---------------------------------------------------------------------------
// createCategorySchema
// ---------------------------------------------------------------------------
export const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, { message: "Nombre obligatorio" })
    .max(80, { message: "Máximo 80 caracteres" }),
  slug: z
    .string()
    .min(1, { message: "Slug obligatorio" })
    .regex(/^[a-z0-9-]+$/, { message: "Solo minúsculas, números y guiones" }),
  parentId: z.string().nullable().optional(),
  species: z.enum(SPECIES_OPTIONAL).nullable().optional(),
});

// ---------------------------------------------------------------------------
// updateCategorySchema — same shape as create
// ---------------------------------------------------------------------------
export const updateCategorySchema = createCategorySchema;

// ---------------------------------------------------------------------------
// reorderCategoriesSchema
// ---------------------------------------------------------------------------
export const reorderCategoriesSchema = z
  .array(z.string().min(1))
  .min(1, { message: "Lista vacía" });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type ZodFlatError = z.inferFlattenedErrors<typeof createCategorySchema>;

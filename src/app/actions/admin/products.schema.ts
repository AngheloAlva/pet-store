import { z } from "zod";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const SPECIES = ["dog", "cat", "bird", "fish", "small_pet", "reptile"] as const;
export const QUANTITY_UNITS = ["kg", "g", "L", "ml", "unidad"] as const;
export const STOCK_STATUS = ["in_stock", "low", "out_of_stock"] as const;

export type SpeciesValue = (typeof SPECIES)[number];
export type QuantityUnit = (typeof QUANTITY_UNITS)[number];
export type StockStatusValue = (typeof STOCK_STATUS)[number];

// ---------------------------------------------------------------------------
// imageSchema
// ---------------------------------------------------------------------------
export const imageSchema = z.object({
  url: z.string().url({ message: "Debe ser una URL válida" }),
  alt: z.string().min(1, { message: "El alt es obligatorio" }),
});

// ---------------------------------------------------------------------------
// variantSchema
// ---------------------------------------------------------------------------
export const variantSchema = z
  .object({
    id: z.string().optional(),
    sku: z.string().min(3, { message: "SKU mínimo 3 caracteres" }),
    name: z.string().min(1, { message: "Nombre obligatorio" }),
    quantityValue: z.coerce.number().positive({ message: "Debe ser mayor a 0" }),
    quantityUnit: z.enum(QUANTITY_UNITS, {
      errorMap: () => ({ message: "Unidad inválida" }),
    }),
    priceAmount: z.coerce
      .number()
      .int({ message: "Sin decimales" })
      .positive({ message: "Precio debe ser mayor a 0" }),
    compareAtAmount: z.coerce.number().int().positive().optional().nullable(),
    barcode: z.string().optional().nullable(),
    stockByStore: z.record(z.string(), z.enum(STOCK_STATUS)),
  })
  .refine(
    (v) => v.compareAtAmount == null || v.compareAtAmount > v.priceAmount,
    {
      message: "El precio de lista debe ser mayor al precio de venta",
      path: ["compareAtAmount"],
    },
  );

// ---------------------------------------------------------------------------
// createProductSchema
// ---------------------------------------------------------------------------
export const createProductSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Nombre obligatorio" })
    .max(120, { message: "Máximo 120 caracteres" }),
  slug: z
    .string()
    .min(1, { message: "Slug obligatorio" })
    .regex(/^[a-z0-9-]+$/, { message: "Solo minúsculas, números y guiones" }),
  brandId: z.string().min(1, { message: "Marca obligatoria" }),
  description: z.string().min(1, { message: "Descripción obligatoria" }),
  shortDescription: z.string().optional().nullable(),
  species: z
    .array(z.enum(SPECIES))
    .min(1, { message: "Al menos una especie" }),
  tags: z.array(z.string()).default([]),
  targetSize: z.array(z.string()).optional().nullable(),
  lifeStage: z.string().optional().nullable(),
  ingredients: z.string().optional().nullable(),
  featured: z.boolean().default(false),
  categoryIds: z
    .array(z.string())
    .min(1, { message: "Al menos una categoría" }),
  images: z
    .array(imageSchema)
    .min(1, { message: "Al menos una imagen" }),
  variants: z
    .array(variantSchema)
    .min(1, { message: "Al menos una variante" }),
});

// ---------------------------------------------------------------------------
// updateProductSchema
// ---------------------------------------------------------------------------
export const updateProductSchema = createProductSchema.extend({
  id: z.string().min(1, { message: "ID obligatorio" }),
});

// ---------------------------------------------------------------------------
// productFormSchema — client-side schema for validators.onChange in TanStack Form.
// Matches the form's ProductFormValues shape (all string fields are string, no null/undefined).
// Keep createProductSchema AS-IS for server-side validation.
// ---------------------------------------------------------------------------

/** Variant schema for the client form — compareAtAmount stores "" or a number string */
export const variantFormSchema = z
  .object({
    id: z.string().optional(),
    sku: z.string().min(3, { message: "SKU mínimo 3 caracteres" }),
    name: z.string().min(1, { message: "Nombre obligatorio" }),
    quantityValue: z.union([z.number().positive({ message: "Debe ser mayor a 0" }), z.string()]),
    quantityUnit: z.enum(QUANTITY_UNITS, {
      errorMap: () => ({ message: "Unidad inválida" }),
    }),
    priceAmount: z.union([
      z.number().int({ message: "Sin decimales" }).positive({ message: "Precio debe ser mayor a 0" }),
      z.string(),
    ]),
    compareAtAmount: z.union([z.number().int().positive(), z.null()]).nullable().optional(),
    barcode: z.string(),
    stockByStore: z.record(z.string(), z.string()),
    _showCompareAt: z.boolean().optional(),
  })
  .refine(
    (v) => v.compareAtAmount == null || Number(v.compareAtAmount) > Number(v.priceAmount),
    {
      message: "El precio de lista debe ser mayor al precio de venta",
      path: ["compareAtAmount"],
    },
  );

export const productFormSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Nombre obligatorio" })
    .max(120, { message: "Máximo 120 caracteres" }),
  slug: z
    .string()
    .min(1, { message: "Slug obligatorio" })
    .regex(/^[a-z0-9-]+$/, { message: "Solo minúsculas, números y guiones" }),
  brandId: z.string().min(1, { message: "Marca obligatoria" }),
  description: z.string().min(1, { message: "Descripción obligatoria" }),
  shortDescription: z.string(), // optional in server schema — empty string is valid here
  species: z
    .array(z.enum(SPECIES))
    .min(1, { message: "Al menos una especie" }),
  tags: z.string(), // stored as comma-separated in the form
  targetSize: z.string(), // stored as comma-separated in the form
  lifeStage: z.string(),
  ingredients: z.string(),
  featured: z.boolean().default(false),
  categoryIds: z
    .array(z.string())
    .min(1, { message: "Al menos una categoría" }),
  images: z
    .array(
      z.object({
        url: z.string().url({ message: "Debe ser una URL válida" }),
        alt: z.string().min(1, { message: "El alt es obligatorio" }),
      }),
    )
    .min(1, { message: "Al menos una imagen" }),
  variants: z
    .array(variantFormSchema)
    .min(1, { message: "Al menos una variante" }),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ZodFlatError = z.inferFlattenedErrors<typeof createProductSchema>;

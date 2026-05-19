import { z } from "zod";
import { BLOG_CATEGORY, SPECIES } from "@/db/schema";

// ---------------------------------------------------------------------------
// createBlogPostSchema
// ---------------------------------------------------------------------------
export const createBlogPostSchema = z.object({
  slug: z
    .string()
    .min(1, { message: "Slug obligatorio" })
    .max(120, { message: "Máximo 120 caracteres" })
    .regex(/^[a-z0-9-]+$/, { message: "Solo minúsculas, números y guiones" }),
  title: z
    .string()
    .min(1, { message: "Título obligatorio" })
    .max(160, { message: "Máximo 160 caracteres" }),
  excerpt: z
    .string()
    .min(1, { message: "Extracto obligatorio" })
    .max(280, { message: "Máximo 280 caracteres" }),
  bodyMarkdown: z.string().min(1, { message: "Contenido obligatorio" }),
  heroImageUrl: z.string().url({ message: "Debe ser una URL válida" }).optional().or(z.literal("")),
  category: z.enum(BLOG_CATEGORY, { message: "Categoría inválida" }),
  species: z.array(z.enum(SPECIES)).default([]),
  tags: z.array(z.string()).default([]),
  authorName: z
    .string()
    .min(1, { message: "Nombre del autor obligatorio" })
    .max(80, { message: "Máximo 80 caracteres" }),
  status: z.enum(["draft", "published"]).default("draft"),
  relatedProductIds: z.array(z.string()).default([]),
});

// ---------------------------------------------------------------------------
// updateBlogPostSchema
// ---------------------------------------------------------------------------
export const updateBlogPostSchema = createBlogPostSchema
  .extend({ id: z.string().min(1, { message: "ID obligatorio" }) })
  .omit({ status: true });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type CreateBlogPostInput = z.infer<typeof createBlogPostSchema>;
export type UpdateBlogPostInput = z.infer<typeof updateBlogPostSchema>;
export type ZodBlogFlatError = z.inferFlattenedErrors<typeof createBlogPostSchema>;

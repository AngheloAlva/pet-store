import { z } from "zod";

// ---------------------------------------------------------------------------
// createRestockAlert schema
// ---------------------------------------------------------------------------
export const createRestockAlertSchema = z.object({
  productId: z.string().min(1, { message: "productId obligatorio" }),
  variantId: z.string().optional(),
  email: z.string().email({ message: "Email inválido" }).optional(),
  storeIds: z.array(z.string()).optional(),
});

export type CreateRestockAlertInput = z.infer<typeof createRestockAlertSchema>;

// ---------------------------------------------------------------------------
// cancelRestockAlert schema — discriminated union
// ---------------------------------------------------------------------------
export const cancelByIdSchema = z.object({
  kind: z.literal("id"),
  alertId: z.string().min(1, { message: "alertId obligatorio" }),
});

export const cancelByTokenSchema = z.object({
  kind: z.literal("token"),
  token: z.string().min(1, { message: "token obligatorio" }),
});

export const cancelRestockAlertSchema = z.discriminatedUnion("kind", [
  cancelByIdSchema,
  cancelByTokenSchema,
]);

export type CancelRestockAlertInput = z.infer<typeof cancelRestockAlertSchema>;

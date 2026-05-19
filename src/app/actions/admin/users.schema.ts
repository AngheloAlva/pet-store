import { z } from "zod";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const ROLES = ["customer", "admin", "staff"] as const;
const RUT_REGEX = /^\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]$/; // permissive — accepts 12.345.678-9 or 12345678-9

// ---------------------------------------------------------------------------
// updateUserIdentitySchema
// ---------------------------------------------------------------------------
export const updateUserIdentitySchema = z.object({
  name: z
    .string()
    .min(1, { message: "Nombre obligatorio" })
    .max(120, { message: "Máximo 120 caracteres" }),
  email: z.string().email({ message: "Email inválido" }),
  rut: z
    .string()
    .regex(RUT_REGEX, { message: "RUT inválido" })
    .nullable()
    .optional(),
  phone: z.string().nullable().optional(),
  role: z.enum(ROLES, { errorMap: () => ({ message: "Rol inválido" }) }),
  storeId: z.string().nullable().optional(),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type UpdateUserIdentityInput = z.infer<typeof updateUserIdentitySchema>;
export type ZodFlatError = z.inferFlattenedErrors<
  typeof updateUserIdentitySchema
>;

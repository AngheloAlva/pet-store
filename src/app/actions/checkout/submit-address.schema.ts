import { z } from "zod";

export const addressSchema = z.object({
  recipientName: z.string().min(2),
  street: z.string().min(3),
  number: z.string().min(1),
  apartment: z.string().optional(),
  commune: z.string().min(2),
  region: z.string().min(2),
  phone: z.string().regex(/^\+?56\d{9}$/),
});

export const submitAddressSchema = z.object({
  sessionId: z.string().uuid(),
  address: addressSchema,
});

export type SubmitAddressInput = z.infer<typeof submitAddressSchema>;
export type AddressInput = z.infer<typeof addressSchema>;

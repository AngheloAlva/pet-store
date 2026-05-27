import { z } from "zod";

export const addressInputSchema = z.object({
  label: z.string().min(1).max(50),
  name: z.string().min(2).max(100),
  street: z.string().min(3).max(200),
  commune: z.string().min(2).max(100),
  region: z.string().min(2).max(100),
  phone: z.string().regex(/^\+?56\d{9}$/),
  notes: z.string().max(500).optional(),
});

export type AddressInput = z.infer<typeof addressInputSchema>;

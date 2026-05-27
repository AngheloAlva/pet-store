import { z } from "zod";

export const startCheckoutSessionSchema = z.object({
  idempotencyKey: z.string().uuid(),
  cartLines: z.array(
    z.object({
      variantId: z.string().min(1),
      quantity: z.number().int().positive(),
      clientUnitPrice: z.number().int().nonnegative(),
    }),
  ),
});

export type StartCheckoutSessionInput = z.infer<typeof startCheckoutSessionSchema>;

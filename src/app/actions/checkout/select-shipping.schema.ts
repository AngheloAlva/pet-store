import { z } from "zod";

export const selectShippingSchema = z.object({
  sessionId: z.string().uuid(),
  shippingOptionId: z.string().min(1),
});

export type SelectShippingInput = z.infer<typeof selectShippingSchema>;

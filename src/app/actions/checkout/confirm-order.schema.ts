import { z } from "zod";

export const confirmOrderSchema = z.object({
  sessionId: z.string().uuid(),
  gatewayToken: z.string().min(1),
});

export type ConfirmOrderInput = z.infer<typeof confirmOrderSchema>;

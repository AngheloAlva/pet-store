import { z } from "zod";

export const initiatePaymentSchema = z.object({
  sessionId: z.string().uuid(),
  gateway: z.literal("webpay_mock"),
});

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;

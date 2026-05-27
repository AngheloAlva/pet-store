import { z } from "zod";
import { getRegisteredGatewayIds } from "@/lib/payments/registry";

const gatewayIds = getRegisteredGatewayIds() as [string, ...string[]];

export const initiatePaymentSchema = z.object({
  sessionId: z.string().uuid(),
  gateway: z.enum(gatewayIds),
  installments: z
    .union([z.literal(1), z.literal(3), z.literal(6), z.literal(12)])
    .optional(),
});

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;

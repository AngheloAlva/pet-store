/**
 * Payment metadata types — F3.2a
 * Discriminated union Zod schema for per-gateway payment metadata.
 * Stored as JSONB in orders.paymentMetadata and checkout_sessions.paymentMetadata.
 */
import { z } from "zod";

export const paymentMetadataSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("webpay") }),
  z.object({
    kind: z.literal("mercadopago"),
    installments: z.union([
      z.literal(1),
      z.literal(3),
      z.literal(6),
      z.literal(12),
    ]),
    installmentValue: z.number().int().nonnegative(),
  }),
  z.object({
    kind: z.literal("transfer"),
    bankReference: z.string().min(1),
    receiptId: z.string().min(1),
  }),
]);

export type PaymentMetadata = z.infer<typeof paymentMetadataSchema>;

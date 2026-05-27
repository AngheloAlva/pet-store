/**
 * submit-transfer-receipt.schema.ts — F3.2b
 * Zod schema for the submitTransferReceipt server action input.
 */
import { z } from "zod";

export const submitTransferReceiptSchema = z.object({
  sessionId: z.string().uuid(),
  dataUrl: z
    .string()
    .regex(
      /^data:image\/(png|jpe?g|webp);base64,/,
      "Invalid image mime type — only PNG, JPEG, or WebP accepted",
    )
    .max(2_750_000, "Receipt image exceeds 2MB limit"),
  bankReference: z.string().min(1).max(64),
});

export type SubmitTransferReceiptInput = z.infer<typeof submitTransferReceiptSchema>;

export type SubmitTransferReceiptResult =
  | { ok: true; orderNumber: string }
  | {
      ok: false;
      code:
        | "UNAUTHENTICATED"
        | "SESSION_NOT_FOUND"
        | "SESSION_EXPIRED"
        | "SESSION_NOT_PENDING"
        | "VALIDATION_ERROR";
      message?: string;
    };

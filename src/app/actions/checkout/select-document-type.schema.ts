/**
 * Zod schema for checkout document type selection — F3.6
 * Spec: C-1, C-2, C-3, INV-4
 */
import { z } from "zod";

// Chilean RUT format: 7-8 digits, dash, 1 digit or K
const RUT_REGEX = /^\d{7,8}-[\dkK]$/;

export const selectDocumentTypeSchema = z.discriminatedUnion("documentType", [
  z.object({
    documentType: z.literal("boleta"),
    receiverRut: z.string().optional(),
    receiverBusinessLine: z.string().optional(),
    receiverName: z.string().optional(),
    receiverAddress: z.string().optional(),
  }),
  z.object({
    documentType: z.literal("factura"),
    receiverRut: z
      .string()
      .min(1, { message: "RUT del receptor es requerido para factura" })
      .regex(RUT_REGEX, { message: "RUT inválido. Formato esperado: 12345678-9" }),
    receiverBusinessLine: z
      .string()
      .min(1, { message: "Giro / Razón social es requerido para factura" }),
    receiverName: z.string().optional(),
    receiverAddress: z.string().optional(),
  }),
]);

export type SelectDocumentTypeInput = z.infer<typeof selectDocumentTypeSchema>;

/**
 * Zod 4 schemas for admin DTE documents actions.
 * Spec: A-1, N-1, N-5
 */
import { z } from "zod";
import { DTE_TYPE } from "@/db/schema";

// ---------------------------------------------------------------------------
// DTE type enum for filters
// ---------------------------------------------------------------------------

export const dteTypeEnum = z.enum([
  DTE_TYPE.boleta,
  DTE_TYPE.factura,
  DTE_TYPE.nota_credito,
  DTE_TYPE.nota_debito,
  DTE_TYPE.guia,
]);

// ---------------------------------------------------------------------------
// listDocumentsSchema — URL searchParams filters
// ---------------------------------------------------------------------------

export const listDocumentsSchema = z.object({
  type: dteTypeEnum.optional(),
  dateFrom: z.string().optional(), // YYYY-MM-DD
  dateTo: z.string().optional(), // YYYY-MM-DD
  receiverRut: z.string().optional(),
  folioFrom: z.coerce.number().int().positive().optional(),
  folioTo: z.coerce.number().int().positive().optional(),
});

export type ListDocumentsFilters = z.infer<typeof listDocumentsSchema>;

// ---------------------------------------------------------------------------
// createCreditNoteSchema — NC creation input (N-1..N-4)
// ---------------------------------------------------------------------------

export const createCreditNoteSchema = z.object({
  dteId: z.string().min(1, { message: "dteId is required" }),
  reason: z.string().min(1, { message: "reason is required" }),
  amount: z.number().int().positive().optional(), // omit = total anulacion
});

export type CreateCreditNoteInput = z.infer<typeof createCreditNoteSchema>;

// ---------------------------------------------------------------------------
// createDebitNoteSchema — ND creation input (N-5)
// ---------------------------------------------------------------------------

export const createDebitNoteSchema = z.object({
  dteId: z.string().min(1, { message: "dteId is required" }),
  reason: z.string().min(1, { message: "reason is required" }),
  amount: z.number().int().positive({ message: "amount must be positive" }),
});

export type CreateDebitNoteInput = z.infer<typeof createDebitNoteSchema>;

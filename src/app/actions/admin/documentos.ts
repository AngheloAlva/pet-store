"use server";

/**
 * Admin DTE documents server actions — F3.6 Slice D
 * Spec: A-1, A-2, N-1..N-5, INV-2, INV-5
 *
 * T-28 [GREEN] listDocumentsWithDb    — filtered list + period totals
 * T-30 [GREEN] createCreditNoteWithDb — NC (61) with optional total/partial anulación
 * T-32 [GREEN] createDebitNoteWithDb  — ND (56) al alza, original unchanged
 *
 * SEC: Public wrappers self-guard via getCurrentUser() + role check.
 * Admin layout role-gate protects page rendering only; server actions are
 * directly-invocable POST endpoints and MUST guard themselves.
 */
import { db } from "@/db";
import { getCurrentUser } from "@/lib/session";
import {
  dteDocuments,
  orders,
  DTE_DOCUMENT_CODE,
} from "@/db/schema";
import type { DteType } from "@/db/schema";
import { eq, and, gte, lte, ilike, sql, isNull, or } from "drizzle-orm";
import { getFolioWithDb } from "@/lib/dte/folio";
import { computeIva } from "@/lib/dte/iva";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";

import {
  listDocumentsSchema,
  createCreditNoteSchema,
  createDebitNoteSchema,
} from "./documentos.schema";
import type { ListDocumentsFilters, CreateCreditNoteInput, CreateDebitNoteInput } from "./documentos.schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AnyDb = typeof db;

export interface DocumentListItem {
  id: string;
  type: string | null;
  folio: number | null;
  documentCode: number | null;
  status: string;
  issuedAt: Date | null;
  receiverRut: string | null;
  receiverName: string | null;
  net: number | null;
  taxAmount: number | null;
  total: number | null;
  pdfUrl: string | null;
  referenceDteId: string | null;
  orderId: string | null;
}

export interface PeriodTotals {
  totalNet: number;
  totalTax: number;
  totalAmount: number;
}

export interface ListDocumentsData {
  documents: DocumentListItem[];
  totals: PeriodTotals;
}

/** @deprecated use ListDocumentsData; kept for internal *WithDb return compat */
export type ListDocumentsResult =
  | { ok: true; documents: DocumentListItem[]; totals: PeriodTotals }
  | { ok: false; code: "UNAUTHENTICATED" | "FORBIDDEN" | "VALIDATION"; message: string };

export type CreateCreditNoteResult =
  | { ok: true; ncId: string }
  | { ok: false; code: "NOT_FOUND" | "INVALID_INPUT" | "UNAUTHENTICATED" | "FORBIDDEN" | "VALIDATION"; message: string };

export type CreateDebitNoteResult =
  | { ok: true; ndId: string }
  | { ok: false; code: "NOT_FOUND" | "INVALID_INPUT" | "UNAUTHENTICATED" | "FORBIDDEN" | "VALIDATION"; message: string };

// ---------------------------------------------------------------------------
// T-28 [GREEN] listDocumentsWithDb
// CRITICAL: LEFT JOIN orders — NC/ND have orderId = null and must NOT be dropped.
// ---------------------------------------------------------------------------

export async function listDocumentsWithDb(
  database: AnyDb,
  filters: ListDocumentsFilters
): Promise<ListDocumentsData> {
  // Build WHERE conditions
  const conditions = [];

  if (filters.type) {
    conditions.push(eq(dteDocuments.type, filters.type));
  }

  if (filters.dateFrom) {
    conditions.push(
      gte(dteDocuments.issuedAt, new Date(`${filters.dateFrom}T00:00:00Z`))
    );
  }

  if (filters.dateTo) {
    conditions.push(
      lte(dteDocuments.issuedAt, new Date(`${filters.dateTo}T23:59:59Z`))
    );
  }

  if (filters.receiverRut) {
    conditions.push(
      ilike(dteDocuments.receiverRut, `%${filters.receiverRut}%`)
    );
  }

  if (filters.folioFrom !== undefined) {
    conditions.push(gte(dteDocuments.folio, filters.folioFrom));
  }

  if (filters.folioTo !== undefined) {
    conditions.push(lte(dteDocuments.folio, filters.folioTo));
  }

  const whereClause =
    conditions.length > 0 ? and(...conditions) : undefined;

  // LEFT JOIN orders so NC/ND (orderId = null) are included.
  // We select from dteDocuments and leftJoin orders for potential client name.
  const rows = await database
    .select({
      id: dteDocuments.id,
      type: dteDocuments.type,
      folio: dteDocuments.folio,
      documentCode: dteDocuments.documentCode,
      status: dteDocuments.status,
      issuedAt: dteDocuments.issuedAt,
      receiverRut: dteDocuments.receiverRut,
      receiverName: dteDocuments.receiverName,
      net: dteDocuments.net,
      taxAmount: dteDocuments.taxAmount,
      total: dteDocuments.total,
      pdfUrl: dteDocuments.pdfUrl,
      referenceDteId: dteDocuments.referenceDteId,
      orderId: dteDocuments.orderId,
    })
    .from(dteDocuments)
    .leftJoin(orders, eq(dteDocuments.orderId, orders.id))
    .where(whereClause)
    .orderBy(sql`${dteDocuments.issuedAt} DESC NULLS LAST`);

  // Compute period totals from the same filtered result set
  const totals: PeriodTotals = rows.reduce(
    (acc, row) => ({
      totalNet: acc.totalNet + (row.net ?? 0),
      totalTax: acc.totalTax + (row.taxAmount ?? 0),
      totalAmount: acc.totalAmount + (row.total ?? 0),
    }),
    { totalNet: 0, totalTax: 0, totalAmount: 0 }
  );

  return { documents: rows, totals };
}

// Public action wrapper (server action)
// SEC: admin guard + Zod validation before delegating to *WithDb.
export async function listDocuments(
  filters: unknown
): Promise<ListDocumentsResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, code: "UNAUTHENTICATED", message: "Not authenticated" };
  if (user.role !== "admin") return { ok: false, code: "FORBIDDEN", message: "Forbidden" };

  const parsed = listDocumentsSchema.safeParse(filters);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION", message: JSON.stringify(parsed.error.flatten()) };
  }

  const data = await listDocumentsWithDb(db, parsed.data);
  return { ok: true, ...data };
}

// ---------------------------------------------------------------------------
// T-30 [GREEN] createCreditNoteWithDb
// NC (61): references original via referenceDteId, own folio from nota_credito
// counter. Full amount (or omitted) → original status = 'anulado'. Partial →
// original stays 'emitido'. IVA invariant: net + taxAmount === total.
// ---------------------------------------------------------------------------

export async function createCreditNoteWithDb(
  database: AnyDb,
  input: CreateCreditNoteInput
): Promise<CreateCreditNoteResult> {
  const { dteId, reason, amount } = input;

  // Fetch original DTE
  const original = await database.query.dteDocuments.findFirst({
    where: eq(dteDocuments.id, dteId),
  });

  if (!original) {
    return { ok: false, code: "NOT_FOUND", message: `DTE ${dteId} not found` };
  }

  const originalTotal = original.total ?? 0;
  const effectiveTotal = amount !== undefined ? amount : originalTotal;

  // Compute IVA for NC amount
  const { net, taxAmount } = computeIva(effectiveTotal);

  // Assign NC folio
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const folio = await getFolioWithDb(database as any, "nota_credito");

  const ncId = randomUUID();
  const now = new Date();

  // Insert NC row
  await database.insert(dteDocuments).values({
    id: ncId,
    dteId: ncId,
    type: "nota_credito" as DteType,
    documentCode: DTE_DOCUMENT_CODE.nota_credito,
    folio,
    status: "emitido",
    referenceDteId: dteId,
    net,
    taxAmount,
    total: effectiveTotal,
    issuerRut: original.issuerRut,
    receiverRut: original.receiverRut,
    receiverName: original.receiverName,
    receiverBusinessLine: original.receiverBusinessLine,
    receiverAddress: original.receiverAddress,
    stamp: original.stamp,
    pdfUrl: `/api/dte/${ncId}/pdf`,
    issuedAt: now,
    cancellationReason: reason,
    orderId: null,
  });

  // Full anulación: update original status
  const isTotal =
    amount === undefined || amount >= originalTotal;

  if (isTotal) {
    await database
      .update(dteDocuments)
      .set({ status: "anulado", cancelledAt: now, cancellationReason: reason })
      .where(eq(dteDocuments.id, dteId));
  }

  revalidatePath("/admin/documentos");

  return { ok: true, ncId };
}

// Public action wrapper
// SEC: admin guard + Zod validation before delegating to *WithDb.
export async function createCreditNote(
  input: unknown
): Promise<CreateCreditNoteResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, code: "UNAUTHENTICATED", message: "Not authenticated" };
  if (user.role !== "admin") return { ok: false, code: "FORBIDDEN", message: "Forbidden" };

  const parsed = createCreditNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION", message: JSON.stringify(parsed.error.flatten()) };
  }

  return createCreditNoteWithDb(db, parsed.data);
}

// ---------------------------------------------------------------------------
// T-32 [GREEN] createDebitNoteWithDb
// ND (56): references original via referenceDteId, own folio from nota_debito
// counter. Original DTE status NOT changed (adjustment upward).
// ---------------------------------------------------------------------------

export async function createDebitNoteWithDb(
  database: AnyDb,
  input: CreateDebitNoteInput
): Promise<CreateDebitNoteResult> {
  const { dteId, reason, amount } = input;

  // Fetch original DTE
  const original = await database.query.dteDocuments.findFirst({
    where: eq(dteDocuments.id, dteId),
  });

  if (!original) {
    return { ok: false, code: "NOT_FOUND", message: `DTE ${dteId} not found` };
  }

  // Compute IVA for ND amount
  const { net, taxAmount } = computeIva(amount);

  // Assign ND folio
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const folio = await getFolioWithDb(database as any, "nota_debito");

  const ndId = randomUUID();
  const now = new Date();

  // Insert ND row
  await database.insert(dteDocuments).values({
    id: ndId,
    dteId: ndId,
    type: "nota_debito" as DteType,
    documentCode: DTE_DOCUMENT_CODE.nota_debito,
    folio,
    status: "emitido",
    referenceDteId: dteId,
    net,
    taxAmount,
    total: amount,
    issuerRut: original.issuerRut,
    receiverRut: original.receiverRut,
    receiverName: original.receiverName,
    receiverBusinessLine: original.receiverBusinessLine,
    receiverAddress: original.receiverAddress,
    stamp: original.stamp,
    pdfUrl: `/api/dte/${ndId}/pdf`,
    issuedAt: now,
    cancellationReason: reason,
    orderId: null,
  });

  // ND does NOT change original status — intentional

  revalidatePath("/admin/documentos");

  return { ok: true, ndId };
}

// Public action wrapper
// SEC: admin guard + Zod validation before delegating to *WithDb.
export async function createDebitNote(
  input: unknown
): Promise<CreateDebitNoteResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, code: "UNAUTHENTICATED", message: "Not authenticated" };
  if (user.role !== "admin") return { ok: false, code: "FORBIDDEN", message: "Forbidden" };

  const parsed = createDebitNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION", message: JSON.stringify(parsed.error.flatten()) };
  }

  return createDebitNoteWithDb(db, parsed.data);
}

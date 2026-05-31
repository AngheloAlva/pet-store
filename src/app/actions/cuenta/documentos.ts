"use server";

/**
 * Client-facing DTE document actions — F3.6 Slice E
 * Spec: CL-1, L-1, L-2, L-3, L-4
 *
 * T-38 [GREEN] listMyDocumentsWithDb — scoped to userId via order ownership
 * T-42 [GREEN] getLibroVentasWithDb  — boleta/factura only; NC/ND EXCLUDED (spec L-3)
 * T-43 [GREEN] getFolioStatsWithDb   — lastFolio per type from dte_folio_counters
 */
import { db } from "@/db";
import { getCurrentUser } from "@/lib/session";
import { dteDocuments, orders, dtefolioCounters } from "@/db/schema";
import { eq, inArray, and, gte, lt, sql } from "drizzle-orm";

type AnyDb = typeof db;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MyDocumentRow {
  id: string;
  type: string | null;
  folio: number | null;
  issuedAt: Date | null;
  total: number | null;
  status: string;
  pdfUrl: string | null;
}

export interface LibroVentasRow {
  folio: number | null;
  tipo: string | null;
  fecha: string | null;
  rutReceptor: string | null;
  razonSocial: string | null;
  neto: number;
  iva: number;
  total: number;
}

export interface LibroVentasTotals {
  totalNeto: number;
  totalIva: number;
  totalAmount: number;
}

export interface LibroVentasData {
  rows: LibroVentasRow[];
  totals: LibroVentasTotals;
}

export interface FolioStatRow {
  type: string;
  lastFolio: number;
  issuedCount: number;
}

// ---------------------------------------------------------------------------
// T-38 [GREEN] listMyDocumentsWithDb
// Scopes to the current user's orders: WHERE orderId IN (user's orderIds).
// Spec CL-1 — user sees only their own DTEs.
// ---------------------------------------------------------------------------

export async function listMyDocumentsWithDb(
  database: AnyDb,
  userId: string
): Promise<MyDocumentRow[]> {
  // Step 1: get all order IDs that belong to this user
  const userOrders = await database
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.userId, userId));

  if (userOrders.length === 0) return [];

  const orderIds = userOrders.map((o) => o.id);

  // Step 2: fetch DTEs where orderId is in user's orders
  const rows = await database
    .select({
      id: dteDocuments.id,
      type: dteDocuments.type,
      folio: dteDocuments.folio,
      issuedAt: dteDocuments.issuedAt,
      total: dteDocuments.total,
      status: dteDocuments.status,
      pdfUrl: dteDocuments.pdfUrl,
    })
    .from(dteDocuments)
    .where(inArray(dteDocuments.orderId, orderIds))
    .orderBy(sql`${dteDocuments.issuedAt} DESC NULLS LAST`);

  return rows;
}

// Public wrapper (server action)
export async function listMyDocuments(): Promise<MyDocumentRow[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  return listMyDocumentsWithDb(db, user.id);
}

// ---------------------------------------------------------------------------
// T-42 [GREEN] getLibroVentasWithDb
// CRITICAL (spec L-3): ONLY boleta(39) and factura(33) included.
// NC/ND are adjustment documents — EXCLUDED from Libro de Ventas.
// Period filter: issuedAt within YYYY-MM (inclusive start, exclusive next month).
// ---------------------------------------------------------------------------

export async function getLibroVentasWithDb(
  database: AnyDb,
  period: string // YYYY-MM
): Promise<LibroVentasData> {
  // Parse period to date range
  const [year, month] = period.split("-").map(Number);
  const periodStart = new Date(Date.UTC(year, month - 1, 1));
  const periodEnd = new Date(Date.UTC(year, month, 1)); // exclusive

  // Query: type IN ('boleta', 'factura') — NC/ND excluded per spec L-3
  const rows = await database
    .select({
      folio: dteDocuments.folio,
      tipo: dteDocuments.type,
      issuedAt: dteDocuments.issuedAt,
      rutReceptor: dteDocuments.receiverRut,
      razonSocial: dteDocuments.receiverName,
      net: dteDocuments.net,
      taxAmount: dteDocuments.taxAmount,
      total: dteDocuments.total,
    })
    .from(dteDocuments)
    .where(
      and(
        inArray(dteDocuments.type, ["boleta", "factura"]),
        gte(dteDocuments.issuedAt, periodStart),
        lt(dteDocuments.issuedAt, periodEnd)
      )
    )
    .orderBy(sql`${dteDocuments.issuedAt} ASC NULLS LAST`);

  // Map to SII columns
  const libroRows: LibroVentasRow[] = rows.map((r) => ({
    folio: r.folio,
    tipo: r.tipo,
    fecha: r.issuedAt ? r.issuedAt.toISOString().slice(0, 10) : null,
    rutReceptor: r.rutReceptor,
    razonSocial: r.razonSocial,
    neto: r.net ?? 0,
    iva: r.taxAmount ?? 0,
    total: r.total ?? 0,
  }));

  // Compute aggregate period totals
  const totals = libroRows.reduce(
    (acc, row) => ({
      totalNeto: acc.totalNeto + row.neto,
      totalIva: acc.totalIva + row.iva,
      totalAmount: acc.totalAmount + row.total,
    }),
    { totalNeto: 0, totalIva: 0, totalAmount: 0 }
  );

  return { rows: libroRows, totals };
}

// ---------------------------------------------------------------------------
// T-43 [GREEN] getFolioStatsWithDb
// Returns lastFolio from counters + count of issued docs per type.
// Spec: L-4
// ---------------------------------------------------------------------------

export async function getFolioStatsWithDb(
  database: AnyDb
): Promise<FolioStatRow[]> {
  // Get all counter rows
  const counters = await database
    .select({ type: dtefolioCounters.type, lastFolio: dtefolioCounters.lastFolio })
    .from(dtefolioCounters);

  // Get issued counts per type from dte_documents
  const counts = await database
    .select({
      type: dteDocuments.type,
      count: sql<number>`count(*)::int`,
    })
    .from(dteDocuments)
    .where(eq(dteDocuments.status, "emitido"))
    .groupBy(dteDocuments.type);

  const countMap = new Map(
    counts.map((c) => [c.type, c.count])
  );

  return counters.map((c) => ({
    type: c.type,
    lastFolio: c.lastFolio,
    issuedCount: countMap.get(c.type) ?? 0,
  }));
}

// Public wrapper
export async function getFolioStats(): Promise<FolioStatRow[]> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") return [];
  return getFolioStatsWithDb(db);
}

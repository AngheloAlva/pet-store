/**
 * T-26 [RED] — listDocumentsWithDb filters
 * T-29 [RED] — createCreditNoteWithDb
 * T-31 [RED] — createDebitNoteWithDb
 * SEC-DOC-1..4 [RED] — admin auth guard + Zod validation on public wrappers
 * Spec: A-1, A-2, N-1..N-5, INV-2, INV-5
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import * as schema from "@/db/schema";

async function createTestDb() {
  const pglite = new PGlite();
  const db = drizzle(pglite, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db;
}

type TestDb = ReturnType<typeof drizzle<typeof schema>>;

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

async function seedDte(
  db: TestDb,
  overrides: Partial<typeof schema.dteDocuments.$inferInsert> &
    Pick<typeof schema.dteDocuments.$inferInsert, "id">
) {
  await db.insert(schema.dteDocuments).values({
    id: overrides.id,
    dteId: overrides.dteId ?? overrides.id,
    status: overrides.status ?? "emitido",
    folio: overrides.folio ?? 1,
    type: overrides.type ?? "boleta",
    documentCode: overrides.documentCode ?? 39,
    net: overrides.net ?? 10000,
    taxAmount: overrides.taxAmount ?? 1900,
    total: overrides.total ?? 11900,
    issuerRut: overrides.issuerRut ?? "76000000-0",
    receiverRut: overrides.receiverRut ?? "66666666-6",
    receiverName: overrides.receiverName ?? "Consumidor Final",
    stamp: overrides.stamp ?? "c3RhbXA=",
    pdfUrl: overrides.pdfUrl ?? `/api/dte/${overrides.id}/pdf`,
    issuedAt: overrides.issuedAt ?? new Date("2026-05-15T12:00:00Z"),
    orderId: overrides.orderId ?? null,
    referenceDteId: overrides.referenceDteId ?? null,
    cancellationReason: overrides.cancellationReason ?? null,
    cancelledAt: overrides.cancelledAt ?? null,
    receiverBusinessLine: overrides.receiverBusinessLine ?? null,
    receiverAddress: overrides.receiverAddress ?? null,
  });
}

// ---------------------------------------------------------------------------
// T-26 [RED] — listDocumentsWithDb filters
// ---------------------------------------------------------------------------

describe("listDocumentsWithDb — T-26 RED", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all documents when no filters applied", async () => {
    const db = await createTestDb();
    await seedDte(db, { id: "dte-1", type: "boleta", folio: 1 });
    await seedDte(db, { id: "dte-2", type: "factura", folio: 1 });

    const { listDocumentsWithDb } = await import(
      "@/app/actions/admin/documentos"
    );
    const result = await listDocumentsWithDb(db as never, {});
    expect(result.documents).toHaveLength(2);
  });

  it("filters by type", async () => {
    const db = await createTestDb();
    await seedDte(db, { id: "dte-t1", type: "boleta", folio: 10 });
    await seedDte(db, { id: "dte-t2", type: "factura", folio: 10 });

    const { listDocumentsWithDb } = await import(
      "@/app/actions/admin/documentos"
    );
    const result = await listDocumentsWithDb(db as never, { type: "factura" });
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].type).toBe("factura");
  });

  it("filters by dateFrom / dateTo", async () => {
    const db = await createTestDb();
    await seedDte(db, {
      id: "dte-d1",
      folio: 20,
      issuedAt: new Date("2026-04-15T12:00:00Z"),
    });
    await seedDte(db, {
      id: "dte-d2",
      folio: 21,
      issuedAt: new Date("2026-05-15T12:00:00Z"),
    });

    const { listDocumentsWithDb } = await import(
      "@/app/actions/admin/documentos"
    );
    const result = await listDocumentsWithDb(db as never, {
      dateFrom: "2026-05-01",
      dateTo: "2026-05-31",
    });
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].id).toBe("dte-d2");
  });

  it("filters by folio range", async () => {
    const db = await createTestDb();
    await seedDte(db, { id: "dte-f1", folio: 50, type: "boleta" });
    await seedDte(db, { id: "dte-f2", folio: 55, type: "boleta" });
    await seedDte(db, { id: "dte-f3", folio: 70, type: "boleta" });

    const { listDocumentsWithDb } = await import(
      "@/app/actions/admin/documentos"
    );
    const result = await listDocumentsWithDb(db as never, {
      folioFrom: 50,
      folioTo: 60,
    });
    expect(result.documents).toHaveLength(2);
    const folios = result.documents.map((d) => d.folio).sort();
    expect(folios).toEqual([50, 55]);
  });

  it("filters by receiverRut partial match (ILIKE)", async () => {
    const db = await createTestDb();
    await seedDte(db, {
      id: "dte-r1",
      folio: 30,
      receiverRut: "12345678-9",
    });
    await seedDte(db, {
      id: "dte-r2",
      folio: 31,
      receiverRut: "98765432-1",
    });

    const { listDocumentsWithDb } = await import(
      "@/app/actions/admin/documentos"
    );
    const result = await listDocumentsWithDb(db as never, {
      receiverRut: "12345",
    });
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].receiverRut).toBe("12345678-9");
  });

  it("LEFT JOIN orders — NC/ND with null orderId are NOT dropped", async () => {
    const db = await createTestDb();
    // Boleta with no order (orderId = null)
    await seedDte(db, { id: "dte-nc1", type: "nota_credito", folio: 1, documentCode: 61 });

    const { listDocumentsWithDb } = await import(
      "@/app/actions/admin/documentos"
    );
    const result = await listDocumentsWithDb(db as never, {});
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].type).toBe("nota_credito");
  });

  it("computes period totals (sum net / taxAmount / total)", async () => {
    const db = await createTestDb();
    await seedDte(db, {
      id: "dte-p1",
      folio: 40,
      net: 10000,
      taxAmount: 1900,
      total: 11900,
    });
    await seedDte(db, {
      id: "dte-p2",
      folio: 41,
      net: 20000,
      taxAmount: 3800,
      total: 23800,
    });
    await seedDte(db, {
      id: "dte-p3",
      folio: 42,
      net: 5000,
      taxAmount: 950,
      total: 5950,
    });

    const { listDocumentsWithDb } = await import(
      "@/app/actions/admin/documentos"
    );
    const result = await listDocumentsWithDb(db as never, {});
    expect(result.totals.totalNet).toBe(35000);
    expect(result.totals.totalTax).toBe(6650);
    expect(result.totals.totalAmount).toBe(41650);
  });
});

// ---------------------------------------------------------------------------
// T-29 [RED] — createCreditNoteWithDb
// ---------------------------------------------------------------------------

describe("createCreditNoteWithDb — T-29 RED", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts NC with referenceDteId and own folio from nota_credito counter", async () => {
    const db = await createTestDb();
    await seedDte(db, {
      id: "dte-orig-1",
      folio: 1,
      total: 11900,
      net: 10000,
      taxAmount: 1900,
    });

    const { createCreditNoteWithDb } = await import(
      "@/app/actions/admin/documentos"
    );
    const result = await createCreditNoteWithDb(db as never, {
      dteId: "dte-orig-1",
      reason: "Error en precio",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const nc = await db.query.dteDocuments.findFirst({
      where: (d, { eq }) => eq(d.id, result.ncId),
    });
    expect(nc).toBeDefined();
    expect(nc!.type).toBe("nota_credito");
    expect(nc!.documentCode).toBe(61);
    expect(nc!.referenceDteId).toBe("dte-orig-1");
    expect(nc!.folio).toBeGreaterThanOrEqual(1);
    expect(nc!.status).toBe("emitido");
  });

  it("full NC (no amount) — original DTE becomes anulado", async () => {
    const db = await createTestDb();
    await seedDte(db, {
      id: "dte-orig-2",
      folio: 2,
      total: 11900,
      net: 10000,
      taxAmount: 1900,
    });

    const { createCreditNoteWithDb } = await import(
      "@/app/actions/admin/documentos"
    );
    await createCreditNoteWithDb(db as never, {
      dteId: "dte-orig-2",
      reason: "Anulacion total",
    });

    const orig = await db.query.dteDocuments.findFirst({
      where: (d, { eq }) => eq(d.id, "dte-orig-2"),
    });
    expect(orig!.status).toBe("anulado");
    expect(orig!.cancelledAt).not.toBeNull();
  });

  it("partial NC (amount < total) — original stays emitido", async () => {
    const db = await createTestDb();
    await seedDte(db, {
      id: "dte-orig-3",
      folio: 3,
      total: 11900,
      net: 10000,
      taxAmount: 1900,
    });

    const { createCreditNoteWithDb } = await import(
      "@/app/actions/admin/documentos"
    );
    await createCreditNoteWithDb(db as never, {
      dteId: "dte-orig-3",
      reason: "Credito parcial",
      amount: 5950,
    });

    const orig = await db.query.dteDocuments.findFirst({
      where: (d, { eq }) => eq(d.id, "dte-orig-3"),
    });
    expect(orig!.status).toBe("emitido");

    const nc = await db.query.dteDocuments.findFirst({
      where: (d, { eq }) => eq(d.referenceDteId, "dte-orig-3"),
    });
    expect(nc!.total).toBe(5950);
  });

  it("NC IVA invariant: net + taxAmount === total", async () => {
    const db = await createTestDb();
    await seedDte(db, {
      id: "dte-orig-4",
      folio: 4,
      total: 11900,
      net: 10000,
      taxAmount: 1900,
    });

    const { createCreditNoteWithDb } = await import(
      "@/app/actions/admin/documentos"
    );
    await createCreditNoteWithDb(db as never, {
      dteId: "dte-orig-4",
      reason: "IVA check",
      amount: 5950,
    });

    const nc = await db.query.dteDocuments.findFirst({
      where: (d, { eq }) => eq(d.referenceDteId, "dte-orig-4"),
    });
    expect(nc!.net! + nc!.taxAmount!).toBe(nc!.total);
  });

  it("returns error when original DTE not found", async () => {
    const db = await createTestDb();

    const { createCreditNoteWithDb } = await import(
      "@/app/actions/admin/documentos"
    );
    const result = await createCreditNoteWithDb(db as never, {
      dteId: "nonexistent",
      reason: "x",
    });

    expect(result.ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// T-31 [RED] — createDebitNoteWithDb
// ---------------------------------------------------------------------------

describe("createDebitNoteWithDb — T-31 RED", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts ND with referenceDteId and folio from nota_debito counter", async () => {
    const db = await createTestDb();
    await seedDte(db, {
      id: "dte-nd-1",
      folio: 10,
      total: 23800,
      net: 20000,
      taxAmount: 3800,
      type: "factura",
      documentCode: 33,
    });

    const { createDebitNoteWithDb } = await import(
      "@/app/actions/admin/documentos"
    );
    const result = await createDebitNoteWithDb(db as never, {
      dteId: "dte-nd-1",
      reason: "Ajuste de precio",
      amount: 5950,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const nd = await db.query.dteDocuments.findFirst({
      where: (d, { eq }) => eq(d.id, result.ndId),
    });
    expect(nd).toBeDefined();
    expect(nd!.type).toBe("nota_debito");
    expect(nd!.documentCode).toBe(56);
    expect(nd!.referenceDteId).toBe("dte-nd-1");
    expect(nd!.folio).toBeGreaterThanOrEqual(1);
    expect(nd!.status).toBe("emitido");
  });

  it("ND does NOT change original DTE status", async () => {
    const db = await createTestDb();
    await seedDte(db, {
      id: "dte-nd-2",
      folio: 11,
      total: 11900,
      net: 10000,
      taxAmount: 1900,
    });

    const { createDebitNoteWithDb } = await import(
      "@/app/actions/admin/documentos"
    );
    await createDebitNoteWithDb(db as never, {
      dteId: "dte-nd-2",
      reason: "Cargo extra",
      amount: 3570,
    });

    const orig = await db.query.dteDocuments.findFirst({
      where: (d, { eq }) => eq(d.id, "dte-nd-2"),
    });
    expect(orig!.status).toBe("emitido");
  });

  it("ND IVA invariant: net + taxAmount === total", async () => {
    const db = await createTestDb();
    await seedDte(db, {
      id: "dte-nd-3",
      folio: 12,
      total: 11900,
      net: 10000,
      taxAmount: 1900,
    });

    const { createDebitNoteWithDb } = await import(
      "@/app/actions/admin/documentos"
    );
    await createDebitNoteWithDb(db as never, {
      dteId: "dte-nd-3",
      reason: "IVA ND check",
      amount: 3570,
    });

    const nd = await db.query.dteDocuments.findFirst({
      where: (d, { eq }) => eq(d.referenceDteId, "dte-nd-3"),
    });
    expect(nd!.net! + nd!.taxAmount!).toBe(nd!.total);
  });
});

// ---------------------------------------------------------------------------
// SEC-DOC-1..4 — Admin auth guard + Zod validation on public wrappers
// Tests the PUBLIC wrappers (listDocuments, createCreditNote, createDebitNote)
// which must self-guard via getCurrentUser (layout role-gate is NOT enough).
// ---------------------------------------------------------------------------

import { getCurrentUser } from "@/lib/session";

const mockGetCurrentUser = getCurrentUser as ReturnType<typeof vi.fn>;

describe("listDocuments — auth guard (SEC-DOC-1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("SEC-DOC-1a: unauthenticated caller is rejected with UNAUTHENTICATED", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const { listDocuments } = await import("@/app/actions/admin/documentos");
    const result = await listDocuments({});

    expect("ok" in result && result.ok === false).toBe(true);
    expect((result as { ok: false; code: string }).code).toBe("UNAUTHENTICATED");
  });

  it("SEC-DOC-1b: non-admin caller is rejected with FORBIDDEN", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "cust-1",
      email: "c@test.cl",
      name: "Customer",
      role: "customer",
    });

    const { listDocuments } = await import("@/app/actions/admin/documentos");
    const result = await listDocuments({});

    expect("ok" in result && result.ok === false).toBe(true);
    expect((result as { ok: false; code: string }).code).toBe("FORBIDDEN");
  });

  it("SEC-DOC-1c: invalid filter input (invalid type string) is rejected with VALIDATION", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "admin-1",
      email: "a@test.cl",
      name: "Admin",
      role: "admin",
    });

    const { listDocuments } = await import("@/app/actions/admin/documentos");
    const result = await listDocuments({ type: "factura_invalida" as never });

    expect("ok" in result && result.ok === false).toBe(true);
    expect((result as { ok: false; code: string }).code).toBe("VALIDATION");
  });

  it("SEC-DOC-1d: negative folioFrom is rejected with VALIDATION", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "admin-1",
      email: "a@test.cl",
      name: "Admin",
      role: "admin",
    });

    const { listDocuments } = await import("@/app/actions/admin/documentos");
    const result = await listDocuments({ folioFrom: -5 });

    expect("ok" in result && result.ok === false).toBe(true);
    expect((result as { ok: false; code: string }).code).toBe("VALIDATION");
  });
});

describe("createCreditNote — auth guard (SEC-DOC-2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("SEC-DOC-2a: unauthenticated caller is rejected with UNAUTHENTICATED", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const { createCreditNote } = await import("@/app/actions/admin/documentos");
    const result = await createCreditNote({ dteId: "x", reason: "r" });

    expect(result.ok).toBe(false);
    expect((result as { ok: false; code: string }).code).toBe("UNAUTHENTICATED");
  });

  it("SEC-DOC-2b: non-admin caller is rejected with FORBIDDEN", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "cust-1",
      email: "c@test.cl",
      name: "Customer",
      role: "customer",
    });

    const { createCreditNote } = await import("@/app/actions/admin/documentos");
    const result = await createCreditNote({ dteId: "x", reason: "r" });

    expect(result.ok).toBe(false);
    expect((result as { ok: false; code: string }).code).toBe("FORBIDDEN");
  });

  it("SEC-DOC-2c: negative amount is rejected with VALIDATION", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "admin-1",
      email: "a@test.cl",
      name: "Admin",
      role: "admin",
    });

    const { createCreditNote } = await import("@/app/actions/admin/documentos");
    const result = await createCreditNote({ dteId: "x", reason: "r", amount: -100 });

    expect(result.ok).toBe(false);
    expect((result as { ok: false; code: string }).code).toBe("VALIDATION");
  });

  it("SEC-DOC-2d: zero amount is rejected with VALIDATION", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "admin-1",
      email: "a@test.cl",
      name: "Admin",
      role: "admin",
    });

    const { createCreditNote } = await import("@/app/actions/admin/documentos");
    const result = await createCreditNote({ dteId: "x", reason: "r", amount: 0 });

    expect(result.ok).toBe(false);
    expect((result as { ok: false; code: string }).code).toBe("VALIDATION");
  });
});

describe("createDebitNote — auth guard (SEC-DOC-3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("SEC-DOC-3a: unauthenticated caller is rejected with UNAUTHENTICATED", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const { createDebitNote } = await import("@/app/actions/admin/documentos");
    const result = await createDebitNote({ dteId: "x", reason: "r", amount: 1000 });

    expect(result.ok).toBe(false);
    expect((result as { ok: false; code: string }).code).toBe("UNAUTHENTICATED");
  });

  it("SEC-DOC-3b: non-admin caller is rejected with FORBIDDEN", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "cust-1",
      email: "c@test.cl",
      name: "Customer",
      role: "customer",
    });

    const { createDebitNote } = await import("@/app/actions/admin/documentos");
    const result = await createDebitNote({ dteId: "x", reason: "r", amount: 1000 });

    expect(result.ok).toBe(false);
    expect((result as { ok: false; code: string }).code).toBe("FORBIDDEN");
  });

  it("SEC-DOC-3c: negative amount is rejected with VALIDATION", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "admin-1",
      email: "a@test.cl",
      name: "Admin",
      role: "admin",
    });

    const { createDebitNote } = await import("@/app/actions/admin/documentos");
    const result = await createDebitNote({ dteId: "x", reason: "r", amount: -500 });

    expect(result.ok).toBe(false);
    expect((result as { ok: false; code: string }).code).toBe("VALIDATION");
  });

  it("SEC-DOC-3d: NaN amount is rejected with VALIDATION", async () => {
    mockGetCurrentUser.mockResolvedValue({
      id: "admin-1",
      email: "a@test.cl",
      name: "Admin",
      role: "admin",
    });

    const { createDebitNote } = await import("@/app/actions/admin/documentos");
    const result = await createDebitNote({ dteId: "x", reason: "r", amount: NaN });

    expect(result.ok).toBe(false);
    expect((result as { ok: false; code: string }).code).toBe("VALIDATION");
  });
});

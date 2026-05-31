/**
 * T-37 [RED] — listMyDocumentsWithDb
 * T-41 [RED] — getLibroVentasWithDb
 * Spec: CL-1, L-1, L-2, L-3
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

let orderSeq = 0;

async function seedOrder(db: TestDb, userId: string, orderId: string) {
  orderSeq++;
  // Seed checkout session first (FK required by orders)
  await db.insert(schema.checkoutSessions).values({
    id: `cs-test-${orderId}`,
    userId,
    idempotencyKey: `ik-test-${orderId}`,
    cartSnapshot: [],
    address: { street: "Test", commune: "Santiago", region: "RM", name: "Test", phone: "+56912345678" },
    shippingOptionId: "standard",
    shippingCost: 2990,
    status: "completed",
    paymentGateway: "webpay_mock",
    paymentMetadata: { token: `tok-${orderId}` },
    deliveryType: "delivery",
    expiresAt: new Date("2030-01-01T00:00:00Z"),
    createdAt: new Date("2026-05-01T00:00:00Z"),
  });

  await db.insert(schema.orderSequences).values({
    date: "20260501",
    lastSeq: orderSeq,
  }).onConflictDoUpdate({
    target: schema.orderSequences.date,
    set: { lastSeq: orderSeq },
  });

  await db.insert(schema.orders).values({
    id: orderId,
    orderNumber: `PET-T-${orderSeq}`,
    userId,
    checkoutSessionId: `cs-test-${orderId}`,
    status: "completed",
    paymentStatus: "paid",
    paymentGateway: "webpay_mock",
    paymentMetadata: { token: `tok-${orderId}` },
    gatewayToken: `tok-${orderId}`,
    address: { street: "Test", commune: "Santiago", region: "RM", name: "Test", phone: "+56912345678" },
    shippingOptionId: "standard",
    shippingCost: 2990,
    subtotal: 9000,
    discountTotal: 0,
    walletDiscount: 0,
    total: 11900,
    couponCode: null,
    pointsRedeemed: 0,
    pointsEarned: 0,
    createdAt: new Date("2026-05-01T00:00:00Z"),
    updatedAt: new Date("2026-05-01T00:00:00Z"),
  });
}

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

async function seedUser(db: TestDb, userId: string, rut?: string) {
  await db.insert(schema.users).values({
    id: userId,
    email: `${userId}@test.cl`,
    name: "Test User",
    role: "customer",
    rut: rut,
    isDemoSeed: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  }).onConflictDoNothing();
}

// ---------------------------------------------------------------------------
// T-37 [RED] — listMyDocumentsWithDb — user sees only own DTEs
// Spec: CL-1
// ---------------------------------------------------------------------------

describe("listMyDocumentsWithDb — T-37 RED", () => {
  it("user A sees only their own DTEs (via orderId ownership)", async () => {
    const { listMyDocumentsWithDb } = await import("../documentos");
    const db = await createTestDb();

    await seedUser(db, "user-a");
    await seedUser(db, "user-b");
    await seedOrder(db, "user-a", "order-a-001");
    await seedOrder(db, "user-b", "order-b-001");

    // DTE linked to user-a's order
    await seedDte(db, { id: "dte-a-1", orderId: "order-a-001", folio: 1 });
    // DTE linked to user-b's order
    await seedDte(db, { id: "dte-b-1", orderId: "order-b-001", folio: 2 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await listMyDocumentsWithDb(db as any, "user-a");

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("dte-a-1");
  });

  it("user B sees their own DTE — cross-user isolation holds", async () => {
    const { listMyDocumentsWithDb } = await import("../documentos");
    const db = await createTestDb();

    await seedUser(db, "user-a2");
    await seedUser(db, "user-b2");
    await seedOrder(db, "user-a2", "order-a2-001");
    await seedOrder(db, "user-b2", "order-b2-001");
    await seedOrder(db, "user-b2", "order-b2-002");

    await seedDte(db, { id: "dte-a2-1", orderId: "order-a2-001", folio: 1 });
    await seedDte(db, { id: "dte-b2-1", orderId: "order-b2-001", folio: 2 });
    await seedDte(db, { id: "dte-b2-2", orderId: "order-b2-002", folio: 3 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await listMyDocumentsWithDb(db as any, "user-b2");

    expect(result).toHaveLength(2);
    const ids = result.map((r) => r.id).sort();
    expect(ids).toEqual(["dte-b2-1", "dte-b2-2"]);
  });

  it("returns expected columns: id, type, folio, issuedAt, total, status, pdfUrl", async () => {
    const { listMyDocumentsWithDb } = await import("../documentos");
    const db = await createTestDb();

    await seedUser(db, "user-col");
    await seedOrder(db, "user-col", "order-col-001");
    await seedDte(db, {
      id: "dte-col-1",
      orderId: "order-col-001",
      folio: 5,
      type: "factura",
      total: 23800,
      status: "emitido",
      pdfUrl: "/api/dte/dte-col-1/pdf",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await listMyDocumentsWithDb(db as any, "user-col");

    expect(result).toHaveLength(1);
    const row = result[0];
    expect(row.id).toBe("dte-col-1");
    expect(row.type).toBe("factura");
    expect(row.folio).toBe(5);
    expect(row.total).toBe(23800);
    expect(row.status).toBe("emitido");
    expect(row.pdfUrl).toBe("/api/dte/dte-col-1/pdf");
  });

  it("returns empty array when user has no orders or DTEs", async () => {
    const { listMyDocumentsWithDb } = await import("../documentos");
    const db = await createTestDb();
    await seedUser(db, "user-empty");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await listMyDocumentsWithDb(db as any, "user-empty");
    expect(result).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// T-41 [RED] — getLibroVentasWithDb
// Spec: L-1, L-2, L-3
// ---------------------------------------------------------------------------

describe("getLibroVentasWithDb — T-41 RED", () => {
  it("returns only rows in the specified YYYY-MM period", async () => {
    const { getLibroVentasWithDb } = await import("../documentos");
    const db = await createTestDb();

    await seedDte(db, {
      id: "dte-lv-may",
      type: "boleta",
      folio: 1,
      issuedAt: new Date("2026-05-15T12:00:00Z"),
    });
    await seedDte(db, {
      id: "dte-lv-jun",
      type: "boleta",
      folio: 2,
      issuedAt: new Date("2026-06-01T12:00:00Z"),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getLibroVentasWithDb(db as any, "2026-05");

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].folio).toBe(1);
  });

  it("excludes nota_credito rows from Libro de Ventas (spec L-3)", async () => {
    const { getLibroVentasWithDb } = await import("../documentos");
    const db = await createTestDb();

    // Seed a boleta first so NC can reference it
    await seedDte(db, {
      id: "dte-lv-boleta",
      type: "boleta",
      folio: 1,
      issuedAt: new Date("2026-05-10T12:00:00Z"),
    });
    // NC in same period — must be EXCLUDED
    await seedDte(db, {
      id: "dte-lv-nc",
      type: "nota_credito",
      folio: 1,
      documentCode: 61,
      referenceDteId: "dte-lv-boleta",
      issuedAt: new Date("2026-05-12T12:00:00Z"),
    });
    // ND in same period — must also be EXCLUDED
    await seedDte(db, {
      id: "dte-lv-nd",
      type: "nota_debito",
      folio: 1,
      documentCode: 56,
      referenceDteId: "dte-lv-boleta",
      issuedAt: new Date("2026-05-13T12:00:00Z"),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getLibroVentasWithDb(db as any, "2026-05");

    // Only boleta should appear
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].tipo).toBe("boleta");
    // NC row is absent
    const types = result.rows.map((r) => r.tipo);
    expect(types).not.toContain("nota_credito");
    expect(types).not.toContain("nota_debito");
  });

  it("CSV column headers match SII spec (spec L-1-b)", async () => {
    const { getLibroVentasWithDb } = await import("../documentos");
    const db = await createTestDb();

    await seedDte(db, {
      id: "dte-lv-cols",
      type: "boleta",
      folio: 1,
      issuedAt: new Date("2026-05-20T12:00:00Z"),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getLibroVentasWithDb(db as any, "2026-05");

    expect(result.rows).toHaveLength(1);
    const row = result.rows[0];
    // Expected SII columns present
    expect(row).toHaveProperty("folio");
    expect(row).toHaveProperty("tipo");
    expect(row).toHaveProperty("fecha");
    expect(row).toHaveProperty("rutReceptor");
    expect(row).toHaveProperty("razonSocial");
    expect(row).toHaveProperty("neto");
    expect(row).toHaveProperty("iva");
    expect(row).toHaveProperty("total");
  });

  it("row-level IVA invariant: neto + iva === total (spec L-2-a)", async () => {
    const { getLibroVentasWithDb } = await import("../documentos");
    const db = await createTestDb();

    await seedDte(db, {
      id: "dte-lv-iva",
      type: "boleta",
      folio: 1,
      net: 10000,
      taxAmount: 1900,
      total: 11900,
      issuedAt: new Date("2026-05-20T12:00:00Z"),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getLibroVentasWithDb(db as any, "2026-05");
    const row = result.rows[0];
    expect(row.neto + row.iva).toBe(row.total);
    expect(row.neto).toBe(10000);
    expect(row.iva).toBe(1900);
    expect(row.total).toBe(11900);
  });

  it("aggregate period totals reconcile (spec L-2-b)", async () => {
    const { getLibroVentasWithDb } = await import("../documentos");
    const db = await createTestDb();

    await seedDte(db, { id: "dte-lv-t1", type: "boleta", folio: 1, net: 10000, taxAmount: 1900, total: 11900, issuedAt: new Date("2026-05-01T12:00:00Z") });
    await seedDte(db, { id: "dte-lv-t2", type: "factura", folio: 1, net: 20000, taxAmount: 3800, total: 23800, issuedAt: new Date("2026-05-02T12:00:00Z") });
    await seedDte(db, { id: "dte-lv-t3", type: "boleta", folio: 2, net: 5000, taxAmount: 950, total: 5950, issuedAt: new Date("2026-05-03T12:00:00Z") });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await getLibroVentasWithDb(db as any, "2026-05");

    expect(result.rows).toHaveLength(3);
    expect(result.totals.totalNeto).toBe(35000);
    expect(result.totals.totalIva).toBe(6650);
    expect(result.totals.totalAmount).toBe(41650);
  });
});

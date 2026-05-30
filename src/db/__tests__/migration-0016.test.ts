/**
 * T-01 / T-04 [SCHEMA] Migration 0016 — DTE full widening
 * Verifies new columns, dte_folio_counters table, checkout_sessions additions,
 * and the UNIQUE (type, folio) constraint that prevents duplicate folios.
 */
import { describe, it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import * as schema from "@/db/schema";
import { sql } from "drizzle-orm";

async function createTestDb() {
  const pglite = new PGlite();
  const db = drizzle(pglite, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return { db, pglite };
}

// Minimal user needed for FK chains
const baseUser = {
  id: "u-016-1",
  email: "mig016@test.cl",
  name: "Mig016 User",
  role: "customer" as const,
  isDemoSeed: false,
  createdAt: new Date().toISOString(),
};

// Minimal order needed to insert a DTE
async function insertBaseOrder(db: ReturnType<typeof drizzle<typeof schema>>) {
  await db.insert(schema.brands).values({ id: "brand-016", slug: "brand-016", name: "Brand 016" });
  await db.insert(schema.products).values({
    id: "prod-016",
    slug: "prod-016",
    name: "Product 016",
    brandId: "brand-016",
    description: "Test",
  });
  await db.insert(schema.checkoutSessions).values({
    id: "cs-016",
    userId: "u-016-1",
    idempotencyKey: "ik-016",
    cartSnapshot: [],
    expiresAt: new Date(Date.now() + 3600_000),
  });
  await db.insert(schema.orders).values({
    id: "order-016",
    orderNumber: "PET-20260530-00001",
    userId: "u-016-1",
    checkoutSessionId: "cs-016",
    paymentGateway: "mock",
    address: {},
    shippingOptionId: "ship-1",
    shippingCost: 0,
    subtotal: 11900,
    discountTotal: 0,
    walletDiscount: 0,
    total: 11900,
  });
}

describe("migration 0016 — DTE full widening (T-01, T-04)", () => {
  it("S-1-a: all new dte_documents columns exist after migration", async () => {
    const { db } = await createTestDb();
    await db.insert(schema.users).values(baseUser);
    await insertBaseOrder(db as never);

    // Insert a DTE row using new F3.6 columns
    const dteId = "dte-016-a";
    await db.insert(schema.dteDocuments).values({
      id: dteId,
      orderId: "order-016",
      dteId: "DTE-MOCK-ABCD",
      status: "emitido",
      folio: 1,
      type: "boleta",
      net: 10000,
      taxAmount: 1900,
      total: 11900,
      issuerRut: "76000000-0",
      receiverRut: "66666666-6",
      receiverName: "Consumidor Final",
      documentCode: 39,
      stamp: "c3RhbXA=",
      pdfUrl: `/api/dte/${dteId}/pdf`,
      issuedAt: new Date(),
    });

    const rows = await db
      .select()
      .from(schema.dteDocuments);

    expect(rows).toHaveLength(1);
    expect(rows[0].net).toBe(10000);
    expect(rows[0].taxAmount).toBe(1900);
    expect(rows[0].total).toBe(11900);
    expect(rows[0].issuerRut).toBe("76000000-0");
    expect(rows[0].receiverRut).toBe("66666666-6");
    expect(rows[0].documentCode).toBe(39);
  });

  it("S-1-b: orderId nullable allows NC row (no order_id)", async () => {
    const { db } = await createTestDb();
    await db.insert(schema.users).values(baseUser);
    await insertBaseOrder(db as never);

    // Insert original DTE
    await db.insert(schema.dteDocuments).values({
      id: "dte-016-orig",
      orderId: "order-016",
      dteId: "DTE-MOCK-ORIG",
      status: "emitido",
      folio: 1,
      type: "boleta",
      issuedAt: new Date(),
    });

    // Insert NC with null orderId and referenceDteId
    await expect(
      db.insert(schema.dteDocuments).values({
        id: "dte-016-nc",
        orderId: null,
        dteId: "DTE-MOCK-NC",
        status: "emitido",
        folio: 1,
        type: "nota_credito",
        referenceDteId: "dte-016-orig",
        issuedAt: new Date(),
      }),
    ).resolves.toBeDefined();
  });

  it("S-2: dte_folio_counters table accepts inserts", async () => {
    const { db } = await createTestDb();
    await db.insert(schema.dtefolioCounters).values({ type: "boleta", lastFolio: 5 });
    const rows = await db.select().from(schema.dtefolioCounters);
    expect(rows).toHaveLength(1);
    expect(rows[0].lastFolio).toBe(5);
  });

  it("A-5-a (T-04): UNIQUE (type, folio) constraint blocks duplicate folio insert", async () => {
    const { db } = await createTestDb();
    await db.insert(schema.users).values(baseUser);
    await insertBaseOrder(db as never);

    // Insert first DTE with boleta folio=10
    await db.insert(schema.dteDocuments).values({
      id: "dte-unique-1",
      orderId: "order-016",
      dteId: "DTE-MOCK-U1",
      status: "emitido",
      folio: 10,
      type: "boleta",
      issuedAt: new Date(),
    });

    // Attempt to insert duplicate (same type + folio) — must fail
    await expect(
      db.insert(schema.dteDocuments).values({
        id: "dte-unique-2",
        orderId: null,
        dteId: "DTE-MOCK-U2",
        status: "emitido",
        folio: 10,
        type: "boleta",
        issuedAt: new Date(),
      }),
    ).rejects.toThrow();
  });

  it("checkout_sessions accepts document_type and receiver columns", async () => {
    const { db } = await createTestDb();
    await db.insert(schema.users).values(baseUser);

    await db.insert(schema.checkoutSessions).values({
      id: "cs-016-dt",
      userId: "u-016-1",
      idempotencyKey: "ik-016-dt",
      cartSnapshot: [],
      documentType: "factura",
      receiver: { rut: "12345678-9", name: "Empresa SPA", businessLine: "Comercio" },
      expiresAt: new Date(Date.now() + 3600_000),
    });

    const rows = await db
      .select()
      .from(schema.checkoutSessions);

    expect(rows[0].documentType).toBe("factura");
    expect((rows[0].receiver as Record<string, string>)?.rut).toBe("12345678-9");
  });
});

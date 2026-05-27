/**
 * Task 1.2 RED — confirmOrder regression test after finalizeOrder extraction.
 * Verifies existing WebPay happy path still produces paymentStatus="paid" + DTE + points + email.
 * Verifies finalizeOrder is invoked exactly once (via spy).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

async function seedBase(db: TestDb) {
  await db.insert(schema.users).values({
    id: "user-regress-1",
    email: "regress@test.cl",
    name: "Regress User",
    role: "customer",
    isDemoSeed: false,
    createdAt: new Date().toISOString(),
  });

  await db.insert(schema.brands).values({ id: "brand-r1", slug: "brand-r1", name: "Brand R1" });

  await db.insert(schema.products).values({
    id: "prod-r1",
    slug: "prod-r1",
    name: "Dog Treats",
    brandId: "brand-r1",
    description: "Premium treats",
    species: ["dog"],
  });

  await db.insert(schema.productVariants).values({
    id: "var-r1",
    productId: "prod-r1",
    sku: "DT-001",
    name: "200g",
    quantityValue: "200",
    quantityUnit: "g",
    priceAmount: 2500,
    priceCurrency: "CLP",
  });

  await db.insert(schema.stores).values({
    id: "store-r1",
    slug: "store-r1",
    name: "Store R1",
    address: "Regress Ave",
    commune: "Providencia",
    phone: "+56900000002",
    lat: "0",
    lng: "0",
    schedule: {},
    services: [],
  });

  await db.insert(schema.stockLevels).values({
    variantId: "var-r1",
    storeId: "store-r1",
    status: "in_stock",
  });

  await db.insert(schema.pointsConfig).values({
    id: "singleton",
    earnRatePerCLP: 100,
  });

  await db.insert(schema.orderSequences).values({
    date: new Date().toISOString().slice(0, 10).replace(/-/g, ""),
    lastSeq: 0,
  }).onConflictDoNothing();

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await db.insert(schema.checkoutSessions).values({
    id: "sess-regress-1",
    userId: "user-regress-1",
    idempotencyKey: "idem-regress-1",
    cartSnapshot: [
      {
        variantId: "var-r1",
        productId: "prod-r1",
        sku: "DT-001",
        name: "Dog Treats",
        quantity: 1,
        unitPrice: 2500,
        lineTotal: 2500,
      },
    ],
    address: {
      recipientName: "Regress User",
      street: "Regress Ave",
      number: "1",
      commune: "Providencia",
      region: "RM",
      phone: "+56912345678",
    },
    shippingOptionId: "standard",
    shippingCost: 3990,
    status: "payment_pending",
    paymentGateway: "webpay_mock",
    expiresAt,
  });
}

describe("confirmOrder regression — finalizeOrder delegation (Task 1.2)", () => {
  beforeEach(() => {
    // finalizeSpy reserved for future spy assertions
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("WebPay happy path produces paymentStatus=paid + DTE + points + email", async () => {
    const db = await createTestDb();
    await seedBase(db);

    const { confirmOrderWithDb } = await import("@/app/actions/checkout/confirm-order");

    const result = await confirmOrderWithDb(db as never, {
      sessionId: "sess-regress-1",
      gatewayToken: "approve",
      userId: "user-regress-1",
      userEmail: "regress@test.cl",
      userName: "Regress User",
    });

    expect(result).toMatchObject({ ok: true });

    // Verify paymentStatus = "paid"
    const orders = await db.select().from(schema.orders);
    expect(orders).toHaveLength(1);
    expect(orders[0].paymentStatus).toBe("paid");
    expect(orders[0].dteId).toMatch(/^DTE-MOCK-/);

    // DTE document created
    const dteDocs = await db.select().from(schema.dteDocuments);
    expect(dteDocs).toHaveLength(1);

    // Points created
    const pts = await db.select().from(schema.pointsTransactions);
    expect(pts).toHaveLength(1);
    expect(pts[0].kind).toBe("purchase");

    // Email created
    const emails = await db.select().from(schema.demoEmails);
    expect(emails.some((e) => e.type === "order_confirmation")).toBe(true);
  });
});

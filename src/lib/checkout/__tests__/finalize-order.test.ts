/**
 * Task 1.1 RED — finalizeOrder integration test (real PGlite).
 * Pre-inserts an order row; calls finalizeOrder(tx, ctx);
 * asserts dte_documents row created, orders.dteId updated,
 * points_transactions row created, demo_emails row created.
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

async function createTestDb() {
  const pglite = new PGlite();
  const db = drizzle(pglite, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db;
}

type TestDb = ReturnType<typeof drizzle<typeof schema>>;

async function seedBase(db: TestDb) {
  await db.insert(schema.users).values({
    id: "user-finalize-1",
    email: "finalize@test.cl",
    name: "Finalize User",
    role: "customer",
    isDemoSeed: false,
    createdAt: new Date().toISOString(),
  });

  await db.insert(schema.brands).values({ id: "brand-f1", slug: "brand-f1", name: "Brand F1" });

  await db.insert(schema.products).values({
    id: "prod-f1",
    slug: "prod-f1",
    name: "Cat Food",
    brandId: "brand-f1",
    description: "Premium cat food",
    species: ["cat"],
  });

  await db.insert(schema.productVariants).values({
    id: "var-f1",
    productId: "prod-f1",
    sku: "CF-001",
    name: "500g",
    quantityValue: "500",
    quantityUnit: "g",
    priceAmount: 3000,
    priceCurrency: "CLP",
  });

  await db.insert(schema.stores).values({
    id: "store-f1",
    slug: "store-f1",
    name: "Store F1",
    address: "Test Ave",
    commune: "Santiago",
    phone: "+56900000001",
    lat: "0",
    lng: "0",
    schedule: {},
    services: [],
  });

  await db.insert(schema.stockLevels).values({
    variantId: "var-f1",
    storeId: "store-f1",
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
    id: "sess-finalize-1",
    userId: "user-finalize-1",
    idempotencyKey: "idem-finalize-1",
    cartSnapshot: [
      {
        variantId: "var-f1",
        productId: "prod-f1",
        sku: "CF-001",
        name: "Cat Food",
        quantity: 2,
        unitPrice: 3000,
        lineTotal: 6000,
      },
    ],
    address: {
      recipientName: "Finalize User",
      street: "Test Ave",
      number: "1",
      commune: "Santiago",
      region: "RM",
      phone: "+56912345678",
    },
    shippingOptionId: "standard",
    shippingCost: 2990,
    status: "payment_pending",
    expiresAt,
  });
}

describe("finalizeOrder — integration (real PGlite)", () => {
  it("creates dte_documents row, updates orders.dteId, creates points_transactions, creates demo_emails", async () => {
    const db = await createTestDb();
    await seedBase(db);

    // Pre-insert the order row (as callers of finalizeOrder do)
    const orderId = "order-finalize-1";
    const orderNumber = "PET-20260101-00001";
    await db.insert(schema.orders).values({
      id: orderId,
      orderNumber,
      userId: "user-finalize-1",
      checkoutSessionId: "sess-finalize-1",
      status: "confirmed",
      paymentStatus: "pending_verification",
      paymentGateway: "transfer_mock",
      address: {},
      shippingOptionId: "standard",
      shippingCost: 2990,
      subtotal: 6000,
      discountTotal: 0,
      walletDiscount: 0,
      total: 8990,
      pointsRedeemed: 0,
      pointsEarned: 0,
    });

    const cartSnapshot = [
      {
        variantId: "var-f1",
        productId: "prod-f1",
        sku: "CF-001",
        name: "Cat Food",
        quantity: 2,
        unitPrice: 3000,
        lineTotal: 6000,
      },
    ];

    const { finalizeOrder } = await import("@/lib/checkout/finalize-order");

    let dteId!: string;
    await db.transaction(async (tx) => {
      const result = await finalizeOrder(tx as never, {
        orderId,
        orderNumber,
        userId: "user-finalize-1",
        userEmail: "finalize@test.cl",
        userName: "Finalize User",
        cartSnapshot,
        subtotal: 6000,
        shippingCost: 2990,
        total: 8990,
        shippingAddress: { recipientName: "Finalize User", commune: "Santiago" },
        paymentMethodLabel: "Transferencia bancaria (Demo)",
        pointsEarned: Math.floor(8990 / 100),
        // T-12 [RED] — widened context fields
        documentType: "boleta",
        receiver: { rut: "66666666-6", name: "Finalize User" },
        items: [
          {
            description: "Cat Food",
            quantity: 2,
            unitPrice: 3000,
            lineTotal: 6000,
            afecto: true,
          },
        ],
      });
      dteId = result.dteId;
    });

    // dte_documents row created
    const dteDocs = await db.select().from(schema.dteDocuments);
    expect(dteDocs).toHaveLength(1);
    expect(dteDocs[0].orderId).toBe(orderId);
    // T-12 [RED] — row must now be fully populated (I-3)
    expect(dteDocs[0].status).toBe("emitido");
    expect(dteDocs[0].folio).toBeGreaterThanOrEqual(1);
    expect(dteDocs[0].net).toBeGreaterThan(0);
    expect(dteDocs[0].taxAmount).toBeGreaterThan(0);
    expect(dteDocs[0].total).toBe(8990);
    // INV-2: net + taxAmount === total
    expect((dteDocs[0].net ?? 0) + (dteDocs[0].taxAmount ?? 0)).toBe(dteDocs[0].total);
    expect(dteDocs[0].stamp).toBeTruthy();
    expect(dteDocs[0].pdfUrl).toMatch(/^\/api\/dte\/.+\/pdf$/);

    // orders.dteId updated
    const orderRows = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
    expect(orderRows[0].dteId).toBe(dteId);

    // points_transactions row created
    const ptxRows = await db.select().from(schema.pointsTransactions);
    expect(ptxRows).toHaveLength(1);
    expect(ptxRows[0].kind).toBe("purchase");
    expect(ptxRows[0].referenceId).toBe(orderId);

    // demo_emails row created
    const emailRows = await db.select().from(schema.demoEmails);
    expect(emailRows.some((e) => e.type === "order_confirmation")).toBe(true);
  });

  it("skips points_transactions row when pointsEarned is 0", async () => {
    const db = await createTestDb();
    await seedBase(db);

    const orderId = "order-finalize-no-points";
    const orderNumber = "PET-20260101-00002";
    await db.insert(schema.orders).values({
      id: orderId,
      orderNumber,
      userId: "user-finalize-1",
      checkoutSessionId: "sess-finalize-1",
      status: "confirmed",
      paymentStatus: "pending_verification",
      paymentGateway: "transfer_mock",
      address: {},
      shippingOptionId: "standard",
      shippingCost: 0,
      subtotal: 0,
      discountTotal: 0,
      walletDiscount: 0,
      total: 0,
      pointsRedeemed: 0,
      pointsEarned: 0,
    });

    const { finalizeOrder } = await import("@/lib/checkout/finalize-order");

    await db.transaction(async (tx) => {
      await finalizeOrder(tx as never, {
        orderId,
        orderNumber,
        userId: "user-finalize-1",
        userEmail: "finalize@test.cl",
        userName: "Finalize User",
        cartSnapshot: [],
        subtotal: 0,
        shippingCost: 0,
        total: 0,
        shippingAddress: {},
        paymentMethodLabel: "Transferencia bancaria (Demo)",
        pointsEarned: 0,
        // T-12 [RED] — widened context fields (zero-value boleta)
        documentType: "boleta",
        receiver: { rut: "66666666-6", name: "Consumidor Final" },
        items: [],
      });
    });

    const ptxRows = await db.select().from(schema.pointsTransactions);
    expect(ptxRows).toHaveLength(0);
  });
});

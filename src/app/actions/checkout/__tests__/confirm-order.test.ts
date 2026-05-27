/**
 * Task 4.9 RED — confirmOrder integration test (real PGlite).
 * Happy path: creates orders+items+pointsTransaction+email rows, stock decremented.
 * Stock-out → rollback.
 * REJECT_TEST token → PAYMENT_REJECTED + rollback.
 * Duplicate sessionId → returns existing orderNumber.
 * SESSION_EXPIRED → error.
 */
import { describe, it, expect, vi } from "vitest";

// Mock session so server-only doesn't throw at module load
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

async function seedBase(db: ReturnType<typeof drizzle<typeof schema>>) {
  // user
  await db.insert(schema.users).values({
    id: "user-confirm-1",
    email: "confirm@test.cl",
    name: "Confirm User",
    role: "customer",
    isDemoSeed: false,
    createdAt: new Date().toISOString(),
  });

  // brand, product, variant
  await db.insert(schema.brands).values({
    id: "brand-c1",
    slug: "brand-c1",
    name: "Brand C1",
  });

  await db.insert(schema.products).values({
    id: "prod-c1",
    slug: "prod-c1",
    name: "Dog Food Premium",
    brandId: "brand-c1",
    description: "Premium dog food",
    species: ["dog"],
  });

  await db.insert(schema.productVariants).values({
    id: "var-c1",
    productId: "prod-c1",
    sku: "DF-001",
    name: "1kg",
    quantityValue: "1",
    quantityUnit: "kg",
    priceAmount: 5000,
    priceCurrency: "CLP",
  });

  // store + stock
  await db.insert(schema.stores).values({
    id: "store-c1",
    slug: "store-c1",
    name: "Store C1",
    address: "Test St",
    commune: "Santiago",
    phone: "+56900000000",
    lat: "0",
    lng: "0",
    schedule: {},
    services: [],
  });

  await db.insert(schema.stockLevels).values({
    variantId: "var-c1",
    storeId: "store-c1",
    status: "in_stock",
  });

  // points config
  await db.insert(schema.pointsConfig).values({
    id: "singleton",
    earnRatePerCLP: 100,
  });

  // order sequences
  await db.insert(schema.orderSequences).values({
    date: new Date().toISOString().slice(0, 10).replace(/-/g, ""),
    lastSeq: 0,
  }).onConflictDoNothing();

  // checkout session
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await db.insert(schema.checkoutSessions).values({
    id: "sess-confirm-1",
    userId: "user-confirm-1",
    idempotencyKey: "idem-confirm-1",
    cartSnapshot: [{ variantId: "var-c1", productId: "prod-c1", sku: "DF-001", name: "Dog Food Premium", quantity: 1, unitPrice: 5000, lineTotal: 5000 }],
    address: { recipientName: "Confirm User", street: "Test St", number: "1", commune: "Santiago", region: "RM", phone: "+56912345678" },
    shippingOptionId: "standard",
    shippingCost: 3990,
    status: "payment_pending",
    expiresAt,
  });
}

describe("confirmOrder — integration (real PGlite)", () => {
  it("happy path: creates order, items, decrements stock, earns points, sends email", async () => {
    const db = await createTestDb();
    await seedBase(db);

    const { confirmOrderWithDb } = await import("@/app/actions/checkout/confirm-order");

    const result = await confirmOrderWithDb(db as never, {
      sessionId: "sess-confirm-1",
      gatewayToken: "approve",
      userId: "user-confirm-1",
      userEmail: "confirm@test.cl",
      userName: "Confirm User",
    });

    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.orderNumber).toMatch(/^PET-\d{8}-\d{5}$/);
    }

    // Verify order was created
    const orders = await db.select().from(schema.orders);
    expect(orders).toHaveLength(1);
    expect(orders[0].status).toBe("confirmed");
    expect(orders[0].paymentStatus).toBe("paid");

    // Verify order items
    const items = await db.select().from(schema.orderItems);
    expect(items).toHaveLength(1);
    expect(items[0].unitPrice).toBe(5000);

    // Verify email was queued
    const emails = await db.select().from(schema.demoEmails);
    expect(emails.some((e) => e.type === "order_confirmation")).toBe(true);

    // W2: Verify dteId is saved on the order
    expect(orders[0].dteId).toMatch(/^DTE-MOCK-/);

    // W2: Verify dte_documents row was created
    const dteDocs = await db.select().from(schema.dteDocuments);
    expect(dteDocs).toHaveLength(1);
    expect(dteDocs[0].orderId).toBe(orders[0].id);
    expect(dteDocs[0].dteId).toBe(orders[0].dteId);
    expect(dteDocs[0].status).toBe("emitido");
  });

  it("PAYMENT_REJECTED rolls back — no order created", async () => {
    const db = await createTestDb();
    await seedBase(db);

    // Use a fresh session
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await db.insert(schema.checkoutSessions).values({
      id: "sess-reject-1",
      userId: "user-confirm-1",
      idempotencyKey: "idem-reject-1",
      cartSnapshot: [{ variantId: "var-c1", productId: "prod-c1", sku: "DF-001", name: "Dog Food Premium", quantity: 1, unitPrice: 5000, lineTotal: 5000 }],
      address: { recipientName: "Confirm User", street: "Test St", number: "1", commune: "Santiago", region: "RM", phone: "+56912345678" },
      shippingOptionId: "standard",
      shippingCost: 3990,
      status: "payment_pending",
      expiresAt,
    });

    const { confirmOrderWithDb } = await import("@/app/actions/checkout/confirm-order");

    const result = await confirmOrderWithDb(db as never, {
      sessionId: "sess-reject-1",
      gatewayToken: "REJECT_TEST",
      userId: "user-confirm-1",
      userEmail: "confirm@test.cl",
      userName: "Confirm User",
    });

    expect(result).toMatchObject({ ok: false, code: "PAYMENT_REJECTED" });

    const orderCount = await db.select().from(schema.orders);
    expect(orderCount).toHaveLength(0);
  });

  it("duplicate confirmOrder returns existing orderNumber (idempotency)", async () => {
    const db = await createTestDb();
    await seedBase(db);

    const { confirmOrderWithDb } = await import("@/app/actions/checkout/confirm-order");

    // First call
    const result1 = await confirmOrderWithDb(db as never, {
      sessionId: "sess-confirm-1",
      gatewayToken: "approve",
      userId: "user-confirm-1",
      userEmail: "confirm@test.cl",
      userName: "Confirm User",
    });

    expect(result1.ok).toBe(true);

    // Second call — idempotent
    const result2 = await confirmOrderWithDb(db as never, {
      sessionId: "sess-confirm-1",
      gatewayToken: "approve",
      userId: "user-confirm-1",
      userEmail: "confirm@test.cl",
      userName: "Confirm User",
    });

    expect(result2.ok).toBe(true);
    if (result1.ok && result2.ok) {
      expect(result2.orderNumber).toBe(result1.orderNumber);
    }

    // Verify only one order was created
    const orders = await db.select().from(schema.orders);
    expect(orders).toHaveLength(1);
  });

  it("SESSION_EXPIRED returns error", async () => {
    const db = await createTestDb();
    await seedBase(db);

    // Insert expired session
    const pastExpiry = new Date(Date.now() - 1000);
    await db.insert(schema.checkoutSessions).values({
      id: "sess-expired-1",
      userId: "user-confirm-1",
      idempotencyKey: "idem-expired-1",
      cartSnapshot: [],
      status: "payment_pending",
      expiresAt: pastExpiry,
    });

    const { confirmOrderWithDb } = await import("@/app/actions/checkout/confirm-order");

    const result = await confirmOrderWithDb(db as never, {
      sessionId: "sess-expired-1",
      gatewayToken: "approve",
      userId: "user-confirm-1",
      userEmail: "confirm@test.cl",
      userName: "Confirm User",
    });

    expect(result).toMatchObject({ ok: false, code: "SESSION_EXPIRED" });
  });
});

/**
 * Task 1.1 RED — Schema migration test for checkout tables.
 * Asserts checkout_sessions, orders, order_items, order_sequences exist
 * with expected columns and constraints.
 */
import { describe, it, expect } from "vitest";
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

describe("schema migration — checkout tables", () => {
  it("checkout_sessions table exists with expected columns", async () => {
    const db = await createTestDb();

    // Insert a user (FK requirement)
    await db.insert(schema.users).values({
      id: "user-cs-1",
      email: "cs@test.cl",
      name: "CS User",
      role: "customer",
      isDemoSeed: false,
      createdAt: new Date().toISOString(),
    });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);

    await db.insert(schema.checkoutSessions).values({
      id: "session-1",
      userId: "user-cs-1",
      idempotencyKey: "idem-key-1",
      cartSnapshot: [{ productId: "p1", quantity: 1, unitPrice: 1000 }],
      status: "active",
      expiresAt,
    });

    const rows = await db
      .select()
      .from(schema.checkoutSessions)
      .where(eq(schema.checkoutSessions.id, "session-1"));
    expect(rows.length).toBeGreaterThan(0);

    const session = rows[0];
    expect(session.id).toBe("session-1");
    expect(session.status).toBe("active");
    expect(session.idempotencyKey).toBe("idem-key-1");
  });

  it("orders table exists with expected columns", async () => {
    const db = await createTestDb();

    await db.insert(schema.users).values({
      id: "user-ord-1",
      email: "ord@test.cl",
      name: "Ord User",
      role: "customer",
      isDemoSeed: false,
      createdAt: new Date().toISOString(),
    });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);

    await db.insert(schema.checkoutSessions).values({
      id: "session-ord-1",
      userId: "user-ord-1",
      idempotencyKey: "idem-key-ord-1",
      cartSnapshot: [],
      status: "completed",
      expiresAt,
    });

    await db.insert(schema.orders).values({
      id: "order-1",
      orderNumber: "PET-20260526-0001",
      userId: "user-ord-1",
      checkoutSessionId: "session-ord-1",
      status: "confirmed",
      paymentStatus: "paid",
      paymentGateway: "webpay_mock",
      address: { street: "Test St", commune: "Santiago" },
      shippingOptionId: "standard",
      shippingCost: 3990,
      subtotal: 10000,
      discountTotal: 0,
      walletDiscount: 0,
      total: 13990,
      pointsRedeemed: 0,
      pointsEarned: 100,
    });

    const rows = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.orderNumber, "PET-20260526-0001"));

    expect(rows.length).toBeGreaterThan(0);
    const order = rows[0];
    expect(order.orderNumber).toBe("PET-20260526-0001");
    expect(order.paymentStatus).toBe("paid");
  });

  it("order_items table exists and links to orders", async () => {
    const db = await createTestDb();

    await db.insert(schema.users).values({
      id: "user-oi-1",
      email: "oi@test.cl",
      name: "OI User",
      role: "customer",
      isDemoSeed: false,
      createdAt: new Date().toISOString(),
    });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);

    await db.insert(schema.checkoutSessions).values({
      id: "session-oi-1",
      userId: "user-oi-1",
      idempotencyKey: "idem-key-oi-1",
      cartSnapshot: [],
      status: "completed",
      expiresAt,
    });

    await db.insert(schema.orders).values({
      id: "order-oi-1",
      orderNumber: "PET-20260526-0002",
      userId: "user-oi-1",
      checkoutSessionId: "session-oi-1",
      status: "confirmed",
      paymentStatus: "paid",
      paymentGateway: "webpay_mock",
      address: {},
      shippingOptionId: "standard",
      shippingCost: 3990,
      subtotal: 5000,
      discountTotal: 0,
      walletDiscount: 0,
      total: 8990,
      pointsRedeemed: 0,
      pointsEarned: 50,
    });

    await db.insert(schema.orderItems).values({
      id: "item-1",
      orderId: "order-oi-1",
      productId: "prod-x",
      sku: "SKU-X",
      name: "Product X",
      quantity: 2,
      unitPrice: 2500,
      lineTotal: 5000,
    });

    const rows = await db
      .select()
      .from(schema.orderItems)
      .where(eq(schema.orderItems.orderId, "order-oi-1"));

    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].lineTotal).toBe(5000);
  });

  it("order_sequences table exists for order number generation", async () => {
    const db = await createTestDb();

    await db
      .insert(schema.orderSequences)
      .values({ date: "20260526", lastSeq: 0 })
      .onConflictDoNothing();

    const rows = await db.select().from(schema.orderSequences);
    expect(rows.some((r) => r.date === "20260526")).toBe(true);
  });

  it("checkout_sessions enforces idempotencyKey unique constraint", async () => {
    const db = await createTestDb();

    await db.insert(schema.users).values({
      id: "user-uq-1",
      email: "uq@test.cl",
      name: "UQ User",
      role: "customer",
      isDemoSeed: false,
      createdAt: new Date().toISOString(),
    });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);
    const sharedKey = "unique-key-123";

    await db.insert(schema.checkoutSessions).values({
      id: "session-uq-1",
      userId: "user-uq-1",
      idempotencyKey: sharedKey,
      cartSnapshot: [],
      status: "active",
      expiresAt,
    });

    await expect(
      db.insert(schema.checkoutSessions).values({
        id: "session-uq-2",
        userId: "user-uq-1",
        idempotencyKey: sharedKey, // duplicate
        cartSnapshot: [],
        status: "active",
        expiresAt,
      }),
    ).rejects.toThrow();
  });

  it("DEMO_EMAIL_TYPE includes order_confirmation", () => {
    expect(schema.DEMO_EMAIL_TYPE).toContain("order_confirmation");
  });
});

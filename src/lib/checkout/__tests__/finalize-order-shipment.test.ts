/**
 * Phase 5 RED — finalizeOrder shipment wiring tests
 * Task 5.1: gateway path creates exactly one shipments row (spec OF-1a)
 * Task 5.2: confirmTransfer path creates exactly one shipments row (spec OF-1b)
 * Task 5.3: idempotency — calling shipment step twice yields one row (spec OF-2a, OF-2b)
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/session", () => ({ getCurrentUser: vi.fn() }));

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

async function seedBase(db: TestDb, suffix: string) {
  const userId = `user-phase5-${suffix}`;
  const sessionId = `sess-phase5-${suffix}`;

  await db.insert(schema.users).values({
    id: userId,
    email: `phase5-${suffix}@test.cl`,
    name: "Phase5 User",
    role: "customer",
    isDemoSeed: false,
    createdAt: new Date().toISOString(),
  });

  await db.insert(schema.pointsConfig).values({
    id: "singleton",
    earnRatePerCLP: 100,
  }).onConflictDoNothing();

  await db.insert(schema.orderSequences).values({
    date: new Date().toISOString().slice(0, 10).replace(/-/g, ""),
    lastSeq: 0,
  }).onConflictDoNothing();

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await db.insert(schema.checkoutSessions).values({
    id: sessionId,
    userId,
    idempotencyKey: `idem-phase5-${suffix}`,
    cartSnapshot: [],
    status: "payment_pending",
    expiresAt,
    deliveryType: "despacho",
    dispatchSlot: "tarde",
  });

  return { userId, sessionId };
}

async function seedOrder(db: TestDb, orderId: string, userId: string, sessionId: string) {
  await db.insert(schema.orders).values({
    id: orderId,
    orderNumber: `PET-PHASE5-${orderId}`,
    userId,
    checkoutSessionId: sessionId,
    status: "confirmed",
    paymentStatus: "paid",
    paymentGateway: "transfer_mock",
    address: {},
    shippingOptionId: "propio",
    shippingCost: 0,
    subtotal: 25000,
    discountTotal: 0,
    walletDiscount: 0,
    total: 25000,
    pointsRedeemed: 0,
    pointsEarned: 0,
  });
}

describe("finalizeOrder — shipment step (Phase 5)", () => {
  it("OF-1a: gateway path — creates exactly one shipments row after finalizeOrder", async () => {
    const db = await createTestDb();
    const { userId, sessionId } = await seedBase(db, "of1a");
    const orderId = "order-of1a";
    await seedOrder(db, orderId, userId, sessionId);

    const { finalizeOrder } = await import("@/lib/checkout/finalize-order");

    await db.transaction(async (tx) => {
      await finalizeOrder(tx as never, {
        orderId,
        orderNumber: `PET-PHASE5-${orderId}`,
        userId,
        userEmail: `phase5-of1a@test.cl`,
        userName: "Phase5 User",
        cartSnapshot: [],
        subtotal: 25000,
        shippingCost: 0,
        total: 25000,
        shippingAddress: {},
        paymentMethodLabel: "WebPay (Demo)",
        pointsEarned: 0,
        carrier: "propio",
        dispatchSlot: "tarde",
        pickupStoreId: null,
        regionKey: null,
        deliveryType: "despacho",
      });
    });

    const shipmentRows = await db
      .select()
      .from(schema.shipments)
      .where(eq(schema.shipments.orderId, orderId));

    expect(shipmentRows).toHaveLength(1);
    expect(shipmentRows[0].carrier).toBe("propio");
    expect(shipmentRows[0].status).toBe("preparando");
    // SH-5a: dispatchSlot 'tarde' must be persisted in metadata.slot
    expect((shipmentRows[0].metadata as { carrier: string; slot: string }).slot).toBe("tarde");
  });

  it("OF-1b: confirmTransfer admin path — creates shipments row with correct carrier", async () => {
    const db = await createTestDb();
    const { userId, sessionId } = await seedBase(db, "of1b");
    const orderId = "order-of1b";
    await seedOrder(db, orderId, userId, sessionId);

    const { finalizeOrder } = await import("@/lib/checkout/finalize-order");

    await db.transaction(async (tx) => {
      await finalizeOrder(tx as never, {
        orderId,
        orderNumber: `PET-PHASE5-${orderId}`,
        userId,
        userEmail: `phase5-of1b@test.cl`,
        userName: "Phase5 User",
        cartSnapshot: [],
        subtotal: 10000,
        shippingCost: 2990,
        total: 12990,
        shippingAddress: {},
        paymentMethodLabel: "Transferencia bancaria (Demo)",
        pointsEarned: 0,
        carrier: "mock_chilexpress",
        dispatchSlot: null,
        pickupStoreId: null,
        regionKey: "RM",
        deliveryType: "courier",
      });
    });

    const shipmentRows = await db
      .select()
      .from(schema.shipments)
      .where(eq(schema.shipments.orderId, orderId));

    expect(shipmentRows).toHaveLength(1);
    expect(shipmentRows[0].carrier).toBe("mock_chilexpress");
  });

  it("OF-2a: idempotency — second call returns existing shipment, no new row created", async () => {
    const db = await createTestDb();
    const { userId, sessionId } = await seedBase(db, "of2a");
    const orderId = "order-of2a";
    await seedOrder(db, orderId, userId, sessionId);

    const { finalizeOrder } = await import("@/lib/checkout/finalize-order");

    const ctx = {
      orderId,
      orderNumber: `PET-PHASE5-${orderId}`,
      userId,
      userEmail: `phase5-of2a@test.cl`,
      userName: "Phase5 User",
      cartSnapshot: [],
      subtotal: 25000,
      shippingCost: 0,
      total: 25000,
      shippingAddress: {},
      paymentMethodLabel: "WebPay (Demo)",
      pointsEarned: 0,
      carrier: "propio" as const,
      dispatchSlot: "manana" as const,
      pickupStoreId: null,
      regionKey: null,
      deliveryType: "despacho" as const,
    };

    await db.transaction(async (tx) => {
      await finalizeOrder(tx as never, ctx);
    });

    // Second call — simulates retry / admin re-trigger
    await db.transaction(async (tx) => {
      await finalizeOrder(tx as never, ctx);
    });

    const shipmentRows = await db
      .select()
      .from(schema.shipments)
      .where(eq(schema.shipments.orderId, orderId));

    expect(shipmentRows).toHaveLength(1);
  });

  it("OF-2b: idempotency — pickup shipment has no trackingNumber and one row", async () => {
    const db = await createTestDb();
    const { userId, sessionId } = await seedBase(db, "of2b");

    // Seed a store for pickup
    await db.insert(schema.stores).values({
      id: "store-phase5",
      slug: "store-phase5",
      name: "Store Phase5",
      address: "Test Ave",
      commune: "Santiago",
      phone: "+56900000001",
      lat: "0",
      lng: "0",
      schedule: {},
      services: [],
    });

    const orderId = "order-of2b";
    await seedOrder(db, orderId, userId, sessionId);

    const { finalizeOrder } = await import("@/lib/checkout/finalize-order");

    const ctx = {
      orderId,
      orderNumber: `PET-PHASE5-${orderId}`,
      userId,
      userEmail: `phase5-of2b@test.cl`,
      userName: "Phase5 User",
      cartSnapshot: [],
      subtotal: 15000,
      shippingCost: 0,
      total: 15000,
      shippingAddress: {},
      paymentMethodLabel: "WebPay (Demo)",
      pointsEarned: 0,
      carrier: "pickup" as const,
      dispatchSlot: null,
      pickupStoreId: "store-phase5",
      regionKey: null,
      deliveryType: "pickup" as const,
    };

    await db.transaction(async (tx) => {
      await finalizeOrder(tx as never, ctx);
    });
    await db.transaction(async (tx) => {
      await finalizeOrder(tx as never, ctx);
    });

    const rows = await db
      .select()
      .from(schema.shipments)
      .where(eq(schema.shipments.orderId, orderId));

    expect(rows).toHaveLength(1);
    expect(rows[0].trackingNumber).toBeNull();
    expect((rows[0].metadata as { storeId: string }).storeId).toBe("store-phase5");
  });
});

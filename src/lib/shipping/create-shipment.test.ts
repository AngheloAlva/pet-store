/**
 * Task 2.5 RED — createShipment PGlite integration tests
 * SH-1a: creates row + initial tracking_events
 * SH-1b: idempotent — second call returns existing
 * SH-6a: pickup — no trackingNumber, metadata.storeId present
 */
import { describe, it, expect, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import path from "node:path";
import * as schema from "@/db/schema";

vi.mock("@/lib/session", () => ({ getCurrentUser: vi.fn() }));

async function createTestDb() {
  const pglite = new PGlite();
  const db = drizzle(pglite, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db;
}

type TestDb = ReturnType<typeof drizzle<typeof schema>>;

async function seedOrder(db: TestDb, orderId: string) {
  const userId = `user-cs-${orderId}`;
  await db.insert(schema.users).values({
    id: userId,
    email: `${orderId}@test.cl`,
    name: "Test User",
    role: "customer",
    isDemoSeed: false,
    createdAt: new Date().toISOString(),
  });

  await db.insert(schema.orderSequences).values({
    date: "20260527",
    lastSeq: 0,
  }).onConflictDoNothing();

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await db.insert(schema.checkoutSessions).values({
    id: `sess-${orderId}`,
    userId,
    idempotencyKey: `idem-${orderId}`,
    cartSnapshot: [],
    status: "completed",
    expiresAt,
  });

  await db.insert(schema.orders).values({
    id: orderId,
    orderNumber: `PET-${orderId}`,
    userId,
    checkoutSessionId: `sess-${orderId}`,
    status: "confirmed",
    paymentStatus: "paid",
    paymentGateway: "transfer_mock",
    address: {},
    shippingOptionId: "standard",
    shippingCost: 0,
    subtotal: 10000,
    discountTotal: 0,
    walletDiscount: 0,
    total: 10000,
    pointsRedeemed: 0,
    pointsEarned: 0,
  });
}

describe("createShipmentContextSchema — SH-2a carrier boundary", () => {
  it("accepts valid carriers", async () => {
    const { createShipmentContextSchema } = await import("./create-shipment");
    const validCarriers = ["propio", "mock_chilexpress", "mock_starken", "pickup"] as const;
    for (const carrier of validCarriers) {
      const result = createShipmentContextSchema.safeParse({
        orderId: "ord-1",
        carrier,
        metadata: {},
      });
      expect(result.success, `carrier '${carrier}' should be valid`).toBe(true);
    }
  });

  it("rejects unknown carrier 'fedex' before any DB write", async () => {
    const { createShipmentContextSchema } = await import("./create-shipment");
    const result = createShipmentContextSchema.safeParse({
      orderId: "ord-1",
      carrier: "fedex",
      metadata: {},
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty carrier string", async () => {
    const { createShipmentContextSchema } = await import("./create-shipment");
    const result = createShipmentContextSchema.safeParse({
      orderId: "ord-1",
      carrier: "",
      metadata: {},
    });
    expect(result.success).toBe(false);
  });
});

describe("createShipment — PGlite integration", () => {
  it("SH-1a: creates shipments row + initial tracking_events row", async () => {
    const db = await createTestDb();
    await seedOrder(db, "order-cs-1");

    const { createShipment } = await import("./create-shipment");

    let result!: { shipmentId: string };
    await db.transaction(async (tx) => {
      result = await createShipment(tx as never, {
        orderId: "order-cs-1",
        carrier: "propio",
        metadata: { carrier: "propio", slot: "tarde" },
        trackingNumber: undefined,
      });
    });

    expect(result.shipmentId).toBeTruthy();

    const shipmentRows = await db
      .select()
      .from(schema.shipments)
      .where(eq(schema.shipments.orderId, "order-cs-1"));

    expect(shipmentRows).toHaveLength(1);
    expect(shipmentRows[0].status).toBe("preparando");
    expect(shipmentRows[0].carrier).toBe("propio");

    const events = await db
      .select()
      .from(schema.trackingEvents)
      .where(eq(schema.trackingEvents.shipmentId, result.shipmentId));

    expect(events).toHaveLength(1);
    expect(events[0].status).toBe("preparando");
  });

  it("SH-1b: idempotent — second call returns existing row", async () => {
    const db = await createTestDb();
    await seedOrder(db, "order-cs-2");

    const { createShipment } = await import("./create-shipment");

    let r1!: { shipmentId: string };
    let r2!: { shipmentId: string };

    await db.transaction(async (tx) => {
      r1 = await createShipment(tx as never, {
        orderId: "order-cs-2",
        carrier: "propio",
        metadata: { carrier: "propio", slot: "manana" },
      });
    });

    await db.transaction(async (tx) => {
      r2 = await createShipment(tx as never, {
        orderId: "order-cs-2",
        carrier: "propio",
        metadata: { carrier: "propio", slot: "manana" },
      });
    });

    expect(r2.shipmentId).toBe(r1.shipmentId);

    const allRows = await db.select().from(schema.shipments);
    expect(allRows).toHaveLength(1);
  });

  it("SH-6a: pickup — trackingNumber is null, metadata has storeId", async () => {
    const db = await createTestDb();
    await seedOrder(db, "order-cs-3");

    const { createShipment } = await import("./create-shipment");

    let result!: { shipmentId: string };
    await db.transaction(async (tx) => {
      result = await createShipment(tx as never, {
        orderId: "order-cs-3",
        carrier: "pickup",
        metadata: { carrier: "pickup", storeId: "store-providencia" },
      });
    });

    const rows = await db
      .select()
      .from(schema.shipments)
      .where(eq(schema.shipments.id, result.shipmentId));

    expect(rows[0].trackingNumber).toBeNull();
    expect((rows[0].metadata as { storeId: string }).storeId).toBe("store-providencia");
  });
});

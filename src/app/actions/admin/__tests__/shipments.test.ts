/**
 * Task 6.1 RED — advanceShipmentStatus integration tests (PGlite).
 * AO-2a: Valid advance updates status and inserts tracking_events row.
 * AO-2b: Terminal status (entregado) returns INVALID_TRANSITION.
 * AO-2c: Invalid transition returns INVALID_TRANSITION.
 * AO-2d: Non-admin returns FORBIDDEN.
 * AO-2e: Unknown shipmentId returns SHIPMENT_NOT_FOUND.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
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

async function seedAdminAndOrder(db: TestDb) {
  await db.insert(schema.users).values([
    {
      id: "admin-ship-1",
      email: "admin@ship.cl",
      name: "Admin Ship",
      role: "admin",
      isDemoSeed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: "customer-ship-1",
      email: "customer@ship.cl",
      name: "Customer Ship",
      role: "customer",
      isDemoSeed: false,
      createdAt: new Date().toISOString(),
    },
  ]);

  await db.insert(schema.checkoutSessions).values({
    id: "cs-ship-test-1",
    userId: "customer-ship-1",
    idempotencyKey: "ik-ship-test-1",
    cartSnapshot: [],
    status: "completed",
    expiresAt: new Date(Date.now() + 3600000),
  });

  await db.insert(schema.orders).values({
    id: "order-ship-test-1",
    orderNumber: "PET-SHIP-00001",
    userId: "customer-ship-1",
    checkoutSessionId: "cs-ship-test-1",
    status: "confirmed",
    paymentStatus: "paid",
    paymentGateway: "transfer",
    address: {},
    shippingOptionId: "propio",
    shippingCost: 3990,
    subtotal: 10000,
    discountTotal: 0,
    walletDiscount: 0,
    total: 13990,
    pointsRedeemed: 0,
    pointsEarned: 0,
  });
}

async function seedShipment(
  db: TestDb,
  opts: { status: schema.ShipmentStatus; carrier: schema.CarrierId; trackingNumber?: string | null },
) {
  const id = "shipment-test-1";
  await db.insert(schema.shipments).values({
    id,
    orderId: "order-ship-test-1",
    carrier: opts.carrier,
    status: opts.status,
    trackingNumber: opts.trackingNumber ?? null,
    metadata: {},
  });
  // initial tracking event
  await db.insert(schema.trackingEvents).values({
    id: crypto.randomUUID(),
    shipmentId: id,
    status: opts.status,
    description: "Initial",
  });
  return id;
}

describe("advanceShipmentStatus — integration (PGlite)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AO-2a: valid transition updates status and inserts tracking_events row", async () => {
    const db = await createTestDb();
    await seedAdminAndOrder(db);
    const shipmentId = await seedShipment(db, { status: "preparando", carrier: "propio" });

    const { advanceShipmentStatusWithDb } = await import(
      "@/app/actions/admin/shipments"
    );

    const result = await advanceShipmentStatusWithDb(
      db as never,
      shipmentId,
      "en_ruta",
      "admin-ship-1",
    );

    expect(result.ok).toBe(true);

    // Check shipments row updated
    const ships = await db
      .select({ status: schema.shipments.status })
      .from(schema.shipments)
      .where(eq(schema.shipments.id, shipmentId));
    expect(ships[0].status).toBe("en_ruta");

    // Check new tracking_events row inserted
    const events = await db
      .select()
      .from(schema.trackingEvents)
      .where(eq(schema.trackingEvents.shipmentId, shipmentId));
    expect(events.length).toBeGreaterThanOrEqual(2);
    const lastEvent = events.at(-1)!;
    expect(lastEvent.status).toBe("en_ruta");
  });

  it("AO-2b: terminal status (entregado) returns INVALID_TRANSITION", async () => {
    const db = await createTestDb();
    await seedAdminAndOrder(db);
    const shipmentId = await seedShipment(db, { status: "entregado", carrier: "propio" });

    const { advanceShipmentStatusWithDb } = await import(
      "@/app/actions/admin/shipments"
    );

    const result = await advanceShipmentStatusWithDb(
      db as never,
      shipmentId,
      "en_ruta",
      "admin-ship-1",
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("INVALID_TRANSITION");
    }
  });

  it("AO-2c: invalid transition returns INVALID_TRANSITION", async () => {
    const db = await createTestDb();
    await seedAdminAndOrder(db);
    const shipmentId = await seedShipment(db, { status: "preparando", carrier: "propio" });

    const { advanceShipmentStatusWithDb } = await import(
      "@/app/actions/admin/shipments"
    );

    // preparando → entregado is invalid for propio (must go through en_ruta)
    const result = await advanceShipmentStatusWithDb(
      db as never,
      shipmentId,
      "entregado",
      "admin-ship-1",
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("INVALID_TRANSITION");
    }
  });

  it("AO-2d: non-admin userId returns FORBIDDEN", async () => {
    const db = await createTestDb();
    await seedAdminAndOrder(db);
    const shipmentId = await seedShipment(db, { status: "preparando", carrier: "propio" });

    const { advanceShipmentStatusWithDb } = await import(
      "@/app/actions/admin/shipments"
    );

    const result = await advanceShipmentStatusWithDb(
      db as never,
      shipmentId,
      "en_ruta",
      "customer-ship-1",
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("FORBIDDEN");
    }
  });

  it("AO-2e: unknown shipmentId returns SHIPMENT_NOT_FOUND", async () => {
    const db = await createTestDb();
    await seedAdminAndOrder(db);

    const { advanceShipmentStatusWithDb } = await import(
      "@/app/actions/admin/shipments"
    );

    const result = await advanceShipmentStatusWithDb(
      db as never,
      "nonexistent-shipment",
      "en_ruta",
      "admin-ship-1",
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("SHIPMENT_NOT_FOUND");
    }
  });
});

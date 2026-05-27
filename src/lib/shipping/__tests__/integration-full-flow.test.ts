/**
 * Phase 9 — Full carrier flow integration tests (PGlite).
 * Covers each carrier end-to-end:
 * - Propio: preparando → en_ruta → entregado
 * - Mock Chilexpress: preparando → en_ruta → fallido
 * - Mock Starken: preparando → en_ruta → entregado
 * - Pickup: preparando → listo → entregado
 * Also verifies tracking_events accumulate correctly.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

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

let counter = 0;

async function seedForCarrier(
  db: TestDb,
  carrier: schema.CarrierId,
  testId?: string,
) {
  const id = testId ?? `int-flow-${++counter}`;
  const userId = `user-${id}`;
  const sessionId = `sess-${id}`;
  const orderId = `order-${id}`;
  const adminId = `admin-${id}`;

  await db.insert(schema.users).values([
    {
      id: userId,
      email: `user-${id}@test.cl`,
      name: "Int Flow User",
      role: "customer",
      isDemoSeed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: adminId,
      email: `admin-${id}@test.cl`,
      name: "Int Flow Admin",
      role: "admin",
      isDemoSeed: false,
      createdAt: new Date().toISOString(),
    },
  ]);

  await db.insert(schema.pointsConfig).values({ id: "singleton", earnRatePerCLP: 100 }).onConflictDoNothing();
  await db
    .insert(schema.orderSequences)
    .values({ date: new Date().toISOString().slice(0, 10).replace(/-/g, ""), lastSeq: 0 })
    .onConflictDoNothing();

  await db.insert(schema.checkoutSessions).values({
    id: sessionId,
    userId,
    idempotencyKey: `idem-${id}`,
    cartSnapshot: [],
    status: "payment_pending",
    expiresAt: new Date(Date.now() + 3600000),
    deliveryType: carrier === "pickup" ? "pickup" : carrier === "propio" ? "despacho" : "courier",
    dispatchSlot: carrier === "propio" ? "tarde" : null,
    pickupStoreId: null,
  });

  await db.insert(schema.orders).values({
    id: orderId,
    orderNumber: `PET-INT-${id}`,
    userId,
    checkoutSessionId: sessionId,
    status: "confirmed",
    paymentStatus: "paid",
    paymentGateway: "transfer_mock",
    address: {},
    shippingOptionId: carrier,
    shippingCost: carrier === "propio" ? 0 : 3990,
    subtotal: 25000,
    discountTotal: 0,
    walletDiscount: 0,
    total: 25000,
    pointsRedeemed: 0,
    pointsEarned: 0,
  });

  return { userId, sessionId, orderId, adminId };
}

async function seedShipment(
  db: TestDb,
  orderId: string,
  carrier: schema.CarrierId,
  trackingNumber?: string,
) {
  const shipmentId = `ship-${orderId}`;
  await db.insert(schema.shipments).values({
    id: shipmentId,
    orderId,
    carrier,
    status: "preparando",
    trackingNumber: trackingNumber ?? null,
    metadata: {},
  });
  await db.insert(schema.trackingEvents).values({
    id: crypto.randomUUID(),
    shipmentId,
    status: "preparando",
    description: "Pedido recibido y en preparación",
  });
  return shipmentId;
}

describe("Full carrier flow — integration (PGlite)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("propio: preparando → en_ruta → entregado accumulates 3 events", async () => {
    const db = await createTestDb();
    const { orderId, adminId } = await seedForCarrier(db, "propio", "propio-full");
    const shipmentId = await seedShipment(db, orderId, "propio");

    const { advanceShipmentStatusWithDb } = await import("@/app/actions/admin/shipments");

    await advanceShipmentStatusWithDb(db as never, shipmentId, "en_ruta", adminId);
    await advanceShipmentStatusWithDb(db as never, shipmentId, "entregado", adminId);

    const ship = await db.select({ status: schema.shipments.status }).from(schema.shipments).where(eq(schema.shipments.id, shipmentId));
    expect(ship[0].status).toBe("entregado");

    const events = await db.select().from(schema.trackingEvents).where(eq(schema.trackingEvents.shipmentId, shipmentId));
    expect(events).toHaveLength(3); // preparando + en_ruta + entregado
  });

  it("mock_chilexpress: preparando → en_ruta → fallido", async () => {
    const db = await createTestDb();
    const { orderId, adminId } = await seedForCarrier(db, "mock_chilexpress", "chx-full");
    const shipmentId = await seedShipment(db, orderId, "mock_chilexpress", "MOCK-CHX00001");

    const { advanceShipmentStatusWithDb } = await import("@/app/actions/admin/shipments");

    await advanceShipmentStatusWithDb(db as never, shipmentId, "en_ruta", adminId);
    const result = await advanceShipmentStatusWithDb(db as never, shipmentId, "fallido", adminId);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.newStatus).toBe("fallido");

    const ship = await db.select({ status: schema.shipments.status }).from(schema.shipments).where(eq(schema.shipments.id, shipmentId));
    expect(ship[0].status).toBe("fallido");
  });

  it("mock_starken: preparando → en_ruta → entregado", async () => {
    const db = await createTestDb();
    const { orderId, adminId } = await seedForCarrier(db, "mock_starken", "str-full");
    const shipmentId = await seedShipment(db, orderId, "mock_starken", "MOCK-STR00001");

    const { advanceShipmentStatusWithDb } = await import("@/app/actions/admin/shipments");

    await advanceShipmentStatusWithDb(db as never, shipmentId, "en_ruta", adminId);
    const result = await advanceShipmentStatusWithDb(db as never, shipmentId, "entregado", adminId);

    expect(result.ok).toBe(true);

    const ship = await db.select({ status: schema.shipments.status }).from(schema.shipments).where(eq(schema.shipments.id, shipmentId));
    expect(ship[0].status).toBe("entregado");

    const events = await db.select().from(schema.trackingEvents).where(eq(schema.trackingEvents.shipmentId, shipmentId));
    expect(events).toHaveLength(3); // preparando + en_ruta + entregado
  });

  it("pickup: preparando → listo → entregado, no trackingNumber", async () => {
    const db = await createTestDb();
    const { orderId, adminId } = await seedForCarrier(db, "pickup", "pickup-full");
    const shipmentId = await seedShipment(db, orderId, "pickup"); // no trackingNumber

    const { advanceShipmentStatusWithDb } = await import("@/app/actions/admin/shipments");

    const r1 = await advanceShipmentStatusWithDb(db as never, shipmentId, "listo", adminId);
    expect(r1.ok).toBe(true);

    const r2 = await advanceShipmentStatusWithDb(db as never, shipmentId, "entregado", adminId);
    expect(r2.ok).toBe(true);

    const ship = await db.select({ status: schema.shipments.status, trackingNumber: schema.shipments.trackingNumber }).from(schema.shipments).where(eq(schema.shipments.id, shipmentId));
    expect(ship[0].status).toBe("entregado");
    expect(ship[0].trackingNumber).toBeNull();
  });

  it("pickup: preparando → en_ruta is INVALID for pickup carrier", async () => {
    const db = await createTestDb();
    const { orderId, adminId } = await seedForCarrier(db, "pickup", "pickup-invalid");
    const shipmentId = await seedShipment(db, orderId, "pickup");

    const { advanceShipmentStatusWithDb } = await import("@/app/actions/admin/shipments");

    const result = await advanceShipmentStatusWithDb(db as never, shipmentId, "en_ruta", adminId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_TRANSITION");
  });

  it("propio: terminal state (fallido) cannot be advanced", async () => {
    const db = await createTestDb();
    const { orderId, adminId } = await seedForCarrier(db, "propio", "propio-terminal");
    const shipmentId = await seedShipment(db, orderId, "propio");

    // Manually set to fallido
    await db.update(schema.shipments).set({ status: "fallido" }).where(eq(schema.shipments.id, shipmentId));

    const { advanceShipmentStatusWithDb } = await import("@/app/actions/admin/shipments");

    const result = await advanceShipmentStatusWithDb(db as never, shipmentId, "entregado", adminId);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INVALID_TRANSITION");
  });
});

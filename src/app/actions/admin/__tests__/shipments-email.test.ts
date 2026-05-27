/**
 * Task 8.5 RED — advanceShipmentStatus triggers demo email on status transitions.
 * en_ruta (dispatched) → inserts shipment_dispatched email
 * entregado (delivered) → inserts shipment_delivered email
 * listo (pickup_ready) → inserts pickup_ready email
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

async function seedWorld(db: TestDb, carrier: schema.CarrierId = "mock_chilexpress") {
  await db.insert(schema.users).values([
    {
      id: "admin-email-1",
      email: "admin@email.cl",
      name: "Admin Email",
      role: "admin",
      isDemoSeed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: "customer-email-1",
      email: "customer@email.cl",
      name: "Customer Email",
      role: "customer",
      isDemoSeed: false,
      createdAt: new Date().toISOString(),
    },
  ]);

  await db.insert(schema.checkoutSessions).values({
    id: "cs-email-1",
    userId: "customer-email-1",
    idempotencyKey: "ik-email-1",
    cartSnapshot: [],
    status: "completed",
    expiresAt: new Date(Date.now() + 3600000),
  });

  await db.insert(schema.orders).values({
    id: "order-email-1",
    orderNumber: "PET-EMAIL-00001",
    userId: "customer-email-1",
    checkoutSessionId: "cs-email-1",
    status: "confirmed",
    paymentStatus: "paid",
    paymentGateway: "transfer",
    address: {},
    shippingOptionId: carrier,
    shippingCost: 3990,
    subtotal: 10000,
    discountTotal: 0,
    walletDiscount: 0,
    total: 13990,
    pointsRedeemed: 0,
    pointsEarned: 0,
  });

  const shipmentId = "shipment-email-1";
  await db.insert(schema.shipments).values({
    id: shipmentId,
    orderId: "order-email-1",
    carrier,
    status: "preparando",
    trackingNumber: carrier === "pickup" ? null : "MOCK-EMAILTEST",
    metadata: {},
  });
  await db.insert(schema.trackingEvents).values({
    id: crypto.randomUUID(),
    shipmentId,
    status: "preparando",
    description: "Initial",
  });

  return shipmentId;
}

describe("advanceShipmentStatus — email notifications (PGlite)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("8.5a: transitioning to en_ruta inserts shipment_dispatched email", async () => {
    const db = await createTestDb();
    const shipmentId = await seedWorld(db, "mock_chilexpress");

    const { advanceShipmentStatusWithDb } = await import(
      "@/app/actions/admin/shipments"
    );

    await advanceShipmentStatusWithDb(db as never, shipmentId, "en_ruta", "admin-email-1");

    const emails = await db
      .select({ type: schema.demoEmails.type })
      .from(schema.demoEmails)
      .where(eq(schema.demoEmails.type, "shipment_dispatched"));

    expect(emails.length).toBeGreaterThanOrEqual(1);
  });

  it("8.5b: transitioning to entregado inserts shipment_delivered email", async () => {
    const db = await createTestDb();
    const shipmentId = await seedWorld(db, "mock_chilexpress");

    // First advance to en_ruta
    await db
      .update(schema.shipments)
      .set({ status: "en_ruta" })
      .where(eq(schema.shipments.id, shipmentId));

    const { advanceShipmentStatusWithDb } = await import(
      "@/app/actions/admin/shipments"
    );

    await advanceShipmentStatusWithDb(db as never, shipmentId, "entregado", "admin-email-1");

    const emails = await db
      .select({ type: schema.demoEmails.type })
      .from(schema.demoEmails)
      .where(eq(schema.demoEmails.type, "shipment_delivered"));

    expect(emails.length).toBeGreaterThanOrEqual(1);
  });

  it("8.5c: transitioning pickup to listo inserts pickup_ready email", async () => {
    const db = await createTestDb();
    const shipmentId = await seedWorld(db, "pickup");

    // Set status to preparando explicitly (already is, but be explicit)
    const { advanceShipmentStatusWithDb } = await import(
      "@/app/actions/admin/shipments"
    );

    await advanceShipmentStatusWithDb(db as never, shipmentId, "listo", "admin-email-1");

    const emails = await db
      .select({ type: schema.demoEmails.type })
      .from(schema.demoEmails)
      .where(eq(schema.demoEmails.type, "pickup_ready"));

    expect(emails.length).toBeGreaterThanOrEqual(1);
  });
});

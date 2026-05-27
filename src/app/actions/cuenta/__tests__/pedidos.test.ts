/**
 * Tasks 2.1 RED — Pedidos actions tests (PGlite).
 * listUserOrdersWithDb returns only rows matching userId sorted desc (ORD-1, ORD-4).
 * getUserOrderDetailWithDb returns null for cross-user orderNumber (ORD-2 ownership).
 * Returns full detail including shipment when exists.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
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
  await db.insert(schema.users).values([
    {
      id: "user-ped-a",
      email: "userpeda@test.cl",
      name: "User Ped A",
      role: "customer",
      isDemoSeed: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: "user-ped-b",
      email: "userpеdb@test.cl",
      name: "User Ped B",
      role: "customer",
      isDemoSeed: false,
      createdAt: new Date().toISOString(),
    },
  ]);

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  // Three checkout sessions for user-ped-a
  for (let i = 1; i <= 3; i++) {
    await db.insert(schema.checkoutSessions).values({
      id: `sess-ped-a-${i}`,
      userId: "user-ped-a",
      idempotencyKey: `idem-ped-a-${i}`,
      cartSnapshot: [],
      address: {},
      shippingOptionId: "standard",
      shippingCost: 0,
      status: "completed",
      expiresAt,
    });
  }

  // One session for user-ped-b
  await db.insert(schema.checkoutSessions).values({
    id: "sess-ped-b-1",
    userId: "user-ped-b",
    idempotencyKey: "idem-ped-b-1",
    cartSnapshot: [],
    address: {},
    shippingOptionId: "standard",
    shippingCost: 0,
    status: "completed",
    expiresAt,
  });

  // Three orders for user-ped-a (different createdAt)
  const t0 = new Date(Date.now() - 3 * 60 * 60 * 1000); // oldest
  const t1 = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const t2 = new Date(Date.now() - 1 * 60 * 60 * 1000); // newest

  await db.insert(schema.orders).values([
    {
      id: "order-ped-a-1",
      orderNumber: "PET-PEDTEST-001",
      userId: "user-ped-a",
      checkoutSessionId: "sess-ped-a-1",
      status: "confirmed",
      paymentStatus: "paid",
      paymentGateway: "webpay_mock",
      address: {},
      shippingOptionId: "standard",
      shippingCost: 0,
      subtotal: 5000,
      discountTotal: 0,
      walletDiscount: 0,
      total: 5000,
      pointsRedeemed: 0,
      pointsEarned: 50,
      createdAt: t0,
      updatedAt: t0,
    },
    {
      id: "order-ped-a-2",
      orderNumber: "PET-PEDTEST-002",
      userId: "user-ped-a",
      checkoutSessionId: "sess-ped-a-2",
      status: "pending",
      paymentStatus: "unpaid",
      paymentGateway: "webpay_mock",
      address: {},
      shippingOptionId: "standard",
      shippingCost: 0,
      subtotal: 3000,
      discountTotal: 0,
      walletDiscount: 0,
      total: 3000,
      pointsRedeemed: 0,
      pointsEarned: 0,
      createdAt: t1,
      updatedAt: t1,
    },
    {
      id: "order-ped-a-3",
      orderNumber: "PET-PEDTEST-003",
      userId: "user-ped-a",
      checkoutSessionId: "sess-ped-a-3",
      status: "confirmed",
      paymentStatus: "paid",
      paymentGateway: "webpay_mock",
      address: {},
      shippingOptionId: "standard",
      shippingCost: 0,
      subtotal: 7000,
      discountTotal: 0,
      walletDiscount: 0,
      total: 7000,
      pointsRedeemed: 0,
      pointsEarned: 70,
      createdAt: t2,
      updatedAt: t2,
    },
  ]);

  // One order for user-ped-b
  await db.insert(schema.orders).values({
    id: "order-ped-b-1",
    orderNumber: "PET-PEDTEST-B01",
    userId: "user-ped-b",
    checkoutSessionId: "sess-ped-b-1",
    status: "confirmed",
    paymentStatus: "paid",
    paymentGateway: "webpay_mock",
    address: {},
    shippingOptionId: "standard",
    shippingCost: 0,
    subtotal: 2000,
    discountTotal: 0,
    walletDiscount: 0,
    total: 2000,
    pointsRedeemed: 0,
    pointsEarned: 20,
  });

  // Order items for order-ped-a-1
  await db.insert(schema.orderItems).values([
    {
      id: "oi-ped-a-1-1",
      orderId: "order-ped-a-1",
      productId: "prod-ped-1",
      variantId: "var-ped-1",
      sku: "SKU-PED-001",
      name: "Comida Premium",
      quantity: 2,
      unitPrice: 2500,
      lineTotal: 5000,
    },
  ]);

  // Shipment for order-ped-a-1
  await db.insert(schema.shipments).values({
    id: "shipment-ped-a-1",
    orderId: "order-ped-a-1",
    carrier: "mock_chilexpress",
    status: "en_ruta",
    trackingNumber: "TRACK-PED-001",
    metadata: {},
  });
}

describe("pedidos actions — integration (PGlite)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // listUserOrdersWithDb
  // ---------------------------------------------------------------------------
  it("listUserOrdersWithDb returns only orders for given userId (ORD-4)", async () => {
    const db = await createTestDb();
    await seedBase(db);

    const { listUserOrdersWithDb } = await import("@/app/actions/cuenta/pedidos");

    const result = await listUserOrdersWithDb(db as never, "user-ped-a");
    expect(result).toHaveLength(3);
    result.forEach((order) => {
      expect(order.userId).toBe("user-ped-a");
    });
  });

  it("listUserOrdersWithDb returns orders sorted by createdAt DESC (ORD-1)", async () => {
    const db = await createTestDb();
    await seedBase(db);

    const { listUserOrdersWithDb } = await import("@/app/actions/cuenta/pedidos");

    const result = await listUserOrdersWithDb(db as never, "user-ped-a");
    expect(result[0].orderNumber).toBe("PET-PEDTEST-003"); // newest
    expect(result[2].orderNumber).toBe("PET-PEDTEST-001"); // oldest
  });

  it("listUserOrdersWithDb returns empty array when user has no orders", async () => {
    const db = await createTestDb();
    await seedBase(db);

    const { listUserOrdersWithDb } = await import("@/app/actions/cuenta/pedidos");

    // Fresh user with no orders
    await db.insert(schema.users).values({
      id: "user-no-orders",
      email: "noorders@test.cl",
      name: "No Orders",
      role: "customer",
      isDemoSeed: false,
      createdAt: new Date().toISOString(),
    });

    const result = await listUserOrdersWithDb(db as never, "user-no-orders");
    expect(result).toHaveLength(0);
  });

  it("listUserOrdersWithDb does NOT return orders from other users (ORD-4)", async () => {
    const db = await createTestDb();
    await seedBase(db);

    const { listUserOrdersWithDb } = await import("@/app/actions/cuenta/pedidos");

    // user-ped-b only has 1 order
    const result = await listUserOrdersWithDb(db as never, "user-ped-b");
    expect(result).toHaveLength(1);
    expect(result[0].orderNumber).toBe("PET-PEDTEST-B01");
  });

  // ---------------------------------------------------------------------------
  // getUserOrderDetailWithDb
  // ---------------------------------------------------------------------------
  it("getUserOrderDetailWithDb returns null for cross-user orderNumber (ORD-2 ownership)", async () => {
    const db = await createTestDb();
    await seedBase(db);

    const { getUserOrderDetailWithDb } = await import("@/app/actions/cuenta/pedidos");

    // user-ped-b tries to access user-ped-a's order
    const result = await getUserOrderDetailWithDb(db as never, "user-ped-b", "PET-PEDTEST-001");
    expect(result).toBeNull();
  });

  it("getUserOrderDetailWithDb returns null for non-existent order", async () => {
    const db = await createTestDb();
    await seedBase(db);

    const { getUserOrderDetailWithDb } = await import("@/app/actions/cuenta/pedidos");

    const result = await getUserOrderDetailWithDb(db as never, "user-ped-a", "NON-EXISTENT");
    expect(result).toBeNull();
  });

  it("getUserOrderDetailWithDb returns full detail with items and shipment (ORD-2)", async () => {
    const db = await createTestDb();
    await seedBase(db);

    const { getUserOrderDetailWithDb } = await import("@/app/actions/cuenta/pedidos");

    const result = await getUserOrderDetailWithDb(db as never, "user-ped-a", "PET-PEDTEST-001");

    expect(result).not.toBeNull();
    expect(result?.order.orderNumber).toBe("PET-PEDTEST-001");
    expect(result?.items).toHaveLength(1);
    expect(result?.items[0].name).toBe("Comida Premium");
    expect(result?.shipment).not.toBeNull();
    expect(result?.shipment?.trackingNumber).toBe("TRACK-PED-001");
    expect(result?.shipment?.carrier).toBe("mock_chilexpress");
  });

  it("getUserOrderDetailWithDb returns null shipment when no shipment exists (ORD-2)", async () => {
    const db = await createTestDb();
    await seedBase(db);

    const { getUserOrderDetailWithDb } = await import("@/app/actions/cuenta/pedidos");

    // order-ped-a-2 has no shipment
    const result = await getUserOrderDetailWithDb(db as never, "user-ped-a", "PET-PEDTEST-002");
    expect(result).not.toBeNull();
    expect(result?.shipment).toBeNull();
  });

  it("getUserOrderDetailWithDb returns own order for correct user (ORD-2)", async () => {
    const db = await createTestDb();
    await seedBase(db);

    const { getUserOrderDetailWithDb } = await import("@/app/actions/cuenta/pedidos");

    const result = await getUserOrderDetailWithDb(db as never, "user-ped-a", "PET-PEDTEST-001");
    expect(result).not.toBeNull();
    expect(result?.order.userId).toBe("user-ped-a");
  });
});

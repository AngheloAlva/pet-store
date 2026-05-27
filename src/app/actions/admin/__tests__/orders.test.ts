/**
 * Task 4.1 RED — Admin orders actions test (PGlite).
 * listOrders() returns all orders, newest first, no dataUrl field.
 * getOrderDetail(id) for pending order includes dataUrl.
 * confirmTransfer(orderId) flips paymentStatus to "paid" and fires DTE/points/email.
 * confirmTransfer on already-paid → ALREADY_PAID.
 * Non-admin → FORBIDDEN.
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
import { getCurrentUser } from "@/lib/session";

async function createTestDb() {
  const pglite = new PGlite();
  const db = drizzle(pglite, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db;
}

type TestDb = ReturnType<typeof drizzle<typeof schema>>;

async function seedBase(db: TestDb) {
  // Admin user
  await db.insert(schema.users).values({
    id: "admin-1",
    email: "admin@test.cl",
    name: "Admin User",
    role: "admin",
    isDemoSeed: false,
    createdAt: new Date().toISOString(),
  });

  // Regular customer
  await db.insert(schema.users).values({
    id: "customer-1",
    email: "customer@test.cl",
    name: "Customer User",
    role: "customer",
    isDemoSeed: false,
    createdAt: new Date().toISOString(),
  });

  await db.insert(schema.brands).values({ id: "brand-ao1", slug: "brand-ao1", name: "Brand AO1" });

  await db.insert(schema.products).values({
    id: "prod-ao1",
    slug: "prod-ao1",
    name: "Bird Seed",
    brandId: "brand-ao1",
    description: "Bird seed",
    species: ["exotic"],
  });

  await db.insert(schema.productVariants).values({
    id: "var-ao1",
    productId: "prod-ao1",
    sku: "BS-001",
    name: "1kg",
    quantityValue: "1",
    quantityUnit: "kg",
    priceAmount: 2000,
    priceCurrency: "CLP",
  });

  await db.insert(schema.stores).values({
    id: "store-ao1",
    slug: "store-ao1",
    name: "Store AO1",
    address: "Admin St",
    commune: "Las Condes",
    phone: "+56900000004",
    lat: "0",
    lng: "0",
    schedule: {},
    services: [],
  });

  await db.insert(schema.stockLevels).values({
    variantId: "var-ao1",
    storeId: "store-ao1",
    status: "in_stock",
  });

  await db.insert(schema.pointsConfig).values({
    id: "singleton",
    earnRatePerCLP: 100,
  });

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  // Session for paid order
  await db.insert(schema.checkoutSessions).values({
    id: "sess-ao-paid",
    userId: "customer-1",
    idempotencyKey: "idem-ao-paid",
    cartSnapshot: [
      { variantId: "var-ao1", productId: "prod-ao1", sku: "BS-001", name: "Bird Seed", quantity: 1, unitPrice: 2000, lineTotal: 2000 },
    ],
    address: {},
    shippingOptionId: "standard",
    shippingCost: 0,
    status: "completed",
    expiresAt,
  });

  // Session for pending_verification order
  await db.insert(schema.checkoutSessions).values({
    id: "sess-ao-pending",
    userId: "customer-1",
    idempotencyKey: "idem-ao-pending",
    cartSnapshot: [
      { variantId: "var-ao1", productId: "prod-ao1", sku: "BS-001", name: "Bird Seed", quantity: 2, unitPrice: 2000, lineTotal: 4000 },
    ],
    address: {},
    shippingOptionId: "standard",
    shippingCost: 0,
    status: "completed",
    expiresAt,
  });

  // Paid order (older)
  const paidAt = new Date(Date.now() - 10 * 60 * 1000);
  await db.insert(schema.orders).values({
    id: "order-ao-paid",
    orderNumber: "PET-20260101-00001",
    userId: "customer-1",
    checkoutSessionId: "sess-ao-paid",
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
    createdAt: paidAt,
    updatedAt: paidAt,
  });

  // Pending_verification order (newer)
  await db.insert(schema.orders).values({
    id: "order-ao-pending",
    orderNumber: "PET-20260101-00002",
    userId: "customer-1",
    checkoutSessionId: "sess-ao-pending",
    status: "confirmed",
    paymentStatus: "pending_verification",
    paymentGateway: "transfer_mock",
    address: {},
    shippingOptionId: "standard",
    shippingCost: 0,
    subtotal: 4000,
    discountTotal: 0,
    walletDiscount: 0,
    total: 4000,
    pointsRedeemed: 0,
    pointsEarned: 0,
  });

  // Transfer receipt for the pending order
  await db.insert(schema.transferReceipts).values({
    id: "receipt-ao-1",
    orderId: "order-ao-pending",
    dataUrl: "data:image/png;base64,abc123",
    bankReference: "REF-AO-001",
  });

  // Order items for both orders
  await db.insert(schema.orderItems).values([
    {
      id: "oi-ao-paid-1",
      orderId: "order-ao-paid",
      productId: "prod-ao1",
      variantId: "var-ao1",
      sku: "BS-001",
      name: "Bird Seed",
      quantity: 1,
      unitPrice: 2000,
      lineTotal: 2000,
    },
    {
      id: "oi-ao-pending-1",
      orderId: "order-ao-pending",
      productId: "prod-ao1",
      variantId: "var-ao1",
      sku: "BS-001",
      name: "Bird Seed",
      quantity: 2,
      unitPrice: 2000,
      lineTotal: 4000,
    },
  ]);
}

describe("admin orders actions — integration (real PGlite)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("listOrders() returns both orders, newest first, no dataUrl", async () => {
    const db = await createTestDb();
    await seedBase(db);

    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "admin-1",
      email: "admin@test.cl",
      name: "Admin User",
      role: "admin",
    } as never);

    const { listOrdersWithDb } = await import("@/app/actions/admin/orders");
    const result = await listOrdersWithDb(db as never);

    expect(result).toHaveLength(2);
    // Newest first — pending order was inserted last (no explicit createdAt so it's newer)
    expect(result[0].orderNumber).toBe("PET-20260101-00002");
    expect(result[1].orderNumber).toBe("PET-20260101-00001");

    // No dataUrl in list results
    result.forEach((order) => {
      expect("dataUrl" in order).toBe(false);
    });
  });

  it("getOrderDetail(id) for pending order includes dataUrl", async () => {
    const db = await createTestDb();
    await seedBase(db);

    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "admin-1",
      email: "admin@test.cl",
      name: "Admin User",
      role: "admin",
    } as never);

    const { getOrderDetailWithDb } = await import("@/app/actions/admin/orders");
    const result = await getOrderDetailWithDb(db as never, "order-ao-pending");

    expect(result).not.toBeNull();
    expect(result?.order.paymentStatus).toBe("pending_verification");
    expect(result?.receipt?.dataUrl).toBe("data:image/png;base64,abc123");
  });

  it("confirmTransfer flips paymentStatus to paid and fires DTE + points + email", async () => {
    const db = await createTestDb();
    await seedBase(db);

    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "admin-1",
      email: "admin@test.cl",
      name: "Admin User",
      role: "admin",
    } as never);

    const { confirmTransferWithDb } = await import("@/app/actions/admin/orders");
    const result = await confirmTransferWithDb(db as never, "order-ao-pending", {
      adminId: "admin-1",
      adminEmail: "admin@test.cl",
      adminName: "Admin User",
    });

    expect(result.ok).toBe(true);

    // paymentStatus flipped to paid
    const orders = await db.select().from(schema.orders).where(
      // using eq from drizzle
      (await import("drizzle-orm")).eq(schema.orders.id, "order-ao-pending"),
    );
    expect(orders[0].paymentStatus).toBe("paid");

    // DTE created
    const dteDocs = await db.select().from(schema.dteDocuments);
    expect(dteDocs).toHaveLength(1);

    // Points created
    const pts = await db.select().from(schema.pointsTransactions);
    expect(pts).toHaveLength(1);

    // Email created
    const emails = await db.select().from(schema.demoEmails);
    expect(emails.some((e) => e.type === "order_confirmation")).toBe(true);
  });

  it("confirmTransfer on already-paid order returns ALREADY_PAID", async () => {
    const db = await createTestDb();
    await seedBase(db);

    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "admin-1",
      email: "admin@test.cl",
      name: "Admin User",
      role: "admin",
    } as never);

    const { confirmTransferWithDb } = await import("@/app/actions/admin/orders");
    const result = await confirmTransferWithDb(db as never, "order-ao-paid", {
      adminId: "admin-1",
      adminEmail: "admin@test.cl",
      adminName: "Admin User",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("ALREADY_PAID");
    }
  });

  it("non-admin cannot call confirmTransfer — returns FORBIDDEN", async () => {
    const db = await createTestDb();
    await seedBase(db);

    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "customer-1",
      email: "customer@test.cl",
      name: "Customer User",
      role: "customer",
    } as never);

    const { confirmTransferWithDb } = await import("@/app/actions/admin/orders");
    const result = await confirmTransferWithDb(db as never, "order-ao-pending", {
      adminId: "customer-1",
      adminEmail: "customer@test.cl",
      adminName: "Customer User",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("FORBIDDEN");
    }
  });
});

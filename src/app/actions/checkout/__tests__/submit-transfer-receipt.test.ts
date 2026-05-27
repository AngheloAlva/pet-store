/**
 * Task 3.1 RED — submitTransferReceipt integration test (real PGlite).
 * Valid PNG dataUrl + valid session → paymentStatus="pending_verification" order +
 *   transfer_receipts row created, NO dte/points/email rows.
 * dataUrl > 2_750_000 chars → validation error, no rows.
 * data:application/pdf;base64,... → validation error.
 * Non-pending session → SESSION_NOT_PENDING.
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

async function createTestDb() {
  const pglite = new PGlite();
  const db = drizzle(pglite, { schema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db;
}

type TestDb = ReturnType<typeof drizzle<typeof schema>>;

// A minimal valid PNG base64 (1x1 transparent PNG)
const VALID_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const VALID_BANK_REFERENCE = "REF-TEST-001";

async function seedBase(db: TestDb, sessionStatus: string = "payment_pending") {
  await db.insert(schema.users).values({
    id: "user-transfer-1",
    email: "transfer@test.cl",
    name: "Transfer User",
    role: "customer",
    isDemoSeed: false,
    createdAt: new Date().toISOString(),
  });

  await db.insert(schema.brands).values({ id: "brand-t1", slug: "brand-t1", name: "Brand T1" });

  await db.insert(schema.products).values({
    id: "prod-t1",
    slug: "prod-t1",
    name: "Fish Food",
    brandId: "brand-t1",
    description: "Fish food",
    species: ["exotic"],
  });

  await db.insert(schema.productVariants).values({
    id: "var-t1",
    productId: "prod-t1",
    sku: "FF-001",
    name: "100g",
    quantityValue: "100",
    quantityUnit: "g",
    priceAmount: 1500,
    priceCurrency: "CLP",
  });

  await db.insert(schema.stores).values({
    id: "store-t1",
    slug: "store-t1",
    name: "Store T1",
    address: "Test Blvd",
    commune: "Ñuñoa",
    phone: "+56900000003",
    lat: "0",
    lng: "0",
    schedule: {},
    services: [],
  });

  await db.insert(schema.stockLevels).values({
    variantId: "var-t1",
    storeId: "store-t1",
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
    id: "sess-transfer-1",
    userId: "user-transfer-1",
    idempotencyKey: "idem-transfer-1",
    cartSnapshot: [
      {
        variantId: "var-t1",
        productId: "prod-t1",
        sku: "FF-001",
        name: "Fish Food",
        quantity: 1,
        unitPrice: 1500,
        lineTotal: 1500,
      },
    ],
    address: {
      recipientName: "Transfer User",
      street: "Test Blvd",
      number: "5",
      commune: "Ñuñoa",
      region: "RM",
      phone: "+56912345678",
    },
    shippingOptionId: "standard",
    shippingCost: 2990,
    status: sessionStatus,
    paymentGateway: "transfer_mock",
    expiresAt,
  });
}

describe("submitTransferReceipt — integration (real PGlite)", () => {
  it("happy path: creates pending_verification order + transfer_receipts row, no DTE/points/email", async () => {
    const db = await createTestDb();
    await seedBase(db);

    const { submitTransferReceiptWithDb } = await import(
      "@/app/actions/checkout/submit-transfer-receipt"
    );

    const result = await submitTransferReceiptWithDb(db as never, {
      sessionId: "sess-transfer-1",
      userId: "user-transfer-1",
      userEmail: "transfer@test.cl",
      userName: "Transfer User",
      dataUrl: VALID_PNG,
      bankReference: VALID_BANK_REFERENCE,
    });

    expect(result).toMatchObject({ ok: true });

    // Order created with pending_verification
    const orders = await db.select().from(schema.orders);
    expect(orders).toHaveLength(1);
    expect(orders[0].paymentStatus).toBe("pending_verification");

    // transfer_receipts row created
    const receipts = await db.select().from(schema.transferReceipts);
    expect(receipts).toHaveLength(1);
    expect(receipts[0].orderId).toBe(orders[0].id);
    expect(receipts[0].bankReference).toBe(VALID_BANK_REFERENCE);

    // NO DTE, points, or email rows
    const dteDocs = await db.select().from(schema.dteDocuments);
    expect(dteDocs).toHaveLength(0);

    const pts = await db.select().from(schema.pointsTransactions);
    expect(pts).toHaveLength(0);

    const emails = await db.select().from(schema.demoEmails);
    expect(emails).toHaveLength(0);
  });

  it("dataUrl > 2_750_000 chars → validation error, no order created", async () => {
    const db = await createTestDb();
    await seedBase(db);

    const { submitTransferReceiptWithDb } = await import(
      "@/app/actions/checkout/submit-transfer-receipt"
    );

    const oversizedDataUrl = "data:image/png;base64," + "A".repeat(2_750_001);
    const result = await submitTransferReceiptWithDb(db as never, {
      sessionId: "sess-transfer-1",
      userId: "user-transfer-1",
      userEmail: "transfer@test.cl",
      userName: "Transfer User",
      dataUrl: oversizedDataUrl,
      bankReference: VALID_BANK_REFERENCE,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("VALIDATION_ERROR");
    }

    const orders = await db.select().from(schema.orders);
    expect(orders).toHaveLength(0);
  });

  it("invalid mime type → validation error, no order created", async () => {
    const db = await createTestDb();
    await seedBase(db);

    const { submitTransferReceiptWithDb } = await import(
      "@/app/actions/checkout/submit-transfer-receipt"
    );

    const result = await submitTransferReceiptWithDb(db as never, {
      sessionId: "sess-transfer-1",
      userId: "user-transfer-1",
      userEmail: "transfer@test.cl",
      userName: "Transfer User",
      dataUrl: "data:application/pdf;base64,JVBERi0xLjQK",
      bankReference: VALID_BANK_REFERENCE,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("VALIDATION_ERROR");
    }

    const orders = await db.select().from(schema.orders);
    expect(orders).toHaveLength(0);
  });

  it("non-pending session → SESSION_NOT_PENDING", async () => {
    const db = await createTestDb();
    await seedBase(db, "active"); // session NOT in payment_pending state

    const { submitTransferReceiptWithDb } = await import(
      "@/app/actions/checkout/submit-transfer-receipt"
    );

    const result = await submitTransferReceiptWithDb(db as never, {
      sessionId: "sess-transfer-1",
      userId: "user-transfer-1",
      userEmail: "transfer@test.cl",
      userName: "Transfer User",
      dataUrl: VALID_PNG,
      bankReference: VALID_BANK_REFERENCE,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("SESSION_NOT_PENDING");
    }
  });
});

/**
 * T-01/T-02 [SCHEMA] Migration 0014 — subscriptions
 * Verifies the new columns and tables created by migration 0014.
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

const baseUser = {
  id: "u-mig-1",
  email: "mig1@test.cl",
  name: "Mig User",
  role: "customer" as const,
  isDemoSeed: false,
  createdAt: new Date().toISOString(),
};

describe("migration 0014 — subscriptions schema (T-01, T-02, SC-S1)", () => {
  it("SC-S1: subscriptions and subscription_cycles tables exist after migration", async () => {
    const db = await createTestDb();
    // Insert a user for FK
    await db.insert(schema.users).values(baseUser);

    // Insert a brand + product + variant for FK chains
    await db.insert(schema.brands).values({ id: "brand-1", slug: "brand-1", name: "Brand 1" });
    await db.insert(schema.products).values({
      id: "prod-1",
      slug: "prod-1",
      name: "Product 1",
      brandId: "brand-1",
      description: "Test",
    });
    await db.insert(schema.productVariants).values({
      id: "var-1",
      productId: "prod-1",
      sku: "SKU-1",
      name: "Variant 1",
      quantityValue: "1.000",
      quantityUnit: "kg",
      priceAmount: 10000,
      priceCurrency: "CLP",
    });

    // Insert a subscription
    const now = new Date();
    const nextCharge = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await db.insert(schema.subscriptions).values({
      id: "sub-1",
      userId: "u-mig-1",
      productId: "prod-1",
      variantId: "var-1",
      frequencyDays: 30,
      discountPercent: 10,
      status: "active",
      nextChargeAt: nextCharge,
    });

    const rows = await db
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.id, "sub-1"));
    expect(rows).toHaveLength(1);
    expect(rows[0].frequencyDays).toBe(30);
    expect(rows[0].discountPercent).toBe(10);
    expect(rows[0].status).toBe("active");
    expect(rows[0].failedAttempts).toBe(0);
  });

  it("subscription_cycles table exists and can be written to", async () => {
    const db = await createTestDb();
    await db.insert(schema.users).values(baseUser);
    await db.insert(schema.brands).values({ id: "brand-2", slug: "brand-2", name: "Brand 2" });
    await db.insert(schema.products).values({
      id: "prod-2",
      slug: "prod-2",
      name: "Product 2",
      brandId: "brand-2",
      description: "Test",
    });
    await db.insert(schema.productVariants).values({
      id: "var-2",
      productId: "prod-2",
      sku: "SKU-2",
      name: "Variant 2",
      quantityValue: "1.000",
      quantityUnit: "kg",
      priceAmount: 20000,
      priceCurrency: "CLP",
    });

    const now = new Date();
    await db.insert(schema.subscriptions).values({
      id: "sub-2",
      userId: "u-mig-1",
      productId: "prod-2",
      variantId: "var-2",
      frequencyDays: 30,
      discountPercent: 0,
      status: "active",
      nextChargeAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    });

    await db.insert(schema.subscriptionCycles).values({
      id: "cyc-1",
      subscriptionId: "sub-2",
      status: "charged",
      chargedAt: now,
      attemptNumber: 1,
    });

    const cycles = await db
      .select()
      .from(schema.subscriptionCycles)
      .where(eq(schema.subscriptionCycles.subscriptionId, "sub-2"));
    expect(cycles).toHaveLength(1);
    expect(cycles[0].status).toBe("charged");
    expect(cycles[0].attemptNumber).toBe(1);
    expect(cycles[0].orderId).toBeNull();
    expect(cycles[0].reminderSentAt).toBeNull();
  });

  it("products table has subscription_enabled, subscription_frequencies, subscription_discount_percent columns", async () => {
    const db = await createTestDb();
    await db.insert(schema.brands).values({ id: "brand-3", slug: "brand-3", name: "Brand 3" });
    await db.insert(schema.products).values({
      id: "prod-3",
      slug: "prod-3",
      name: "Product 3",
      brandId: "brand-3",
      description: "Test",
      subscriptionEnabled: true,
      subscriptionFrequencies: [30, 60],
      subscriptionDiscountPercent: 10,
    });

    const rows = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, "prod-3"));
    expect(rows[0].subscriptionEnabled).toBe(true);
    expect(rows[0].subscriptionFrequencies).toEqual([30, 60]);
    expect(rows[0].subscriptionDiscountPercent).toBe(10);
  });

  it("SUBSCRIPTION_STATUS and CYCLE_STATUS const arrays are exported", () => {
    expect(schema.SUBSCRIPTION_STATUS).toEqual(["active", "paused", "cancelled"]);
    expect(schema.CYCLE_STATUS).toEqual(["charged", "failed", "reminder_sent"]);
  });

  it("DemoEmailType includes subscription_reminder and subscription_payment_failed (SC-S3)", () => {
    expect(schema.DEMO_EMAIL_TYPE).toContain("subscription_reminder");
    expect(schema.DEMO_EMAIL_TYPE).toContain("subscription_payment_failed");
  });
});

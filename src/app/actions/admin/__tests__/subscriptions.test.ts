/**
 * T-15 [ACTION] admin/subscriptions.ts — updateSubscriptionConfigWithDb
 * T-24 [NOTIF] sendSubscriptionRemindersWithDb
 * T-34 [XC] Admin role guard
 * CF-S1, CF-S2, CF-S3, CF-S4, SN-S4, SN-S5, SN-S6
 */
import { describe, it, expect, vi } from "vitest";

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
import { eq } from "drizzle-orm";
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
    { id: "admin-1", email: "admin@test.cl", name: "Admin", role: "admin", isDemoSeed: false, createdAt: new Date().toISOString() },
    { id: "customer-1", email: "c@test.cl", name: "Customer", role: "customer", isDemoSeed: false, createdAt: new Date().toISOString() },
  ]);
  await db.insert(schema.brands).values({ id: "brand-1", slug: "brand-1", name: "Brand 1" });
  await db.insert(schema.products).values({
    id: "prod-1",
    slug: "prod-1",
    name: "Product 1",
    brandId: "brand-1",
    description: "Test product",
  });
}

describe("updateSubscriptionConfigWithDb (T-15)", () => {
  it("CF-S1: admin enables subscription on a product with valid config", async () => {
    const db = await createTestDb();
    await seedBase(db);

    const { updateSubscriptionConfigWithDb } = await import(
      "@/app/actions/admin/subscriptions"
    );

    const result = await updateSubscriptionConfigWithDb(db as never, "admin-1", {
      productId: "prod-1",
      subscriptionEnabled: true,
      subscriptionFrequencies: [30, 60],
      subscriptionDiscountPercent: 10,
    });

    expect(result.ok).toBe(true);

    const rows = await db.select().from(schema.products).where(eq(schema.products.id, "prod-1"));
    expect(rows[0].subscriptionEnabled).toBe(true);
    expect(rows[0].subscriptionFrequencies).toEqual([30, 60]);
    expect(rows[0].subscriptionDiscountPercent).toBe(10);
  });

  it("CF-S2: disabling subscription zeroes the config", async () => {
    const db = await createTestDb();
    await seedBase(db);

    // First enable it
    await db.update(schema.products)
      .set({ subscriptionEnabled: true, subscriptionFrequencies: [30], subscriptionDiscountPercent: 5 })
      .where(eq(schema.products.id, "prod-1"));

    const { updateSubscriptionConfigWithDb } = await import(
      "@/app/actions/admin/subscriptions"
    );

    const result = await updateSubscriptionConfigWithDb(db as never, "admin-1", {
      productId: "prod-1",
      subscriptionEnabled: false,
      subscriptionFrequencies: [],
      subscriptionDiscountPercent: 0,
    });

    expect(result.ok).toBe(true);

    const rows = await db.select().from(schema.products).where(eq(schema.products.id, "prod-1"));
    expect(rows[0].subscriptionEnabled).toBe(false);
    expect(rows[0].subscriptionFrequencies).toEqual([]);
    expect(rows[0].subscriptionDiscountPercent).toBe(0);
  });

  it("CF-S3: invalid frequency (e.g. 7) is rejected", async () => {
    const db = await createTestDb();
    await seedBase(db);

    const { updateSubscriptionConfigWithDb } = await import(
      "@/app/actions/admin/subscriptions"
    );

    const result = await updateSubscriptionConfigWithDb(db as never, "admin-1", {
      productId: "prod-1",
      subscriptionEnabled: true,
      subscriptionFrequencies: [7],
      subscriptionDiscountPercent: 10,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toMatch(/VALIDATION/);
    // Verify DB row unchanged
    const rows = await db.select().from(schema.products).where(eq(schema.products.id, "prod-1"));
    expect(rows[0].subscriptionEnabled).toBe(false);
  });

  it("CF-S4: invalid discount (e.g. 15) is rejected", async () => {
    const db = await createTestDb();
    await seedBase(db);

    const { updateSubscriptionConfigWithDb } = await import(
      "@/app/actions/admin/subscriptions"
    );

    const result = await updateSubscriptionConfigWithDb(db as never, "admin-1", {
      productId: "prod-1",
      subscriptionEnabled: true,
      subscriptionFrequencies: [30],
      subscriptionDiscountPercent: 15,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toMatch(/VALIDATION/);
  });

  it("T-34: non-admin user gets FORBIDDEN", async () => {
    const db = await createTestDb();
    await seedBase(db);

    const { updateSubscriptionConfigWithDb } = await import(
      "@/app/actions/admin/subscriptions"
    );

    const result = await updateSubscriptionConfigWithDb(db as never, "customer-1", {
      productId: "prod-1",
      subscriptionEnabled: true,
      subscriptionFrequencies: [30],
      subscriptionDiscountPercent: 10,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("FORBIDDEN");
  });
});

// ---------------------------------------------------------------------------
// T-24 sendSubscriptionRemindersWithDb
// SN-S4, SN-S5, SN-S6
// ---------------------------------------------------------------------------

async function seedReminderBase(db: TestDb) {
  await db.insert(schema.users).values([
    { id: "r-admin-1", email: "radmin@test.cl", name: "R Admin", role: "admin", isDemoSeed: false, createdAt: new Date().toISOString() },
    { id: "r-user-1", email: "ruser@test.cl", name: "R User", role: "customer", isDemoSeed: false, createdAt: new Date().toISOString() },
  ]);
  await db.insert(schema.appSettings).values({ id: "singleton", subscriptionReminderDays: 3 }).onConflictDoNothing();
  await db.insert(schema.brands).values({ id: "r-brand-1", slug: "r-brand-1", name: "R Brand 1" });
  await db.insert(schema.products).values({
    id: "r-prod-1",
    slug: "r-prod-1",
    name: "Reminder Product",
    brandId: "r-brand-1",
    description: "Test",
    subscriptionEnabled: true,
    subscriptionFrequencies: [30],
    subscriptionDiscountPercent: 10,
  });
  await db.insert(schema.productVariants).values({
    id: "r-var-1",
    productId: "r-prod-1",
    sku: "R-SKU-1",
    name: "R Variant",
    quantityValue: "1.000",
    quantityUnit: "kg",
    priceAmount: 10000,
    priceCurrency: "CLP",
  });
}

describe("sendSubscriptionRemindersWithDb (T-24)", () => {
  it("SN-S4: sends reminder when subscription is within reminder window and no prior reminder", async () => {
    const db = await createTestDb();
    await seedReminderBase(db);

    const now = new Date("2025-01-10T12:00:00Z");
    // nextChargeAt is 2 days away → within 3-day window
    const nextCharge = new Date("2025-01-12T12:00:00Z");

    await db.insert(schema.subscriptions).values({
      id: "sub-remind-1",
      userId: "r-user-1",
      productId: "r-prod-1",
      variantId: "r-var-1",
      frequencyDays: 30,
      discountPercent: 10,
      status: "active",
      nextChargeAt: nextCharge,
      createdAt: now,
      updatedAt: now,
    });

    const { sendSubscriptionRemindersWithDb } = await import(
      "@/app/actions/admin/subscriptions"
    );

    const result = await sendSubscriptionRemindersWithDb(db as never, now, db as never);
    expect(result.sent).toBe(1);

    // Verify a cycle row was written with reminderSentAt
    const cycles = await db.select().from(schema.subscriptionCycles).where(
      eq(schema.subscriptionCycles.subscriptionId, "sub-remind-1")
    );
    expect(cycles.length).toBe(1);
    expect(cycles[0].reminderSentAt).not.toBeNull();
    expect(cycles[0].status).toBe("reminder_sent");
  });

  it("SN-S5: does NOT send reminder when subscription is outside the reminder window", async () => {
    const db = await createTestDb();
    await seedReminderBase(db);

    const now = new Date("2025-01-01T12:00:00Z");
    // nextChargeAt is 10 days away → outside 3-day window
    const nextCharge = new Date("2025-01-11T12:00:00Z");

    await db.insert(schema.subscriptions).values({
      id: "sub-outside-1",
      userId: "r-user-1",
      productId: "r-prod-1",
      variantId: "r-var-1",
      frequencyDays: 30,
      discountPercent: 10,
      status: "active",
      nextChargeAt: nextCharge,
      createdAt: now,
      updatedAt: now,
    });

    const { sendSubscriptionRemindersWithDb } = await import(
      "@/app/actions/admin/subscriptions"
    );

    const result = await sendSubscriptionRemindersWithDb(db as never, now, db as never);
    expect(result.sent).toBe(0);
  });

  it("SN-S6: does NOT send reminder for paused subscription", async () => {
    const db = await createTestDb();
    await seedReminderBase(db);

    const now = new Date("2025-01-10T12:00:00Z");
    const nextCharge = new Date("2025-01-12T12:00:00Z");

    await db.insert(schema.subscriptions).values({
      id: "sub-paused-1",
      userId: "r-user-1",
      productId: "r-prod-1",
      variantId: "r-var-1",
      frequencyDays: 30,
      discountPercent: 10,
      status: "paused",
      nextChargeAt: nextCharge,
      createdAt: now,
      updatedAt: now,
    });

    const { sendSubscriptionRemindersWithDb } = await import(
      "@/app/actions/admin/subscriptions"
    );

    const result = await sendSubscriptionRemindersWithDb(db as never, now, db as never);
    expect(result.sent).toBe(0);
  });

  it("SN idempotency: second call same day sends 0 reminders", async () => {
    const db = await createTestDb();
    await seedReminderBase(db);

    const now = new Date("2025-01-10T12:00:00Z");
    const nextCharge = new Date("2025-01-12T12:00:00Z");

    await db.insert(schema.subscriptions).values({
      id: "sub-idem-1",
      userId: "r-user-1",
      productId: "r-prod-1",
      variantId: "r-var-1",
      frequencyDays: 30,
      discountPercent: 10,
      status: "active",
      nextChargeAt: nextCharge,
      createdAt: now,
      updatedAt: now,
    });

    const { sendSubscriptionRemindersWithDb } = await import(
      "@/app/actions/admin/subscriptions"
    );

    const first = await sendSubscriptionRemindersWithDb(db as never, now, db as never);
    expect(first.sent).toBe(1);

    const second = await sendSubscriptionRemindersWithDb(db as never, now, db as never);
    expect(second.sent).toBe(0);
  });
});
